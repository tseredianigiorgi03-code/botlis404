import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '10mb' }));

// Initial questions pool
const DEFAULT_QUESTIONS = [
  { id: 'q-truth-1', category: 'სიმართლე', text: 'ოდესმე გქონია სიყვარული ერთი ნახვით? მოუყევი მაგიდასთან მყოფებს.' },
  { id: 'q-truth-2', category: 'სიმართლე', text: 'ამ ოთახში მყოფთაგან ვისთან წახვიდოდი რომანტიკულ ვახშამზე სანთლების შუქზე?' },
  { id: 'q-truth-3', category: 'სიმართლე', text: 'რა არის ყველაზე გიჟური ან უცნაური საქციელი, რაც სიყვარულის გამო ჩაგიდენია?' },
  { id: 'q-truth-4', category: 'სიმართლე', text: 'შენი პირველი კოცნა: სად და როგორ მოხდა? (გულწრფელად შეაფასე 1-დან 10-მდე)' },
  { id: 'q-truth-5', category: 'სიმართლე', text: 'რა თვისებას აფასებ ყველაზე მეტად საპირისპირო სქესში?' },
  { id: 'q-truth-6', category: 'სიმართლე', text: 'მოგწონებია ოდესმე შენი მეგობრის შეყვარებული ან სიმპატია?' },
  { id: 'q-truth-7', category: 'სიმართლე', text: 'რომელი სიმღერა ასოცირდება შენთვის ნამდვილ სიყვარულთან?' },
  { id: 'q-truth-8', category: 'სიმართლე', text: 'ოდესმე გამოგგზავნია შეტყობინება ემოციების მოზღვავებისას, რასაც მერე ნანობდი?' },
  { id: 'q-dare-1', category: 'მოქმედება', text: 'ჩახედე თვალებში იმ მოთამაშეს, ვისზეც ბოთლი მიუთითებს, და გაუღიმე 15 წამის განმავლობაში სიტყვის უთქმელად.' },
  { id: 'q-dare-2', category: 'მოქმედება', text: 'უთხარი ყველაზე გულწრფელი და თბილი კომპლიმენტი მოთამაშეს, რომელმაც ბოთლი დაატრიალა.' },
  { id: 'q-dare-3', category: 'მოქმედება', text: 'გაუგზავნე ჩატში რომანტიკული ლექსის 2 სტრიქონი ან სასიყვარულო სტიკერი შენს რჩეულს.' },
  { id: 'q-dare-4', category: 'მოქმედება', text: 'ჩართე რომანტიკული მუსიკა ან იმღერე 10 წამი შენი საყვარელი სასიყვარულო სიმღერიდან.' },
  { id: 'q-dare-5', category: 'მოქმედება', text: 'დაპატიჟე ვირტუალურ ყავაზე ან დესერტზე ერთ-ერთი მოთამაშე და ახსენი რატომ ის.' },
  { id: 'q-dare-6', category: 'მოქმედება', text: 'გააკეთე ჰაეროვანი კოცნა და გაუგზავნე ეკრანის გავლით იმას, ვინც ყველაზე მეტად იმსახურებს.' },
  { id: 'q-conf-1', category: 'აღსარება', text: 'გყავს თუ არა ახლა ფარული სიმპატია (Crush), ვისაც ვერ უბედავ გრძნობების გამხელას?' },
  { id: 'q-conf-2', category: 'აღსარება', text: 'რა იყო ყველაზე მტკივნეული ან ყველაზე ტკბილი დაშორება/დაბრუნება შენს ცხოვრებაში?' },
  { id: 'q-conf-3', category: 'აღსარება', text: 'რას გააკეთებდი, თუ გაიგებდი, რომ ამ მაგიდის რომელიმე მოთამაშეს ფარულად უყვარხარ?' },
  { id: 'q-conf-4', category: 'აღსარება', text: 'გჯერა თუ არა ბედისწერის და რომ ყველა ადამიანს ჰყავს თავისი მეორე ნახევარი?' },
  { id: 'q-flirt-1', category: 'ფლირტი', text: 'როგორია შენი საუკეთესო ფლირტის ხაზი (Pick-up line)? წარმოთქვი ისე, თითქოს რეალურად ეფლირტავები.' },
  { id: 'q-flirt-2', category: 'ფლირტი', text: 'რა არის ის დეტალი გარეგნობაში, რაც მყისიერად გიზიდავს ადამიანში?' },
  { id: 'q-flirt-3', category: 'ფლირტი', text: 'რომ შეგეძლოს დაუვიწყარი 24 საათი გაატარო ნებისმიერ ადგილას, სად და ვისთან წახვიდოდი?' },
  { id: 'q-flirt-4', category: 'ფლირტი', text: 'ჩაუკარი თვალი და გაუგზავნე ყველაზე ეშმაკური მზერა არჩეულ მოთამაშეს.' },
  { id: 'q-comp-1', category: 'კომპლიმენტი', text: 'აღწერე არჩეული მოთამაშის ღიმილი 3 ყველაზე ლამაზი ქართული სიტყვით.' },
  { id: 'q-comp-2', category: 'კომპლიმენტი', text: 'უთხარი მაგიდის ყველა წევრს თითო თბილი სიტყვა, რაც მათ ხასიათს ამშვენებს.' },
  { id: 'q-comp-3', category: 'კომპლიმენტი', text: 'თუ ეს ადამიანი იქნებოდა ყვავილი, რომელი ყვავილი იქნებოდა და რატომ?' }
];

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

