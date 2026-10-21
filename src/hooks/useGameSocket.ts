import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, RoomState, QuestionCategory, ChatMessage, ReactionEvent } from '../types';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Peer, DataConnection } from 'peerjs';
import { INITIAL_GEORGIAN_QUESTIONS } from '../data/defaultQuestions';

interface UseGameSocketProps {
  player: Player;
  roomId: string;
  roomName?: string;
  onSpinStarted?: (angle: number, durationMs: number) => void;
  onSpinEnded?: (targetPlayer: Player) => void;
}

function normalizeRoomId(rawId: string | undefined | null): string {
  if (!rawId) return 'LOVE';
  let decoded = String(rawId);
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // fallback
  }
  const clean = decoded.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-_ა-ჰ]/gi, '');
  return clean || 'LOVE';
}

function createDefaultRoom(roomId: string, localPlayer: Player, roomName?: string): RoomState {
  return {
    id: roomId,
    name: roomName || `სიყვარულის მაგიდა #${roomId}`,
    players: [localPlayer],
    currentTurnIndex: 0,
    bottleAngle: 0,
    isSpinning: false,
    spinnerPlayerId: null,
    targetPlayerId: null,
    currentQuestion: null,
    questions: INITIAL_GEORGIAN_QUESTIONS,
    chatMessages: [
      {
        id: `welcome-${roomId}`,
        senderId: 'system',
        senderName: 'სიყვარულის ბოთლი',
        senderAvatar: '',
        text: `მოგესალმებით მაგიდაზე #${roomId}! 🥂 დაატრიალეთ ბოთლი ან მოიწვიეთ მეგობრები! ✨`,
        timestamp: Date.now(),
        type: 'system',
      },
    ],
    lastActivity: Date.now(),
  };
}

