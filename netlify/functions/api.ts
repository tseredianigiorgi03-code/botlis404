// Netlify Serverless Function for Georgian Love Bottle Game API
import { INITIAL_GEORGIAN_QUESTIONS } from '../../src/data/defaultQuestions';

interface Player {
  id: string;
  name: string;
  avatar: string;
  status: string;
  bio?: string;
  isHost?: boolean;
  isBot?: boolean;
  lastSeen?: number;
}

interface Room {
  id: string;
  name: string;
  players: Player[];
  currentTurnIndex: number;
  bottleAngle: number;
  isSpinning: boolean;
  spinnerPlayerId: string | null;
  targetPlayerId: string | null;
  currentQuestion: { id: string; category: string; text: string } | null;
  questions: Array<{ id: string; category: string; text: string; isCustom?: boolean }>;
  chatMessages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    timestamp: number;
    type?: string;
  }>;
  lastActivity: number;
}

// In-memory global store for serverless instance lifetime
declare global {
  // eslint-disable-next-line no-var
  var __NETLIFY_LOVE_ROOMS__: Map<string, Room> | undefined;
}

const rooms: Map<string, Room> = global.__NETLIFY_LOVE_ROOMS__ || new Map();
global.__NETLIFY_LOVE_ROOMS__ = rooms;

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

function getOrCreateRoom(rawId: string, roomName?: string): Room {
  const roomId = normalizeRoomId(rawId);
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      name: roomName || `სიყვარულის მაგიდა #${roomId}`,
      players: [],
      currentTurnIndex: 0,
      bottleAngle: 0,
      isSpinning: false,
      spinnerPlayerId: null,
      targetPlayerId: null,
      currentQuestion: null,
      questions: JSON.parse(JSON.stringify(INITIAL_GEORGIAN_QUESTIONS)),
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'სიყვარულის ბოთლი',
          senderAvatar: '',
          text: `მოგესალმებით მაგიდაზე #${roomId}! დაატრიალეთ ბოთლი და ისიამოვნეთ! ✨`,
          timestamp: Date.now(),
          type: 'system',
        },
      ],
      lastActivity: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

