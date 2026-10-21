import React, { useState, useEffect } from 'react';
import { Player, QuestionItem } from '../types';
import { Sparkles, Dices, ArrowRight, CheckCircle2, Heart, Eye, ArrowUp, PanelTop, Maximize2, X } from 'lucide-react';
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
  // View mode: 'card' (centered overlay), 'top-banner' (pinned at top so table is visible), or 'minimized' (small badge)
  const [viewMode, setViewMode] = useState<'card' | 'top-banner' | 'minimized'>('card');

  // Play sound when question card opens
  useEffect(() => {
    if (question && targetPlayer) {
      soundEffects.playHeartSound();
    }
  }, [question?.id, targetPlayer?.id]);

  // Lock background scroll when modal is in centered card mode so page cannot jump or scroll down
  useEffect(() => {
    if (viewMode === 'card') {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Ensure window is at top so nothing is cut off
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [viewMode]);

  if (!question || !targetPlayer) return null;

  const handleCelebrate = () => {
    soundEffects.playCelebration();
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.4 },
      colors: ['#f43f5e', '#ec4899', '#f59e0b', '#8b5cf6', '#ffffff'],
    });
    onDone();
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'სიმართლე':
        return {
          bg: 'from-indigo-950 via-purple-950 to-slate-950',
          border: 'border-indigo-400/80',
          badge: 'bg-indigo-600 text-white',
          glow: 'shadow-indigo-900/60',
          accent: 'text-indigo-300',
        };
      case 'მოქმედება':
        return {
          bg: 'from-amber-950 via-orange-950 to-slate-950',
          border: 'border-amber-400/80',
          badge: 'bg-amber-500 text-slate-950 font-black',
          glow: 'shadow-amber-900/60',
          accent: 'text-amber-300',
        };
      case 'აღსარება':
        return {
          bg: 'from-rose-950 via-pink-950 to-slate-950',
          border: 'border-rose-400/80',
          badge: 'bg-rose-600 text-white',
          glow: 'shadow-rose-900/60',
          accent: 'text-rose-300',
        };
      case 'ფლირტი':
        return {
          bg: 'from-pink-950 via-rose-950 to-slate-950',
          border: 'border-pink-400/80',
          badge: 'bg-pink-500 text-white',
          glow: 'shadow-pink-900/60',
          accent: 'text-pink-300',
        };
      default:
        return {
          bg: 'from-emerald-950 via-teal-950 to-slate-950',
          border: 'border-emerald-400/80',
          badge: 'bg-emerald-500 text-white',
          glow: 'shadow-emerald-900/60',
          accent: 'text-emerald-300',
        };
    }
  };

  const theme = getCategoryTheme(question.category);

  // Responsive font size based on text length to guarantee zero scrolling
  const questionFontSize =
    question.text.length > 110
      ? 'text-sm sm:text-base leading-snug'
      : question.text.length > 60
      ? 'text-base sm:text-lg md:text-xl leading-relaxed'
      : 'text-lg sm:text-2xl font-black leading-normal';

  // 1. Minimized View (Floating compact badge at top)
  if (viewMode === 'minimized') {
    return (
      <aside aria-label="კითხვის შეტყობინება" className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 w-[92%] max-w-md">
        <button
          type="button"
          onClick={() => setViewMode('card')}
          className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r ${theme.bg} border-2 ${theme.border} text-white shadow-2xl active:scale-98 transition-all glow-romantic`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-600 text-white font-bold">
              {question.category}
            </span>
            <span className="text-xs font-bold truncate text-pink-200">
              {targetPlayer.name}: „{question.text}“
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-300 shrink-0 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-rose-800/40">
            <Eye className="w-3.5 h-3.5 text-pink-400" />
            <span>გახსნა</span>
          </div>
        </button>
      </aside>
    );
  }

  // 2. Top-Banner HUD View (Pinned strictly at the top of the viewport, leaving the whole table visible)
  if (viewMode === 'top-banner') {
    return (
      <aside aria-label="კითხვის შეტყობინება" className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-2xl animate-in fade-in slide-in-from-top-3 duration-200">
        <div
          className={`w-full rounded-2xl bg-gradient-to-r ${theme.bg} border-2 ${theme.border} p-3 sm:p-4 shadow-2xl ${theme.glow} backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-rose-500/20 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${theme.badge}`}>
                {question.category}
              </span>
              <span className="text-rose-200 text-xs truncate">
                მიმართავს: <strong className="text-pink-300 underline">{targetPlayer.name}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className="px-2 py-0.5 rounded-lg text-[11px] text-rose-300 hover:text-white bg-slate-900/70 border border-rose-800/40 flex items-center gap-1 transition-colors"
                title="ცენტრში გადიდება"
              >
                <Maximize2 className="w-3 h-3 text-pink-400" />
                <span className="hidden xs:inline">ცენტრში</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('minimized')}
                className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/40 transition-colors"
                title="ჩაკეცვა"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div className="py-2 text-center">
            <p className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow">
              „{question.text}“
            </p>
          </div>

          {/* Compact Inline Actions */}
          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-rose-500/20">
            <button
              type="button"
              onClick={handleCelebrate}
              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>შესრულდა! ✨</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playHeartSound();
                onReroll();
              }}
              className="py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-rose-200 border border-rose-800/60 active:scale-95 transition-all flex items-center gap-1"
              title="სხვა შემთხვევითი კითხვა"
            >
              <Dices className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden xs:inline">სხვა</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playHeartSound();
                onNextTurn();
              }}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-700 hover:bg-rose-600 text-white shadow active:scale-95 transition-all flex items-center gap-1"
            >
              <span>შემდეგი</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. Main Center Modal View (Completely scroll-free, strictly fits viewport, compact & elegant)
  return (
    <aside 
      aria-label="კითხვის შეტყობინება"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
    >
      <div 
        className={`relative w-full max-w-md sm:max-w-lg rounded-3xl bg-gradient-to-b ${theme.bg} border-2 ${theme.border} p-4 sm:p-6 shadow-2xl ${theme.glow} select-none flex flex-col justify-between max-h-[88vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Category Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 border border-rose-300 text-white text-[11px] sm:text-xs font-black shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
          <Heart className="w-3 h-3 fill-white" />
          <span>{question.category}</span>
          <Sparkles className="w-3 h-3 text-amber-300" />
        </div>

        {/* Header bar: target announcement + view modes */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-rose-500/20 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-rose-300/90 font-medium">
            <span>ბოთლის არჩევანი 🎯</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('top-banner')}
              className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] text-rose-300 hover:text-white bg-slate-900/70 border border-rose-800/40 flex items-center gap-1 transition-colors"
              title="ზედა ზოლად დაფიქსირება (მაგიდის სანახავად)"
            >
              <PanelTop className="w-3 h-3 text-pink-400" />
              <span>ზედა ზოლი</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('minimized')}
              className="p-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-900/40 transition-colors"
              title="ჩაკეცვა"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Players Pair Info (Who -> Who) - Compact Single Row */}
        <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-950/60 rounded-2xl border border-rose-900/40 text-xs mb-3">
          {spinnerPlayer && (
            <div className="flex items-center gap-1.5 text-rose-200 min-w-0">
              <img
                src={spinnerPlayer.avatar}
                alt={spinnerPlayer.name}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-amber-400 shrink-0"
              />
              <span className="font-bold text-white text-xs truncate max-w-[80px] sm:max-w-[110px]">
                {spinnerPlayer.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-0.5 text-pink-400 font-bold px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-700/60 text-[10px] shrink-0">
            <span>მიმართავს</span>
            <ArrowRight className="w-3 h-3" />
          </div>

          <div className="flex items-center gap-1.5 text-pink-200 min-w-0">
            <img
              src={targetPlayer.avatar}
              alt={targetPlayer.name}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-pink-500 animate-pulse shrink-0"
            />
            <span className="font-black text-pink-300 text-xs truncate max-w-[90px] sm:max-w-[130px] underline decoration-pink-500">
              {targetPlayer.name}
            </span>
          </div>
        </div>

        {/* The Question Text - Prominently Displayed with Zero Need to Scroll */}
        <div className="my-auto py-3 sm:py-5 px-1 sm:px-3 text-center">
          <p className={`${questionFontSize} font-black text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]`}>
            „{question.text}“
          </p>
        </div>

        {/* Action Controls - All in 1 Line, Always Visible without Scrolling */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-rose-500/20 mt-2">
          <button
            type="button"
            onClick={handleCelebrate}
            className="flex-1 py-2 sm:py-2.5 px-2 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-950/70 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>შესრულდა! ✨</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playHeartSound();
              onReroll();
            }}
            className="py-2 sm:py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold bg-slate-900/90 hover:bg-slate-800 text-rose-200 border border-rose-800/60 shadow active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="სხვა შემთხვევითი კითხვის არჩევა"
          >
            <Dices className="w-4 h-4 text-pink-400 shrink-0" />
            <span>სხვა კითხვა</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEffects.playHeartSound();
              onNextTurn();
            }}
            className="flex-1 py-2 sm:py-2.5 px-2 rounded-2xl text-xs sm:text-sm font-bold bg-rose-700 hover:bg-rose-600 text-white shadow-xl shadow-rose-950/70 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>შემდეგი სვლა</span>
            <ArrowRight className="w-4 h-4 text-rose-200 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
};
