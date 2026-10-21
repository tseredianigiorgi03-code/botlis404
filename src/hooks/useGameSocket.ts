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

export function useGameSocket({
  player,
  roomId,
  roomName,
  onSpinStarted,
  onSpinEnded,
}: UseGameSocketProps) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeReactions, setActiveReactions] = useState<ReactionEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Join room with player information
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
          // Romantic confetti celebration
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#f43f5e', '#fb7185', '#ec4899', '#fda4af', '#fcd34d'],
            shapes: ['circle', 'square'],
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
        } else if (data.type === 'error') {
          console.warn('Game error:', data.message);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Try to reconnect in 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
      ws.close();
    };
  }, [roomId, roomName, player, onSpinStarted, onSpinEnded]);

  useEffect(() => {
    setRoom(null);
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

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
  }, [roomId, player.id]);

  // Spin bottle
  const spinBottle = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'spin_bottle',
        roomId,
        playerId: player.id,
      }));
    }
  }, [roomId, player.id]);

  // Next turn
  const nextTurn = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'next_turn',
        roomId,
      }));
    }
  }, [roomId]);

  // Reroll question
  const rerollQuestion = useCallback((category?: QuestionCategory) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reroll_question',
        roomId,
        category,
      }));
    }
  }, [roomId]);

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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        roomId,
        message: {
          senderId: player.id,
          senderName: player.name,
          senderAvatar: player.avatar,
          text,
          type,
        },
      }));
    }
  }, [roomId, player]);

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
    }
  }, [roomId]);

  // Remove player / bot
  const removePlayer = useCallback((targetPlayerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'remove_player',
        roomId,
        targetPlayerId,
      }));
    }
  }, [roomId]);

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
  };
}
