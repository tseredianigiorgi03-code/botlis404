import React from 'react';
import { Heart, Volume2, VolumeX, ListPlus, Share2, Sparkles, DoorOpen, MessageSquare } from 'lucide-react';
import { Player } from '../types';
import { soundEffects } from '../utils/audio';

interface HeaderProps {
  player: Player;
  roomId: string;
  roomName: string;
  questionsCount: number;
  playersCount: number;
  messagesCount: number;
  isConnected: boolean;
  onOpenProfile: () => void;
  onOpenQuestions: () => void;
  onOpenInvite: () => void;
  onOpenRooms: () => void;
  onToggleChat: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  player,
  roomId,
  questionsCount,
  messagesCount,
  isConnected,
  onOpenProfile,
  onOpenQuestions,
  onOpenInvite,
  onOpenRooms,
  onToggleChat,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-rose-950/50 px-3 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/30 ring-2 ring-rose-400/30">
            <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1">
                <span>ბოთლობანა</span>
                <span className="text-rose-400 font-serif italic text-xs sm:text-sm">Love</span>
              </h1>
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-amber-400 animate-ping'}`}
                title={isConnected ? 'ონლაინში ხართ' : 'დაკავშირება...'}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-rose-300/70 hidden sm:block">
              ქართული ონლაინ რომანტიკული თამაში
            </p>
          </div>
        </div>

        {/* Buttons Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Room Code Switcher */}
          <button
            onClick={() => {
              soundEffects.playHeartSound();
              onOpenRooms();
            }}
            className="flex items-center gap-1.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-rose-200 border border-rose-800/50 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
            title="ოთახის შეცვლა ან კოდით შესვლა"
          >
            <DoorOpen className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-mono font-bold text-pink-300 max-w-[80px] sm:max-w-none truncate">#{roomId}</span>
            <span className="hidden lg:inline text-[10px] text-rose-400/70 border-l border-rose-800/40 pl-1.5">შეცვლა</span>
          </button>

          {/* Invite Friends & QR Code Button */}
          <button
            onClick={() => {
              soundEffects.playHeartSound();
              onOpenInvite();
            }}
            className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-pink-900/60 to-rose-900/60 hover:from-pink-800/70 hover:to-rose-800/70 text-rose-100 border border-pink-700/50 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-md shadow-rose-950/40"
            title="მოიწვიე მეგობრები QR კოდით ან ბმულით"
          >
            <Share2 className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden sm:inline font-semibold">QR / მოწვევა</span>
          </button>

          {/* Chat Quick Toggle Button */}
          <button
            onClick={() => {
              soundEffects.playHeartSound();
              onToggleChat();
            }}
            className="flex items-center gap-1.5 text-xs bg-rose-950/60 hover:bg-rose-900/60 text-rose-100 border border-rose-800/50 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
            title="ჩატის ფანჯრის გახსნა/დახურვა"
          >
            <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden md:inline font-semibold">ჩატი</span>
            <span className="px-1.5 py-0.2 rounded-full bg-pink-500/30 text-pink-200 text-[11px] font-bold border border-pink-400/30">
              {messagesCount}
            </span>
          </button>

          {/* Questions Manager Button */}
          <button
            onClick={() => {
              soundEffects.playHeartSound();
              onOpenQuestions();
            }}
            className="flex items-center gap-1.5 text-xs bg-rose-950/50 hover:bg-rose-900/50 text-rose-100 border border-rose-800/40 px-2 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
            title="კითხვების დამატება და ამოშლა"
          >
            <ListPlus className="w-3.5 h-3.5 text-pink-300" />
            <span className="hidden md:inline font-medium">კითხვები</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-200 text-[11px] font-semibold border border-rose-400/30">
              {questionsCount}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 text-rose-300 border border-rose-900/40 transition-colors"
            title={soundEnabled ? 'ხმის გამორთვა' : 'ხმის ჩართვა'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-rose-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Profile Button */}
          <button
            onClick={() => {
              soundEffects.playHeartSound();
              onOpenProfile();
            }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/50 transition-all active:scale-95 group"
            title="შენი პროფილის და ფოტოს შეცვლა"
          >
            <div className="relative">
              <img
                src={player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                alt={player.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-rose-400/50 group-hover:ring-rose-400 transition-all shadow"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-1 ring-slate-950" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-rose-100 leading-tight truncate max-w-[80px] md:max-w-[110px]">
                {player.name}
              </div>
              <div className="text-[10px] text-rose-300/80 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                <span className="truncate max-w-[75px]">{player.status.split(' ')[0]}</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
