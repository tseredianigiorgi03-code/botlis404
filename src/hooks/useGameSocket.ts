import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, RoomState, QuestionCategory, ChatMessage, ReactionEvent } from '../types';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Peer, DataConnection } from 'peerjs';

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
  
  // WebRTC PeerJS References
  const peerRef = useRef<Peer | null>(null);
  const peerConnectionsRef = useRef<Map<string, DataConnection>>(new Map());

  // Broadcast data over WebRTC peer data channels
  const broadcastWebRTC = useCallback((payload: object) => {
    const dataStr = JSON.stringify(payload);
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

  // REST API Polling Sync
  const syncViaRest = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.room) {
          const newRoom: RoomState = data.room;
          // Comprehensive state hash
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
      // offline
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

  // Handle incoming game events (shared by WS and WebRTC)
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
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onclose = () => {
        syncViaRest();
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWs();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      syncViaRest();
    }
  }, [roomId, roomName, player, handleGameEvent, syncViaRest]);

  // Setup PeerJS WebRTC P2P direct data channel
  useEffect(() => {
    // Generate clean room peer channel
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
        // Connect to host if I am not host
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
            // Relink/broadcast to other connected peers
            broadcastWebRTC(data);
          } catch {
            // ignore
          }
        });
        conn.on('close', () => {
          peerConnectionsRef.current.delete(conn.peer);
        });
      });

      peer.on('error', () => {
        // Fallback gracefully to WebSockets and REST
      });
    } catch {
      // WebRTC not supported, WebSocket + REST will handle it
    }

    return () => {
      if (peer) {
        peer.destroy();
      }
      peerConnectionsRef.current.clear();
    };
  }, [roomId, player, handleGameEvent, broadcastWebRTC]);

  // Mount effect
  useEffect(() => {
    setRoom(null);
    joinViaRest();
    connectWs();

    // Fast polling fallback: 1.2s ensures instant response across any network
    pollIntervalRef.current = setInterval(() => {
      syncViaRest();
    }, 1200);

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
    // Also broadcast directly over WebRTC
    broadcastWebRTC({ type: 'chat_broadcast', message: { ...msg, id: `p2p-${Date.now()}` } });
  }, [roomId, player, syncViaRest, broadcastWebRTC]);

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
    broadcastWebRTC({
      type: 'reaction_received',
      reaction: {
        id: `react-${Date.now()}-${Math.random()}`,
        emoji,
        fromPlayerId: player.id,
        toPlayerId,
        timestamp: Date.now(),
      },
    });
  }, [roomId, player.id, broadcastWebRTC]);

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
