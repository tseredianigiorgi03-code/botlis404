import React from 'react';
import { Player, QuestionItem } from '../types';
import { Sparkles, Dices, ArrowRight, CheckCircle2, Heart, MessageCircle } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';

interface QuestionCardProps {
  question: QuestionItem | null;
  spinnerPlayer: Player | undefined;
  targetPlayer: Player | undefined;
  onDone: () => void;
  onReroll: () => void;
  onNextTurn: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  spinnerPlayer,
  targetPlayer,
  onDone,
  onReroll,
  onNextTurn,
}) => {
  if (!question || !targetPlayer) return null;

  const handleCelebrate = () => {
    soundEffects.playCelebration();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f43f5e', '#ec4899', '#f59e0b', '#8b5cf6', '#ffffff'],
    });
    onDone();
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'სიმართლე':
        return { bg: 'from-indigo-600/30 to-purple-600/30', border: 'border-indigo-500/50', badge: 'bg-indigo-500 text-white' };
      case 'მოქმედება':
        return { bg: 'from-amber-600/30 to-orange-600/30', border: 'border-amber-500/50', badge: 'bg-amber-500 text-slate-950 font-black' };
      case 'აღსარება':
        return { bg: 'from-rose-600/30 to-pink-600/30', border: 'border-rose-500/50', badge: 'bg-rose-600 text-white' };
      case 'ფლირტი':
        return { bg: 'from-pink-600/30 to-rose-600/30', border: 'border-pink-500/50', badge: 'bg-pink-500 text-white' };
      default:
        return { bg: 'from-emerald-600/30 to-teal-600/30', border: 'border-emerald-500/50', badge: 'bg-emerald-500 text-white' };
    }
  };

  const theme = getCategoryTheme(question.category);

  return (
    <div className="w-full max-w-xl mx-auto my-3 px-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`relative rounded-3xl bg-gradient-to-br ${theme.bg} backdrop-blur-xl border-2 ${theme.border} p-4 sm:p-6 shadow-2xl shadow-rose-950/80`}>
        {/* Floating Heart Accent */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-rose-600 border border-rose-300 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
          <Heart className="w-3.5 h-3.5 fill-white" />
          <span>{question.category}</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </div>

        {/* Players Pair Info */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-3 border-b border-rose-500/20 text-xs sm:text-sm">
          {spinnerPlayer && (
            <div className="flex items-center gap-1.5 text-rose-200">
              <img
                src={spinnerPlayer.avatar}
                alt={spinnerPlayer.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-400"
              />
              <span className="font-semibold text-white">{spinnerPlayer.name}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-pink-400 font-bold px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/40">
            <span>მიმართავს</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 text-pink-200">
            <img
              src={targetPlayer.avatar}
              alt={targetPlayer.name}
              className="w-6 h-6 rounded-full object-cover ring-2 ring-pink-500"
            />
            <span className="font-bold text-pink-300 underline decoration-pink-500">{targetPlayer.name}</span>
          </div>
        </div>

        {/* Question Text */}
        <div className="py-4 sm:py-5 text-center">
          <p className="text-base sm:text-xl font-bold text-white leading-relaxed drop-shadow-md">
            "{question.text}"
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCelebrate}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            შესრულდა! ✨
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playHeartSound();
              onReroll();
            }}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900/80 hover:bg-slate-800 text-rose-200 border border-rose-800/50 shadow active:scale-95 transition-all flex items-center gap-1.5"
            title="სხვა შემთხვევითი კითხვის არჩევა"
          >
            <Dices className="w-4 h-4 text-pink-400" />
            სხვა კითხვა
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playHeartSound();
              onNextTurn();
            }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-700/80 hover:bg-rose-600 text-white shadow active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>შემდეგი სვლა</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