export function useGameSocket({
  player,
  roomId: rawRoomId,
  roomName,
  onSpinStarted,
  onSpinEnded,
}: UseGameSocketProps) {
  const roomId = normalizeRoomId(rawRoomId);
  const [room, setRoom] = useState<RoomState>(() => createDefaultRoom(roomId, player, roomName));
  const [isConnected, setIsConnected] = useState(true);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateHashRef = useRef<string>('');
  
  // Cross-Tab BroadcastChannel
  const bcRef = useRef<BroadcastChannel | null>(null);

  // WebRTC PeerJS References
  const peerRef = useRef<Peer | null>(null);
  const peerConnectionsRef = useRef<Map<string, DataConnection>>(new Map());

  // Broadcast data over WebRTC and BroadcastChannel
  const broadcastAll = useCallback((payload: object) => {
    const dataStr = JSON.stringify(payload);
    // 1. BroadcastChannel (same browser tabs)
    try {
      if (bcRef.current) {
        bcRef.current.postMessage(payload);
      }
    } catch {
      // ignore
    }
    // 2. WebRTC Peer Data Channels (different devices/browsers)
    for (const conn of peerConnectionsRef.current.values()) {
      if (conn.open) {
        try {
          conn.send(dataStr);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Handle incoming game events (shared by WS, WebRTC, and BroadcastChannel)
  const handleGameEvent = useCallback((data: {
    type: string;
    room?: RoomState;
    newAngle?: number;
    durationMs?: number;
    message?: ChatMessage;
    reaction?: ReactionEvent;
  }) => {
    if (data.type === 'room_state' && data.room) {
      setRoom(data.room);
    } else if (data.type === 'spin_started' && data.room) {
      setRoom(data.room);
      soundEffects.playSpinSound();
      if (onSpinStarted && data.newAngle) {
        onSpinStarted(data.newAngle, data.durationMs || 3500);
      }
    } else if (data.type === 'spin_ended' && data.room) {
      setRoom(data.room);
      soundEffects.playStopChime();
      const target = data.room.players.find((p: Player) => p.id === data.room?.targetPlayerId);
      if (target && onSpinEnded) {
        onSpinEnded(target);
      }
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fb7185', '#ec4899', '#fda4af', '#fcd34d'],
      });
    } else if (data.type === 'chat_broadcast' && data.message) {
      const msg = data.message;
      setRoom((prev) => {
        if (!prev) return prev;
        if (prev.chatMessages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, msg],
        };
      });
      if (msg.senderId !== player.id) {
        soundEffects.playMessageSound();
      }
    } else if (data.type === 'reaction_received' && data.reaction) {
      const reaction = data.reaction;
      setActiveReactions((prev) => [...prev.slice(-15), reaction]);
      soundEffects.playHeartSound();
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    }
  }, [player.id, onSpinStarted, onSpinEnded]);

  // REST API Polling Sync
  const syncViaRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.room) {
          const newRoom: RoomState = data.room;
          const currentHash = JSON.stringify({
            p: newRoom.players.map((p) => ({ id: p.id, n: p.name, a: p.avatar, s: p.status })),
            a: newRoom.bottleAngle,
            sp: newRoom.isSpinning,
            c: newRoom.chatMessages.length,
            turn: newRoom.currentTurnIndex,
            target: newRoom.targetPlayerId,
            q: newRoom.currentQuestion?.id,
          });

          if (currentHash !== lastStateHashRef.current) {
            lastStateHashRef.current = currentHash;
            setRoom(newRoom);
          }
          setIsConnected(true);
        }
      }
    } catch {
      // offline fallback
    }
  }, [roomId]);

  // Join Room via REST
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

  // Connect WebSocket
  const connectWs = useCallback(() => {
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
          handleGameEvent(data);
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        syncViaRest();
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWs();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      syncViaRest();
    }
  }, [roomId, roomName, player, handleGameEvent, syncViaRest]);

  // Setup BroadcastChannel for 0-latency sync across tabs on Netlify
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(`geolove_room_${roomId}`);
        bcRef.current = bc;
        bc.onmessage = (ev) => {
          if (ev.data) {
            handleGameEvent(ev.data);
          }
        };
      }
    } catch {
      // BroadcastChannel unsupported
    }
    return () => {
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, [roomId, handleGameEvent]);

  // Setup PeerJS WebRTC P2P direct data channel
  useEffect(() => {
    const cleanRoomKey = roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const myPeerId = `geolove-${cleanRoomKey}-${player.id.replace(/[^a-z0-9]/gi, '')}`;
    const hostPeerId = `geolove-${cleanRoomKey}-host`;

    let peer: Peer | null = null;
    try {
      peer = new Peer(myPeerId, {
        debug: 0,
      });
      peerRef.current = peer;

      peer.on('open', () => {
        setIsConnected(true);
        if (myPeerId !== hostPeerId) {
          const conn = peer!.connect(hostPeerId);
          conn.on('open', () => {
            peerConnectionsRef.current.set(hostPeerId, conn);
            conn.send(JSON.stringify({ type: 'peer_join', player }));
          });
          conn.on('data', (d) => {
            try {
              const data = JSON.parse(d as string);
              handleGameEvent(data);
            } catch {
              // ignore
            }
          });
        }
      });

      peer.on('connection', (conn) => {
        conn.on('open', () => {
          peerConnectionsRef.current.set(conn.peer, conn);
        });
        conn.on('data', (d) => {
          try {
            const data = JSON.parse(d as string);
            handleGameEvent(data);
            broadcastAll(data);
          } catch {
            // ignore
          }
        });
        conn.on('close', () => {
          peerConnectionsRef.current.delete(conn.peer);
        });
      });

      peer.on('error', () => {
        // Fallback gracefully
      });
    } catch {
      // WebRTC error
    }

    return () => {
      if (peer) {
        peer.destroy();
      }
      peerConnectionsRef.current.clear();
    };
  }, [roomId, player, handleGameEvent, broadcastAll]);

  // Mount effect
  useEffect(() => {
    joinViaRest();
    connectWs();

    // Fast polling fallback: 1.5s ensures instant response on Netlify serverless
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
  }, [connectWs, joinViaRest, syncViaRest]);

  // Update profile
  const updateProfile = useCallback((updatedPlayer: Player) => {
    setRoom((prev) => {
      const idx = prev.players.findIndex((p) => p.id === updatedPlayer.id);
      if (idx >= 0) {
        const nextPlayers = [...prev.players];
        nextPlayers[idx] = updatedPlayer;
        return { ...prev, players: nextPlayers };
      }
      return prev;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update_profile',
        roomId,
        playerId: player.id,
        player: updatedPlayer,
      }));
    }
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
      // Local/Serverless optimistic spin
      setRoom((prev) => {
        if (prev.players.length < 2 || prev.isSpinning) return prev;
        const spinner = prev.players[prev.currentTurnIndex] || prev.players[0];
        const otherPlayers = prev.players.filter((p) => p.id !== spinner.id);
        const chosenTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

        const targetIndex = prev.players.findIndex((p) => p.id === chosenTarget.id);
        const totalPlayers = prev.players.length;
        const angleStep = 360 / totalPlayers;
        const targetBaseAngle = (targetIndex * angleStep) % 360;

        const fullSpins = 4 + Math.floor(Math.random() * 3);
        const randomOffset = (Math.random() - 0.5) * Math.min(18, angleStep * 0.35);
        const finalAngle = fullSpins * 360 + targetBaseAngle + randomOffset;

        const pickQuestion = prev.questions[Math.floor(Math.random() * prev.questions.length)];

        const spinningState: RoomState = {
          ...prev,
          isSpinning: true,
          bottleAngle: finalAngle,
          spinnerPlayerId: spinner.id,
          targetPlayerId: null,
          currentQuestion: null,
        };

        broadcastAll({ type: 'spin_started', room: spinningState, newAngle: finalAngle, durationMs: 3500 });

        setTimeout(() => {
          setRoom((current) => {
            const endedState: RoomState = {
              ...current,
              isSpinning: false,
              targetPlayerId: chosenTarget.id,
              currentQuestion: pickQuestion,
            };
            broadcastAll({ type: 'spin_ended', room: endedState });
            soundEffects.playStopChime();
            if (onSpinEnded) onSpinEnded(chosenTarget);
            return endedState;
          });
        }, 3500);

        return spinningState;
      });

      fetch(`/api/rooms/${encodeURIComponent(roomId)}/spin`, {
        method: 'POST',
      }).catch(() => {});
    }
  }, [roomId, player.id, broadcastAll, onSpinEnded]);

  // Next turn
  const nextTurn = useCallback(() => {
    setRoom((prev) => {
      const nextTurnIndex = (prev.currentTurnIndex + 1) % Math.max(1, prev.players.length);
      const nextRoom: RoomState = {
        ...prev,
        currentTurnIndex: nextTurnIndex,
        targetPlayerId: null,
        currentQuestion: null,
        isSpinning: false,
      };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

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
      }).catch(() => {});
    }
  }, [roomId, broadcastAll]);

  // Reroll question
  const rerollQuestion = useCallback((category?: QuestionCategory) => {
    setRoom((prev) => {
      const pool = category ? prev.questions.filter((q) => q.category === category) : prev.questions;
      if (pool.length === 0) return prev;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      const nextRoom = { ...prev, currentQuestion: pick };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

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
        body: JSON.stringify({ action: 'reroll_question', category }),
      }).catch(() => {});
    }
  }, [roomId, broadcastAll]);

  // Add question
  const addQuestion = useCallback((text: string, category: QuestionCategory) => {
    const newQ = { id: `q-custom-${Date.now()}`, category, text, isCustom: true };
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: [newQ, ...prev.questions] };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_question',
        roomId,
        question: { text, category },
      }));
    }
  }, [roomId, broadcastAll]);

  // Delete question
  const deleteQuestion = useCallback((questionId: string) => {
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_question',
        roomId,
        questionId,
      }));
    }
  }, [roomId, broadcastAll]);

  // Reset questions
  const resetQuestions = useCallback(() => {
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: INITIAL_GEORGIAN_QUESTIONS };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reset_questions',
        roomId,
      }));
    }
  }, [roomId, broadcastAll]);

  // Send message
  const sendMessage = useCallback((text: string, type: 'chat' | 'confession' = 'chat') => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: player.id,
      senderName: player.name,
      senderAvatar: player.avatar,
      text,
      timestamp: Date.now(),
      type,
    };

    setRoom((prev) => {
      const nextMessages = [...prev.chatMessages, msg];
      const nextRoom = { ...prev, chatMessages: nextMessages.slice(-100) };
      broadcastAll({ type: 'chat_broadcast', message: msg, room: nextRoom });
      return nextRoom;
    });

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
        body: JSON.stringify(msg),
      }).catch(() => {});
    }
  }, [roomId, player, broadcastAll]);

  // Send reaction
  const sendReaction = useCallback((emoji: string, toPlayerId?: string) => {
    const reaction: ReactionEvent = {
      id: `react-${Date.now()}-${Math.random()}`,
      emoji,
      fromPlayerId: player.id,
      toPlayerId,
      timestamp: Date.now(),
    };

    setActiveReactions((prev) => [...prev.slice(-15), reaction]);
    soundEffects.playHeartSound();
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 3500);

    broadcastAll({ type: 'reaction_received', reaction });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_reaction',
        roomId,
        emoji,
        fromPlayerId: player.id,
        toPlayerId,
      }));
    }
  }, [roomId, player.id, broadcastAll]);

  // Add bot companion
  const addBot = useCallback((botCandidate: { name: string; avatar: string; status: string; bio: string }) => {
    const newBotPlayer: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: botCandidate.name,
      avatar: botCandidate.avatar,
      status: botCandidate.status,
      bio: botCandidate.bio,
      isBot: true,
      lastSeen: Date.now(),
    };

    setRoom((prev) => {
      const nextPlayers = [...prev.players, newBotPlayer];
      const nextRoom = { ...prev, players: nextPlayers };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

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
        body: JSON.stringify({ action: 'add_bot', bot: botCandidate }),
      }).catch(() => {});
    }
  }, [roomId, broadcastAll]);

  // Remove player / bot
  const removePlayer = useCallback((targetPlayerId: string) => {
    setRoom((prev) => {
      const nextPlayers = prev.players.filter((p) => p.id !== targetPlayerId);
      const nextRoom = { ...prev, players: nextPlayers };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });

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
        body: JSON.stringify({ action: 'remove_player', playerId: targetPlayerId }),
      }).catch(() => {});
    }
  }, [roomId, broadcastAll]);

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