export const handler = async (event: {
  httpMethod: string;
  path: string;
  body: string | null;
  queryStringParameters?: Record<string, string>;
}) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Parse path: clean leading /.netlify/functions/api or /api
  let cleanPath = event.path;
  if (cleanPath.startsWith('/.netlify/functions/api')) {
    cleanPath = cleanPath.replace('/.netlify/functions/api', '');
  } else if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.replace('/api', '');
  }

  const parts = cleanPath.split('/').filter(Boolean);
  const resource = parts[0]; // e.g. 'rooms'
  const roomIdRaw = parts[1];
  const subAction = parts[2];

  let bodyData: any = {};
  if (event.body) {
    try {
      bodyData = JSON.parse(event.body);
    } catch {
      // ignore
    }
  }

  // 1. GET /api/rooms
  if (resource === 'rooms' && !roomIdRaw && event.httpMethod === 'GET') {
    const list = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      playersCount: r.players.length,
      lastActivity: r.lastActivity,
    }));
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(list) };
  }

  // 2. GET /api/rooms/:roomId
  if (resource === 'rooms' && roomIdRaw && !subAction && event.httpMethod === 'GET') {
    const room = getOrCreateRoom(roomIdRaw);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ room }) };
  }

  // 3. POST /api/rooms/:roomId/join
  if (resource === 'rooms' && roomIdRaw && subAction === 'join' && event.httpMethod === 'POST') {
    const room = getOrCreateRoom(roomIdRaw, bodyData.roomName);
    const pData = bodyData.player;
    if (pData && pData.id) {
      const newPlayer: Player = {
        id: pData.id,
        name: pData.name || 'ანონიმური',
        avatar: pData.avatar || '',
        status: pData.status || 'თავისუფალი 💖',
        bio: pData.bio || '',
        isHost: room.players.length === 0,
        isBot: false,
        lastSeen: Date.now(),
      };
      const existingIdx = room.players.findIndex((p) => p.id === newPlayer.id);
      if (existingIdx >= 0) {
        room.players[existingIdx] = { ...room.players[existingIdx], ...newPlayer };
      } else {
        room.players.push(newPlayer);
        room.chatMessages.push({
          id: `sys-${Date.now()}`,
          senderId: 'system',
          senderName: 'სისტემა',
          senderAvatar: '',
          text: `✨ ${newPlayer.name} შემოუერთდა მაგიდას!`,
          timestamp: Date.now(),
          type: 'system',
        });
      }
      room.lastActivity = Date.now();
    }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, room }) };
  }

  // 4. POST /api/rooms/:roomId/spin
  if (resource === 'rooms' && roomIdRaw && subAction === 'spin' && event.httpMethod === 'POST') {
    const room = getOrCreateRoom(roomIdRaw);
    if (room.players.length >= 2 && !room.isSpinning) {
      const spinner = room.players[room.currentTurnIndex] || room.players[0];
      const otherPlayers = room.players.filter((p) => p.id !== spinner.id);
      const chosenTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

      const targetIndex = room.players.findIndex((p) => p.id === chosenTarget.id);
      const totalPlayers = room.players.length;
      const angleStep = 360 / totalPlayers;
      const targetBaseAngle = (targetIndex * angleStep) % 360;

      const fullSpins = 4 + Math.floor(Math.random() * 3);
      const randomOffset = (Math.random() - 0.5) * Math.min(18, angleStep * 0.35);
      const finalAngle = fullSpins * 360 + targetBaseAngle + randomOffset;

      const pickQuestion = room.questions[Math.floor(Math.random() * room.questions.length)];

      room.isSpinning = false; // instantaneous sync in serverless
      room.bottleAngle = finalAngle;
      room.spinnerPlayerId = spinner.id;
      room.targetPlayerId = chosenTarget.id;
      room.currentQuestion = pickQuestion;
      room.lastActivity = Date.now();
    }
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, room }) };
  }

  // 5. POST /api/rooms/:roomId/action
  if (resource === 'rooms' && roomIdRaw && subAction === 'action' && event.httpMethod === 'POST') {
    const room = getOrCreateRoom(roomIdRaw);
    const action = bodyData.action;

    if (action === 'next_turn') {
      room.currentTurnIndex = (room.currentTurnIndex + 1) % Math.max(1, room.players.length);
      room.targetPlayerId = null;
      room.currentQuestion = null;
      room.isSpinning = false;
    } else if (action === 'reroll_question') {
      const pool = bodyData.category ? room.questions.filter((q) => q.category === bodyData.category) : room.questions;
      if (pool.length > 0) {
        room.currentQuestion = pool[Math.floor(Math.random() * pool.length)];
      }
    } else if (action === 'add_bot') {
      const bot = bodyData.bot;
      if (bot) {
        room.players.push({
          id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: bot.name,
          avatar: bot.avatar,
          status: bot.status,
          bio: bot.bio,
          isBot: true,
          lastSeen: Date.now(),
        });
      }
    } else if (action === 'remove_player') {
      const pId = bodyData.playerId;
      room.players = room.players.filter((p) => p.id !== pId);
    }
    room.lastActivity = Date.now();
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, room }) };
  }

  // 6. POST /api/rooms/:roomId/chat
  if (resource === 'rooms' && roomIdRaw && subAction === 'chat' && event.httpMethod === 'POST') {
    const room = getOrCreateRoom(roomIdRaw);
    const msg = {
      id: `msg-${Date.now()}-${Math.random()}`,
      senderId: bodyData.senderId || 'anon',
      senderName: bodyData.senderName || 'სტუმარი',
      senderAvatar: bodyData.senderAvatar || '',
      text: bodyData.text || '',
      timestamp: Date.now(),
      type: bodyData.type || 'text',
    };
    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) {
      room.chatMessages = room.chatMessages.slice(-100);
    }
    room.lastActivity = Date.now();
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, message: msg, room }) };
  }

  return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Endpoint not found' }) };
};
