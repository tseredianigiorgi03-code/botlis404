import React, { useState, useEffect, useMemo } from 'react';
import { Player, QuestionCategory } from './types';
import { AVATAR_PRESETS } from './data/defaultQuestions';
import { useGameSocket } from './hooks/useGameSocket';
import { Header } from './components/Header';
import { BottleCircle } from './components/BottleCircle';
import { QuestionCard } from './components/QuestionCard';
import { ChatBox } from './components/ChatBox';
import { QuestionsManager } from './components/QuestionsManager';
import { ProfileModal } from './components/ProfileModal';
import { RoomModal } from './components/RoomModal';
import { InviteModal } from './components/InviteModal';
import { PlayerActionModal } from './components/PlayerActionModal';
import { FloatingReactions } from './components/FloatingReactions';
import { soundEffects } from './utils/audio';
import { Heart, Sparkles, Users, Share2, DoorOpen, Copy, Check, MessageSquare, QrCode } from 'lucide-react';

const STORAGE_KEY_PLAYER = 'love_bottle_player_ge_v2';

export default function App() {
  // Initialize player with distinct identity per browser/device
  const [player, setPlayer] = useState<Player>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYER);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    const sampleNames = ['გიორგი 💖', 'ნინო ✨', 'სანდრო 🍷', 'მარიამი 🌸', 'ლუკა 🔥', 'ანა 🌹'];
    const pickedName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const pickedAvatar = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].url;

    return {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: pickedName,
      avatar: pickedAvatar,
      status: 'თავისუფალი 💖',
      bio: 'მზად ვარ რომანტიკული კითხვებისთვის! ✨',
      isHost: false,
    };
  });

  // Canonical Room ID: default is 'LOVE' for all visitors, or URL search/hash
  const [roomId, setRoomId] = useState<string>(() => {
    try {
      const searchParam = new URLSearchParams(window.location.search).get('room');
      if (searchParam && searchParam.trim()) {
        return searchParam.trim().toUpperCase();
      }
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) {
        return hash.toUpperCase();
      }
    } catch {
      // fallback
    }
    return 'LOVE';
  });

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals and widgets state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedPlayerForAction, setSelectedPlayerForAction] = useState<Player | null>(null);
  const [copiedQuick, setCopiedQuick] = useState(false);

  // Sync room ID to URL search & hash
  useEffect(() => {
    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', roomId);
      newUrl.hash = roomId;
      window.history.replaceState({}, '', newUrl.toString());
    } catch {
      // ignore
    }
  }, [roomId]);

  // Sync player to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(player));
    } catch {
      // ignore storage error
    }
  }, [player]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playHeartSound();
  };

  // WebSocket + WebRTC + REST triple-redundant hook
  const {
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
    refetchRoom,
  } = useGameSocket({
    player,
    roomId,
  });

  const handleSaveProfile = (updated: Player) => {
    setPlayer(updated);
    updateProfile(updated);
  };

  const handleSelectRoom = (newRoomId: string) => {
    const clean = newRoomId.trim().toUpperCase();
    if (clean) {
      setRoomId(clean);
      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('room', clean);
        newUrl.hash = clean;
        window.history.replaceState({}, '', newUrl.toString());
      } catch {
        // ignore
      }
    }
  };

  const handleQuickCopyCode = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      soundEffects.playHeartSound();
      setCopiedQuick(true);
      setTimeout(() => setCopiedQuick(false), 2000);
    }).catch(() => {});
  };

  // Current players list fallback to local player if room is initializing
  const playersList = useMemo(() => {
    if (room && room.players.length > 0) {
      // Ensure local player is included if missing
      const exists = room.players.some((p) => p.id === player.id);
      if (!exists) {
        return [player, ...room.players];
      }
      return room.players;
    }
    return [player];
  }, [room, player]);

  const currentQuestions = useMemo(() => {
    return room?.questions || [];
  }, [room]);

  const spinnerPlayer = useMemo(() => {
    if (!room) return undefined;
    return room.players.find((p) => p.id === room.spinnerPlayerId) || room.players[room.currentTurnIndex];
  }, [room]);

  const targetPlayer = useMemo(() => {
    if (!room || !room.targetPlayerId) return undefined;
    return room.players.find((p) => p.id === room.targetPlayerId);
  }, [room]);

  return (
    <div className="min-h-screen flex flex-col justify-between text-rose-50 relative overflow-x-hidden">
      {/* Background Ambient Glows & Floating Atmosphere */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-600/15 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-pink-600/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-red-600/10 blur-3xl" />
      </div>

      {/* Floating Reaction Emojis */}
      <FloatingReactions reactions={activeReactions} />

      {/* Top Header */}
      <Header
        player={player}
        roomId={roomId}
        roomName={room?.name || `მაგიდა #${roomId}`}
        questionsCount={currentQuestions.length}
        playersCount={playersList.length}
        messagesCount={room?.chatMessages?.length || 0}
        isConnected={isConnected}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenQuestions={() => setIsQuestionsOpen(true)}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenRooms={() => setIsRoomsOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Game Arena */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-2 sm:px-4 py-2 sm:py-3 flex flex-col items-center justify-between">
        {/* Room Info Bar: prominent room code + invite + change room + chat toggle */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-900/60 border border-rose-900/40 backdrop-blur-sm mb-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </span>

            <span className="text-rose-300/80 font-medium hidden sm:inline">მაგიდა:</span>
            <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-800/60 px-2.5 py-1 rounded-xl">
              <span className="font-mono font-bold text-pink-300 text-sm">#{roomId}</span>
              <button
                type="button"
                onClick={handleQuickCopyCode}
                className="text-rose-400 hover:text-white transition-colors"
                title="ოთახის კოდის დაკოპირება"
              >
                {copiedQuick ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="text-[11px] text-rose-300 bg-slate-950/60 px-2 py-1 rounded-xl border border-rose-900/40 flex items-center gap-1">
              <Users className="w-3 h-3 text-pink-400" />
              <span>{playersList.length} მოთამაშე</span>
            </div>

            <button
              type="button"
              onClick={() => setIsRoomsOpen(true)}
              className="text-[11px] text-pink-400 hover:text-pink-300 underline font-semibold flex items-center gap-1"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ოთახის შეცვლა</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Chat Button in toolbar */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playHeartSound();
                setIsChatOpen(!isChatOpen);
              }}
              className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
              <span>ჩატი ({room?.chatMessages?.length || 0})</span>
            </button>

            {/* QR Invite Button */}
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600/40 to-rose-600/40 hover:from-pink-600/60 hover:to-rose-600/60 text-rose-100 border border-pink-500/50 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5 text-pink-300" />
              <span>QR კოდით მოწვევა</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="text-[11px] text-rose-300/80 hover:text-rose-100 flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-xl border border-rose-900/40"
            >
              <span>შენ: <strong className="text-white">{player.name}</strong></span>
              <Sparkles className="w-3 h-3 text-amber-300" />
            </button>
          </div>
        </div>

        {/* Centerpiece: Bottle & Players Circle */}
        <div className="w-full flex-1 flex items-center justify-center my-1 sm:my-2">
          <BottleCircle
            players={playersList}
            currentTurnIndex={room?.currentTurnIndex || 0}
            bottleAngle={room?.bottleAngle || 0}
            isSpinning={room?.isSpinning || false}
            spinnerPlayerId={room?.spinnerPlayerId || null}
            targetPlayerId={room?.targetPlayerId || null}
            myPlayerId={player.id}
            activeQuestion={!room?.isSpinning ? room?.currentQuestion : null}
            onSpin={spinBottle}
            onAddBot={addBot}
            onRemovePlayer={removePlayer}
            onSelectPlayerForReaction={(p) => {
              if (p.id !== player.id) {
                setSelectedPlayerForAction(p);
              } else {
                setIsProfileOpen(true);
              }
            }}
          />
        </div>

        {/* Active Question Display (ONLY after bottle has finished spinning!) */}
        {room?.currentQuestion && !room.isSpinning && targetPlayer && (
          <QuestionCard
            question={room.currentQuestion}
            spinnerPlayer={spinnerPlayer}
            targetPlayer={targetPlayer}
            onDone={() => {
              nextTurn();
            }}
            onReroll={() => {
              rerollQuestion();
            }}
            onNextTurn={nextTurn}
          />
        )}
      </main>

      {/* Floating Chat Widget Popup (Zero Page Scrolling Required!) */}
      <ChatBox
        messages={room?.chatMessages || []}
        myPlayer={player}
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen(!isChatOpen)}
        onSendMessage={sendMessage}
        onSendReaction={sendReaction}
      />

      {/* Footer Info */}
      <footer className="w-full py-2 px-4 text-center text-[11px] text-rose-400/60 border-t border-rose-950/40 backdrop-blur-sm bg-slate-950/40">
        <p className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>სიყვარულის ბოთლობანა ონლაინ</span>
          <span>•</span>
          <span>საერთო მაგიდა: #{roomId}</span>
          <span>•</span>
          <span>დაასკანერე QR კოდი ტელეფონით</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
        </p>
      </footer>

      {/* Modals */}
      <ProfileModal
        player={player}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSave={handleSaveProfile}
      />

      <RoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        currentRoomId={roomId}
        onSelectRoom={handleSelectRoom}
        onOpenProfile={() => setIsProfileOpen(true)}
        player={player}
      />

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomId={roomId}
      />

      <QuestionsManager
        isOpen={isQuestionsOpen}
        onClose={() => setIsQuestionsOpen(false)}
        questions={currentQuestions}
        onAddQuestion={(text, cat) => addQuestion(text, cat as QuestionCategory)}
        onDeleteQuestion={deleteQuestion}
        onResetQuestions={resetQuestions}
      />

      <PlayerActionModal
        player={selectedPlayerForAction}
        onClose={() => setSelectedPlayerForAction(null)}
        onSendReaction={sendReaction}
        onSendDirectMessage={(text) => sendMessage(text, 'confession')}
      />
    </div>
  );
}
