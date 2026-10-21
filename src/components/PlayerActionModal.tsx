import React from 'react';
import { Player } from '../types';
import { Heart, Sparkles, X, MessageCircle, Send } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface PlayerActionModalProps {
  player: Player | null;
  onClose: () => void;
  onSendReaction: (emoji: string, toPlayerId?: string) => void;
  onSendDirectMessage: (text: string) => void;
}

const PLAYER_REACTIONS = [
  { emoji: '💖', label: 'გული' },
  { emoji: '🌹', label: 'ვარდი' },
  { emoji: '💋', label: 'კოცნა' },
  { emoji: '🥂', label: 'სადღეგრძელო' },
  { emoji: '🔥', label: 'ცეცხლი' },
  { emoji: '👀', label: 'სიმპატია' },
];

export const PlayerActionModal: React.FC<PlayerActionModalProps> = ({
  player,
  onClose,
  onSendReaction,
  onSendDirectMessage,
}) => {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-rose-950 border border-rose-800/60 rounded-3xl p-5 shadow-2xl shadow-rose-950/90 relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-rose-300 hover:text-white hover:bg-rose-900/40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Card View */}
        <div className="relative inline-block mx-auto mb-3">
          <img
            src={player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
            alt={player.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-rose-500/70 shadow-lg mx-auto"
          />
          <span className="absolute bottom-0 right-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow">
            {player.status.split(' ')[0]}
          </span>
        </div>

        <h3 className="text-base font-bold text-white flex items-center justify-center gap-1">
          {player.name}
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </h3>

        <p className="text-xs text-rose-300/80 mt-1 mb-4 italic">
          {player.bio || player.status}
        </p>

        {/* Send Direct Reaction */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-rose-200">
            გაუგზავნე სიყვარულის რეაქცია {player.name}-ს:
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PLAYER_REACTIONS.map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() => {
                  soundEffects.playHeartSound();
                  onSendReaction(item.emoji, player.id);
                  onSendDirectMessage(`${player.name}-ს გაეგზავნა ${item.emoji}!`);
                  onClose();
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-950/60 hover:bg-rose-900/40 border border-rose-900/40 hover:border-rose-700/60 transition-all active:scale-95"
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-[10px] text-rose-300">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
