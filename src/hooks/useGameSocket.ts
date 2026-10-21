import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, RoomState, QuestionCategory, ChatMessage, ReactionEvent } from '../types';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';

interface UseGameSocketProps {
  player: Player;
  roomId: string;
  roomName?: string;
  onSpinStarted?: (angle: number, durationMs: number) => void;
  onSpinEnded?: (targetPlayer: Player) => void;
}

function normalizeRoomId(rawId: string | undefined | null): string {
  if (!rawId) return 'LOVE-77';
  let decoded = String(rawId);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // fallback
  }
  const clean = decoded.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-_ა-ჰ]/gi, '');
  return clean || 'LOVE-77';
}

export function useGameSocket({
  player,
  roomId: rawRoomId,
  roomName,
  onSpinStarted,
  onSpinEnded,
}: UseGameSocketProps) {
  const roomId = normalizeRoomId(rawRoomId);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateHashRef = useRef<string>('');

  // Dual Fallback: REST Polling to guarantee multiplayer sync across any proxy/network
  const syncViaRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.room) {
          const newRoom: RoomState = data.room;
          const currentHash = `${newRoom.players.length}-${newRoom.bottleAngle}-${newRoom.isSpinning}-${newRoom.chatMessages.length}-${newRoom.currentTurnIndex}-${newRoom.targetPlayerId}`;
          if (currentHash !== lastStateHashRef.current) {
            lastStateHashRef.current = currentHash;
            setRoom(newRoom);
          }
          setIsConnected(true);
        }
      }
    } catch {
      // offline
    }
  }, [roomId]);

  // Join via REST fallback if needed
  const joinViaRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, roomName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) {
          setRoom(data.room);
          setIsConnected(true);
        }
      }
    } catch {
      // ignore
    }
  }, [roomId, player, roomName]);

  const connect = useCallback(() => {
    // Join via REST immediately so user is visible right away
    joinViaRest();

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'join_room',
          roomId,
          roomName,
          player,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'room_state') {
            setRoom(data.room);
          } else if (data.type === 'spin_started') {
            setRoom(data.room);
            soundEffects.playSpinSound();
            if (onSpinStarted) {
              onSpinStarted(data.newAngle, data.durationMs);
            }
          } else if (data.type === 'spin_ended') {
            setRoom(data.room);
            soundEffects.playStopChime();
            const target = data.room.players.find((p: Player) => p.id === data.room.targetPlayerId);
            if (target && onSpinEnded) {
              onSpinEnded(target);
            }
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#f43f5e', '#fb7185', '#ec4899', '#fda4af', '#fcd34d'],
            });
          } else if (data.type === 'chat_broadcast') {
            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                chatMessages: [...prev.chatMessages, data.message],
              };
            });
            if (data.message.senderId !== player.id) {
              soundEffects.playMessageSound();
            }
          } else if (data.type === 'reaction_received') {
            const reaction = data.reaction;
            setActiveReactions((prev) => [...prev.slice(-15), reaction]);
            soundEffects.playHeartSound();
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
            }, 3500);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        // Fall back to polling immediately
        syncViaRest();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WS error, REST fallback takes over
      syncViaRest();
    }
  }, [roomId, roomName, player, onSpinStarted, onSpinEnded, joinViaRest, syncViaRest]);

  useEffect(() => {
    setRoom(null);
    connect();

    // Active polling interval every 1.5s to guarantee 100% real-time sync across devices
    pollIntervalRef.current = setInterval(() => {
      syncViaRest();
    }, 1500);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, syncViaRest]);

  // Update profile
  const updateProfile = useCallback((updatedPlayer: Player) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_profile',
        roomId,
        playerId: player.id,
        player: updatedPlayer,
      }));
    }
    // Also post via REST
    fetch(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: updatedPlayer }),
    }).catch(() => {});
  }, [roomId, player.id]);

  // Spin bottle
  const spinBottle = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'spin_bottle',
        roomId,
        playerId: player.id,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/spin`, {
        method: 'POST',
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, player.id, syncViaRest]);

  // Next turn
  const nextTurn = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'next_turn',
        roomId,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next_turn' }),
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, syncViaRest]);

  // Reroll question
  const rerollQuestion = useCallback((category?: QuestionCategory) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reroll_question',
        roomId,
        category,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reroll' }),
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, syncViaRest]);

  // Add question
  const addQuestion = useCallback((text: string, category: QuestionCategory) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_question',
        roomId,
        question: { text, category },
      }));
    }
  }, [roomId]);

  // Delete question
  const deleteQuestion = useCallback((questionId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_question',
        roomId,
        questionId,
      }));
    }
  }, [roomId]);

  // Reset questions
  const resetQuestions = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reset_questions',
        roomId,
      }));
    }
  }, [roomId]);

  // Send message
  const sendMessage = useCallback((text: string, type: 'chat' | 'confession' = 'chat') => {
    const msg = {
      senderId: player.id,
      senderName: player.name,
      senderAvatar: player.avatar,
      text,
      type,
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        roomId,
        message: msg,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, player, syncViaRest]);

  // Send reaction
  const sendReaction = useCallback((emoji: string, toPlayerId?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_reaction',
        roomId,
        emoji,
        fromPlayerId: player.id,
        toPlayerId,
      }));
    }
  }, [roomId, player.id]);

  // Add bot companion
  const addBot = useCallback((botCandidate: { name: string; avatar: string; status: string; bio: string }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_bot',
        roomId,
        bot: botCandidate,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_bot', payload: botCandidate }),
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, syncViaRest]);

  // Remove player / bot
  const removePlayer = useCallback((targetPlayerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'remove_player',
        roomId,
        targetPlayerId,
      }));
    } else {
      fetch(`/api/rooms/${encodeURIComponent(roomId)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_player', payload: { targetPlayerId } }),
      }).then(syncViaRest).catch(() => {});
    }
  }, [roomId, syncViaRest]);

  return {
    room,
    isConnected,
    activeReactions,
    spinBottle,
    nextTurn,
    rerollQuestion,
    addQuestion,
    deleteQuestion,
    resetQuestions,
    sendMessage,
    sendReaction,
    addBot,
    removePlayer,
    updateProfile,
    refetchRoom: syncViaRest,
  };
}