const rooms: Map<string, Room> = new Map();
const socketRooms: Map<WebSocket, { roomId: string; playerId: string }> = new Map();

export function normalizeRoomId(rawId: string | undefined | null): string {
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
      questions: JSON.parse(JSON.stringify(DEFAULT_QUESTIONS)),
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: 'სიყვარულის ბოთლი 💖',
          senderAvatar: '',
          text: `მოგესალმებით ოთახში #${roomId}! დაატრიალეთ ბოთლი და გაერთეთ ერთად.`,
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

function broadcastToRoom(rawId: string, data: object) {
  const roomId = normalizeRoomId(rawId);
  const payload = JSON.stringify(data);
  for (const [ws, info] of socketRooms.entries()) {
    if (info.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {
        // ignore send error
      }
    }
  }
}

function triggerSpin(room: Room) {
  if (room.players.length < 2 || room.isSpinning) return null;

  const spinner = room.players[room.currentTurnIndex] || room.players[0];
  const otherPlayers = room.players.filter((p) => p.id !== spinner.id);
  const chosenTarget = otherPlayers.length > 0
    ? otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
    : room.players[0];

  const targetIndex = room.players.findIndex((p) => p.id === chosenTarget.id);
  const totalPlayers = room.players.length;
  const angleStep = 360 / totalPlayers;
  const baseTargetAngle = targetIndex * angleStep;

  const fullRotations = (5 + Math.floor(Math.random() * 4)) * 360;
  const jitter = (Math.random() - 0.5) * (angleStep * 0.15);
  const newAngle = room.bottleAngle + fullRotations + ((baseTargetAngle - (room.bottleAngle % 360) + 360) % 360) + jitter;

  const qList = room.questions.length > 0 ? room.questions : DEFAULT_QUESTIONS;
  const selectedQuestion = qList[Math.floor(Math.random() * qList.length)];

  room.isSpinning = true;
  room.spinnerPlayerId = spinner.id;
  room.targetPlayerId = null;
  room.currentQuestion = null;
  room.bottleAngle = newAngle;

  broadcastToRoom(room.id, {
    type: 'spin_started',
    room,
    spinnerPlayer: spinner,
    newAngle,
    durationMs: 3500,
  });

  setTimeout(() => {
    const currentRoom = rooms.get(room.id);
    if (currentRoom) {
      currentRoom.isSpinning = false;
      currentRoom.targetPlayerId = chosenTarget.id;
      currentRoom.currentQuestion = selectedQuestion;
      currentRoom.chatMessages.push({
        id: `spin-res-${Date.now()}`,
        senderId: 'system',
        senderName: 'სიყვარულის ისარი 🏹',
        senderAvatar: '',
        text: `💘 ბოთლმა მიუთითა: ${chosenTarget.name}! კითხვა: "${selectedQuestion.text}"`,
        timestamp: Date.now(),
        type: 'confession',
      });
      if (currentRoom.chatMessages.length > 100) {
        currentRoom.chatMessages = currentRoom.chatMessages.slice(-100);
      }
      broadcastToRoom(room.id, {
        type: 'spin_ended',
        room: currentRoom,
        targetPlayer: chosenTarget,
        question: selectedQuestion,
      });
    }
  }, 3500);

  return { spinner, chosenTarget, newAngle };
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  ws.on('message', (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const rawRoomId = data.roomId;
      if (!rawRoomId) return;

      const roomId = normalizeRoomId(rawRoomId);
      const room = getOrCreateRoom(roomId, data.roomName);
      room.lastActivity = Date.now();

      switch (data.type) {
        case 'join_room': {
          const newPlayer: Player = {
            id: data.player.id,
            name: data.player.name || 'ანონიმური',
            avatar: data.player.avatar || '',
            status: data.player.status || 'თავისუფალი 💖',
            bio: data.player.bio || '',
            isHost: room.players.length === 0,
            isBot: false,
            lastSeen: Date.now(),
          };

          socketRooms.set(ws, { roomId, playerId: newPlayer.id });

          const existingIdx = room.players.findIndex((p) => p.id === newPlayer.id);
          if (existingIdx >= 0) {
            room.players[existingIdx] = { ...room.players[existingIdx], ...newPlayer };
          } else {
            room.players.push(newPlayer);
            room.chatMessages.push({
              id: `sys-${Date.now()}-${Math.random()}`,
              senderId: 'system',
              senderName: 'სისტემა',
              senderAvatar: '',
              text: `✨ ${newPlayer.name} შემოუერთდა მაგიდას!`,
              timestamp: Date.now(),
              type: 'system',
            });
          }

          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'update_profile': {
          const pIndex = room.players.findIndex((p) => p.id === data.playerId);
          if (pIndex >= 0) {
            room.players[pIndex] = {
              ...room.players[pIndex],
              name: data.player.name || room.players[pIndex].name,
              avatar: data.player.avatar || room.players[pIndex].avatar,
              status: data.player.status || room.players[pIndex].status,
              bio: data.player.bio ?? room.players[pIndex].bio,
              lastSeen: Date.now(),
            };
            broadcastToRoom(roomId, { type: 'room_state', room });
          }
          break;
        }

        case 'add_bot': {
          const botPlayer: Player = {
            id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: data.bot.name,
            avatar: data.bot.avatar,
            status: data.bot.status,
            bio: data.bot.bio,
            isHost: false,
            isBot: true,
            lastSeen: Date.now(),
          };
          room.players.push(botPlayer);
          room.chatMessages.push({
            id: `sys-${Date.now()}-${Math.random()}`,
            senderId: 'system',
            senderName: 'სისტემა',
            senderAvatar: '',
            text: `✨ ${botPlayer.name} დაემატა მაგიდას!`,
            timestamp: Date.now(),
            type: 'system',
          });
          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'remove_player': {
          const targetId = data.targetPlayerId;
          const p = room.players.find((item) => item.id === targetId);
          room.players = room.players.filter((item) => item.id !== targetId);
          if (p) {
            room.chatMessages.push({
              id: `sys-${Date.now()}`,
              senderId: 'system',
              senderName: 'სისტემა',
              senderAvatar: '',
              text: `${p.name}-მ დატოვა მაგიდა`,
              timestamp: Date.now(),
              type: 'system',
            });
          }
          if (room.currentTurnIndex >= room.players.length) {
            room.currentTurnIndex = 0;
          }
          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'spin_bottle': {
          if (room.players.length < 2) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'ბოთლის დასატრიალებლად საჭიროა მინიმუმ 2 მოთამაშე!',
            }));
            return;
          }
          triggerSpin(room);
          break;
        }

        case 'next_turn': {
          if (room.players.length > 0) {
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
            room.currentQuestion = null;
            room.spinnerPlayerId = room.players[room.currentTurnIndex]?.id || null;
            room.targetPlayerId = null;
            broadcastToRoom(roomId, { type: 'room_state', room });
          }
          break;
        }

        case 'reroll_question': {
          const qList = room.questions.length > 0 ? room.questions : DEFAULT_QUESTIONS;
          const category = data.category;
          const filtered = category ? qList.filter(q => q.category === category) : qList;
          const pool = filtered.length > 0 ? filtered : qList;
          room.currentQuestion = pool[Math.floor(Math.random() * pool.length)];
          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'add_question': {
          const newQ = {
            id: `q-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            category: data.question.category || 'სიმართლე',
            text: data.question.text.trim(),
            isCustom: true,
          };
          if (newQ.text) {
            room.questions.unshift(newQ);
            room.chatMessages.push({
              id: `sys-${Date.now()}`,
              senderId: 'system',
              senderName: 'სისტემა',
              senderAvatar: '',
              text: `📝 დაემატა ახალი კითხვა: "${newQ.text.slice(0, 40)}..." (${newQ.category})`,
              timestamp: Date.now(),
              type: 'system',
            });
            broadcastToRoom(roomId, { type: 'room_state', room });
          }
          break;
        }

        case 'delete_question': {
          const qId = data.questionId;
          const beforeLen = room.questions.length;
          room.questions = room.questions.filter((q) => q.id !== qId);
          if (room.questions.length < beforeLen) {
            broadcastToRoom(roomId, { type: 'room_state', room });
          }
          break;
        }

        case 'reset_questions': {
          room.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
          broadcastToRoom(roomId, { type: 'room_state', room });
          break;
        }

        case 'chat_message': {
          const msg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            senderId: data.message.senderId,
            senderName: data.message.senderName || 'სტუმარი',
            senderAvatar: data.message.senderAvatar || '',
            text: data.message.text,
            timestamp: Date.now(),
            type: data.message.type || 'chat',
          };
          room.chatMessages.push(msg);
          if (room.chatMessages.length > 120) {
            room.chatMessages = room.chatMessages.slice(-120);
          }
          broadcastToRoom(roomId, { type: 'chat_broadcast', message: msg, room });
          break;
        }

        case 'send_reaction': {
          broadcastToRoom(roomId, {
            type: 'reaction_received',
            reaction: {
              id: `react-${Date.now()}-${Math.random()}`,
              emoji: data.emoji,
              fromPlayerId: data.fromPlayerId,
              toPlayerId: data.toPlayerId,
              timestamp: Date.now(),
            },
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });

  ws.on('close', () => {
    socketRooms.delete(ws);
    // Keep player in room so brief network reconnections or page refreshes don't drop them
  });
});

// REST Fallback API - Guarantees 100% online multiplayer even if WebSocket is blocked!
app.get('/api/rooms', (_req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    playersCount: r.players.length,
    lastActivity: r.lastActivity,
  }));
  res.json(roomList);
});

app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = getOrCreateRoom(roomId);
  res.json({ room });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = getOrCreateRoom(roomId, req.body.roomName);
  const pData = req.body.player;
  if (!pData || !pData.id) {
    return res.status(400).json({ error: 'Player data required' });
  }

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
      id: `sys-${Date.now()}-${Math.random()}`,
      senderId: 'system',
      senderName: 'სისტემა',
      senderAvatar: '',
      text: `✨ ${newPlayer.name} შემოუერთდა მაგიდას!`,
      timestamp: Date.now(),
      type: 'system',
    });
  }
  room.lastActivity = Date.now();
  broadcastToRoom(roomId, { type: 'room_state', room });
  res.json({ success: true, room });
});

app.post('/api/rooms/:roomId/spin', (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = getOrCreateRoom(roomId);
  const result = triggerSpin(room);
  if (!result) {
    return res.status(400).json({ error: 'Cannot spin with fewer than 2 players or while spinning' });
  }
  res.json({ success: true, room });
});

app.post('/api/rooms/:roomId/chat', (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = getOrCreateRoom(roomId);
  const { message } = req.body;
  if (!message || !message.text) {
    return res.status(400).json({ error: 'Message required' });
  }
  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: message.senderId,
    senderName: message.senderName || 'სტუმარი',
    senderAvatar: message.senderAvatar || '',
    text: message.text,
    timestamp: Date.now(),
    type: message.type || 'chat',
  };
  room.chatMessages.push(msg);
  broadcastToRoom(roomId, { type: 'chat_broadcast', message: msg, room });
  res.json({ success: true, message: msg, room });
});

app.post('/api/rooms/:roomId/action', (req, res) => {
  const roomId = normalizeRoomId(req.params.roomId);
  const room = getOrCreateRoom(roomId);
  const { action, payload } = req.body;

  if (action === 'next_turn' && room.players.length > 0) {
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    room.currentQuestion = null;
    room.spinnerPlayerId = room.players[room.currentTurnIndex]?.id || null;
    room.targetPlayerId = null;
  } else if (action === 'reroll') {
    const qList = room.questions.length > 0 ? room.questions : DEFAULT_QUESTIONS;
    room.currentQuestion = qList[Math.floor(Math.random() * qList.length)];
  } else if (action === 'add_bot' && payload) {
    const botPlayer: Player = {
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: payload.name,
      avatar: payload.avatar,
      status: payload.status,
      bio: payload.bio,
      isHost: false,
      isBot: true,
      lastSeen: Date.now(),
    };
    room.players.push(botPlayer);
  } else if (action === 'remove_player' && payload?.targetPlayerId) {
    room.players = room.players.filter((p) => p.id !== payload.targetPlayerId);
  }

  room.lastActivity = Date.now();
  broadcastToRoom(roomId, { type: 'room_state', room });
  res.json({ success: true, room });
});

// Vite middleware or static serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Georgian Love Bottle server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
