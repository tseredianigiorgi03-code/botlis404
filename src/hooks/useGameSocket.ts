import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, RoomState, QuestionCategory, ChatMessage, ReactionEvent } from '../types';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';
import { INITIAL_GEORGIAN_QUESTIONS } from '../data/defaultQuestions';
import { createRoomMqttClient, RoomMqttHandle } from '../utils/mqttClient';

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

  // Initialize room with local player immediately
  const [room, setRoom] = useState<RoomState>(() => {
    try {
      const cached = localStorage.getItem(`geolove_room_${roomId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.players)) {
          const hasMe = parsed.players.some((p: Player) => p.id === player.id);
          if (!hasMe) {
            parsed.players = [player, ...parsed.players];
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return createDefaultRoom(roomId, player, roomName);
  });

  const [isConnected, setIsConnected] = useState(true);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);

  // Connection references
  const wsRef = useRef<WebSocket | null>(null);
  const mqttHandleRef = useRef<RoomMqttHandle | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const roomStateRef = useRef<RoomState>(room);

  // Keep roomStateRef up to date
  useEffect(() => {
    roomStateRef.current = room;
    try {
      localStorage.setItem(`geolove_room_${roomId}`, JSON.stringify(room));
    } catch {
      // ignore
    }
  }, [room, roomId]);

  // Master Broadcast: pushes data across all real-time channels
  const broadcastAll = useCallback((payload: object) => {
    // 1. MQTT Cloud Relay (Works worldwide on Netlify, mobile, any browser)
    try {
      if (mqttHandleRef.current) {
        mqttHandleRef.current.publish('events', payload);
      }
    } catch {
      // ignore
    }

    // 2. BroadcastChannel (Same browser tabs sync with 0ms latency)
    try {
      if (bcRef.current) {
        bcRef.current.postMessage(payload);
      }
    } catch {
      // ignore
    }

    // 3. Local WebSocket (when running with server.ts)
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle incoming game events from any network layer
  const handleGameEvent = useCallback((data: {
    type: string;
    room?: RoomState;
    newAngle?: number;
    durationMs?: number;
    message?: ChatMessage;
    reaction?: ReactionEvent;
    player?: Player;
    spinnerId?: string;
  }) => {
    if (!data || !data.type) return;

    // A new player announces they joined the room
    if (data.type === 'player_join_request' && data.player) {
      const incoming = data.player;
      setRoom((prev) => {
        const exists = prev.players.some((p) => p.id === incoming.id);
        const updatedPlayers = exists
          ? prev.players.map((p) => (p.id === incoming.id ? { ...p, ...incoming, lastSeen: Date.now() } : p))
          : [...prev.players, { ...incoming, lastSeen: Date.now() }];

        const updatedRoom = {
          ...prev,
          players: updatedPlayers,
        };

        // If I was already in the room, send back full state sync so the newcomer gets our state
        if (incoming.id !== player.id) {
          setTimeout(() => {
            try {
              mqttHandleRef.current?.publish('sync', {
                type: 'room_state_sync',
                room: updatedRoom,
              });
            } catch {
              // ignore
            }
          }, 150);
        }

        return updatedRoom;
      });
      return;
    }

    // Full Room State Sync (from host or peer)
    if ((data.type === 'room_state' || data.type === 'room_state_sync') && data.room) {
      const synced = data.room;
      setRoom((prev) => {
        // Ensure my own player profile isn't erased
        const hasMe = synced.players.some((p) => p.id === player.id);
        const mergedPlayers = hasMe ? synced.players : [player, ...synced.players];
        return {
          ...synced,
          players: mergedPlayers,
        };
      });
      return;
    }

    // Spin Started
    if (data.type === 'spin_started' && data.room) {
      setRoom(data.room);
      soundEffects.playSpinSound();
      if (onSpinStarted && typeof data.newAngle === 'number') {
        onSpinStarted(data.newAngle, data.durationMs || 3500);
      }
      return;
    }

    // Spin Ended
    if (data.type === 'spin_ended' && data.room) {
      setRoom(data.room);
      soundEffects.playStopChime();
      const target = data.room.players.find((p) => p.id === data.room?.targetPlayerId);
      if (target && onSpinEnded) {
        onSpinEnded(target);
      }
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fb7185', '#ec4899', '#fda4af', '#fcd34d'],
      });
      return;
    }

    // Chat Message
    if (data.type === 'chat_broadcast' && data.message) {
      const msg = data.message;
      setRoom((prev) => {
        if (prev.chatMessages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, msg],
        };
      });
      if (msg.senderId !== player.id) {
        soundEffects.playMessageSound();
      }
      return;
    }

    // Heart Reaction
    if (data.type === 'reaction_received' && data.reaction) {
      const reaction = data.reaction;
      setActiveReactions((prev) => [...prev.slice(-15), reaction]);
      soundEffects.playHeartSound();
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
      return;
    }

    // Player Left or Presence Ping
    if (data.type === 'presence' && data.player) {
      setRoom((prev) => {
        const pList = prev.players.map((p) =>
          p.id === data.player?.id ? { ...p, lastSeen: Date.now() } : p
        );
        return { ...prev, players: pList };
      });
    }
  }, [player, onSpinStarted, onSpinEnded]);

  // Setup MQTT Cloud Real-Time Connection
  useEffect(() => {
    const mqttHandle = createRoomMqttClient(
      roomId,
      player.id,
      (msg) => {
        handleGameEvent(msg);
      },
      (connected) => {
        setIsConnected(connected);
      }
    );

    mqttHandleRef.current = mqttHandle;

    // Broadcast our join request over MQTT to find any room peers
    const timer = setTimeout(() => {
      mqttHandle.publish('join', {
        type: 'player_join_request',
        player,
        timestamp: Date.now(),
      });
    }, 400);

    // Heartbeat every 10s to keep connection and peer list alive
    const pingInterval = setInterval(() => {
      mqttHandle.publish('ping', {
        type: 'presence',
        player,
      });
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(pingInterval);
      mqttHandle.destroy();
      mqttHandleRef.current = null;
    };
  }, [roomId, player, handleGameEvent]);

  // Setup BroadcastChannel for 0-latency same-browser sync
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
      // unsupported
    }
    return () => {
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, [roomId, handleGameEvent]);

  // Setup optional local server WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      // Only connect to /ws if not running on external static CDN or file:
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      if (host && !host.includes('netlify') && !host.includes('vercel') && !host.includes('github.io')) {
        ws = new WebSocket(`${protocol}//${host}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          ws?.send(JSON.stringify({
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

        ws.onerror = () => {
          // Fallback seamlessly to MQTT
        };
      }
    } catch {
      // ignore
    }

    return () => {
      if (ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [roomId, roomName, player, handleGameEvent]);

  // Spin bottle action
  const spinBottle = useCallback(() => {
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

      // Broadcast spin start across all connected devices
      broadcastAll({
        type: 'spin_started',
        room: spinningState,
        newAngle: finalAngle,
        durationMs: 3500,
        spinnerId: spinner.id,
      });

      // After 3.5 seconds, finalize the spin and broadcast completion
      setTimeout(() => {
        setRoom((current) => {
          const endedState: RoomState = {
            ...current,
            isSpinning: false,
            targetPlayerId: chosenTarget.id,
            currentQuestion: pickQuestion,
          };
          broadcastAll({
            type: 'spin_ended',
            room: endedState,
          });
          soundEffects.playStopChime();
          if (onSpinEnded) onSpinEnded(chosenTarget);
          return endedState;
        });
      }, 3500);

      return spinningState;
    });
  }, [broadcastAll, onSpinEnded]);

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
  }, [broadcastAll]);

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
  }, [broadcastAll]);

  // Add question
  const addQuestion = useCallback((text: string, category: QuestionCategory) => {
    const newQ = { id: `q-custom-${Date.now()}`, category, text, isCustom: true };
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: [newQ, ...prev.questions] };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });
  }, [broadcastAll]);

  // Delete question
  const deleteQuestion = useCallback((questionId: string) => {
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: prev.questions.filter((q) => q.id !== questionId) };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });
  }, [broadcastAll]);

  // Reset questions
  const resetQuestions = useCallback(() => {
    setRoom((prev) => {
      const nextRoom = { ...prev, questions: INITIAL_GEORGIAN_QUESTIONS };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });
  }, [broadcastAll]);

  // Send chat message
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
  }, [player, broadcastAll]);

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
  }, [player.id, broadcastAll]);

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
  }, [broadcastAll]);

  // Remove player / bot
  const removePlayer = useCallback((targetPlayerId: string) => {
    setRoom((prev) => {
      const nextPlayers = prev.players.filter((p) => p.id !== targetPlayerId);
      const nextRoom = { ...prev, players: nextPlayers };
      broadcastAll({ type: 'room_state', room: nextRoom });
      return nextRoom;
    });
  }, [broadcastAll]);

  // Update profile
  const updateProfile = useCallback((updatedPlayer: Player) => {
    setRoom((prev) => {
      const idx = prev.players.findIndex((p) => p.id === updatedPlayer.id);
      let nextPlayers = [...prev.players];
      if (idx >= 0) {
        nextPlayers[idx] = updatedPlayer;
      } else {
        nextPlayers = [updatedPlayer, ...nextPlayers];
      }
      const nextRoom = { ...prev, players: nextPlayers };
      broadcastAll({ type: 'player_join_request', player: updatedPlayer, room: nextRoom });
      return nextRoom;
    });
  }, [broadcastAll]);

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
    refetchRoom: () => {},
  };
}
