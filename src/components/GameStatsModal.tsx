import React from 'react';
import {
  X,
  Trophy,
  Flame,
  HelpCircle,
  Zap,
  RotateCcw,
  Crown,
  Heart,
  TrendingUp,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Player, RoomStats, CompletedQuestionRecord } from '../types';
import { soundEffects } from '../utils/audio';

interface GameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  players: Player[];
  stats?: RoomStats;
  history?: CompletedQuestionRecord[];
}

export const GameStatsModal: React.FC<GameStatsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  players,
  stats,
  history = [],
}) => {
  if (!isOpen) return null;

  // Derive truths and dares completed
  // 1. From room stats if available
  // 2. Or summed up from individual player counts
  // 3. Or derived from completed question history
  const historyTruths = history.filter((h) => h.category === 'სიმართლე').length;
  const historyDares = history.filter((h) => h.category === 'მოქმედება').length;

  const playerTruthsSum = players.reduce((sum, p) => sum + (p.truthsCompleted || 0), 0);
  const playerDaresSum = players.reduce((sum, p) => sum + (p.daresCompleted || 0), 0);
  const playerSpinsSum = players.reduce((sum, p) => sum + (p.spinsCount || 0), 0);

  const truthsCount = Math.max(stats?.truthsCompleted || 0, playerTruthsSum, historyTruths);
  const daresCount = Math.max(stats?.daresCompleted || 0, playerDaresSum, historyDares);
  const totalSpins = Math.max(stats?.totalSpins || 0, playerSpinsSum, truthsCount + daresCount);
  const totalCompleted = truthsCount + daresCount;

  // Percentage calculations
  const truthPercent = totalCompleted > 0 ? Math.round((truthsCount / totalCompleted) * 100) : 50;
  const darePercent = totalCompleted > 0 ? 100 - truthPercent : 50;

  // Determine Most Active Player:
  // Activity score = (truthsCompleted * 2) + (daresCompleted * 3) + (spinsCount * 1) + (score * 2)
  const rankedPlayers = [...players].map((p) => {
    const pTruths = p.truthsCompleted || 0;
    const pDares = p.daresCompleted || 0;
    const pSpins = p.spinsCount || 0;
    const pScore = p.score || 0;
    const totalActivity = pTruths + pDares + pSpins + pScore;
    const weightedPoints = (pTruths * 2) + (pDares * 3) + (pSpins * 1) + (pScore * 2);

    return {
      ...p,
      truths: pTruths,
      dares: pDares,
      spins: pSpins,
      totalActivity,
      weightedPoints,
    };
  }).sort((a, b) => {
    if (b.weightedPoints !== a.weightedPoints) return b.weightedPoints - a.weightedPoints;
    return b.totalActivity - a.totalActivity;
  });

  const mostActivePlayer = rankedPlayers.length > 0 ? rankedPlayers[0] : null;
  const hasActivity = Boolean(
    mostActivePlayer && (mostActivePlayer.totalActivity > 0 || totalCompleted > 0 || totalSpins > 0)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-slate-900 via-rose-950/40 to-slate-950 border-2 border-rose-500/40 p-4 sm:p-6 shadow-2xl shadow-rose-950/80 my-auto text-rose-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playHeartSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-900/80 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/40 transition-all active:scale-95 cursor-pointer"
          title="დახურვა"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-rose-900/40">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/40 ring-2 ring-amber-400/40">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 id="stats-modal-title" className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>მაგიდის სტატისტიკა</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/60 text-pink-300 border border-rose-700/40 font-mono">
                #{roomId}
              </span>
            </h2>
            <p className="text-xs text-rose-300/80">
              სიმართლე vs მოქმედება და ყველაზე აქტიური მოთამაშე
            </p>
          </div>
        </div>

        {/* 1. Truths vs Dares Big Comparative Arena */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-rose-900/50 mb-4 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>სიმართლე (Truths)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <span>მოქმედება (Dares)</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          {/* Dual Score Cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Truths Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 to-purple-950/60 border border-indigo-500/40 text-center relative overflow-hidden">
              <div className="absolute top-1 right-2 text-indigo-400/20 text-4xl font-black select-none pointer-events-none">
                ?
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono drop-shadow">
                {truthsCount}
              </div>
              <div className="text-[11px] font-semibold text-indigo-300 mt-0.5">
                შესრულებული
              </div>
              <div className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                {totalCompleted > 0 ? `${truthPercent}%` : '0%'}
              </div>
            </div>

            {/* Dares Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-950/80 to-rose-950/60 border border-amber-500/40 text-center relative overflow-hidden">
              <div className="absolute top-1 right-2 text-amber-400/20 text-4xl font-black select-none pointer-events-none">
                🔥
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono drop-shadow">
                {daresCount}
              </div>
              <div className="text-[11px] font-semibold text-amber-300 mt-0.5">
                შესრულებული
              </div>
              <div className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30">
                {totalCompleted > 0 ? `${darePercent}%` : '0%'}
              </div>
            </div>
          </div>

          {/* Visual Ratio Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-3 rounded-full bg-slate-900 border border-rose-900/60 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                style={{ width: `${totalCompleted === 0 ? 50 : truthPercent}%` }}
                title={`სიმართლე: ${truthPercent}%`}
              />
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                style={{ width: `${totalCompleted === 0 ? 50 : darePercent}%` }}
                title={`მოქმედება: ${darePercent}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-rose-300/70 font-medium px-1">
              <span>{totalCompleted > 0 ? `${truthPercent}% სიმართლე` : 'სიმართლე'}</span>
              <span>სულ: {totalCompleted} შეკითხვა</span>
              <span>{totalCompleted > 0 ? `${darePercent}% მოქმედება` : 'მოქმედება'}</span>
            </div>
          </div>
        </div>

        {/* 2. Most Active Player Spotlight Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-rose-950/60 to-purple-950/50 border-2 border-amber-500/50 mb-4 shadow-lg shadow-amber-950/30 relative overflow-hidden">
          {/* Decorative Corner Crown */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wide">
              <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
              <span>ყველაზე აქტიური მოთამაშე</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-200/90 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>MVP</span>
            </span>
          </div>

          {mostActivePlayer ? (
            <div className="flex items-center gap-3.5">
              {/* Avatar with Animated Crown/Glow */}
              <div className="relative shrink-0">
                <img
                  src={mostActivePlayer.avatar}
                  alt={mostActivePlayer.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-amber-400 shadow-xl shadow-amber-950/60"
                />
                <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950 shadow-md ring-2 ring-slate-950">
                  <Crown className="w-3.5 h-3.5 fill-slate-950" />
                </div>
              </div>

              {/* Player Details & Activity Breakdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    {mostActivePlayer.name}
                  </h3>
                  {mostActivePlayer.isHost && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-700/50">
                      მასპინძელი
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-300/80 truncate mb-1.5">
                  {mostActivePlayer.status}
                </p>

                {/* Badges / Metrics */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-200 border border-indigo-700/40 font-semibold flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-indigo-400" />
                    <span>{mostActivePlayer.truths} სიმართლე</span>
                  </span>

                  <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 text-amber-200 border border-amber-700/40 font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{mostActivePlayer.dares} მოქმედება</span>
                  </span>

                  {mostActivePlayer.spins > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-pink-950/80 text-pink-200 border border-pink-700/40 font-semibold flex items-center gap-1">
                      <RotateCcw className="w-3 h-3 text-pink-400" />
                      <span>{mostActivePlayer.spins} დატრიალება</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-rose-300/70">
              მოთამაშეები ჯერ არ არიან დამატებული
            </div>
          )}

          {!hasActivity && (
            <p className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2 rounded-xl border border-amber-800/30 mt-3 text-center">
              💡 დაატრიალეთ ბოთლი და შეასრულეთ კითხვები ქულების დასაგროვებლად!
            </p>
          )}
        </div>

        {/* 3. Room Summary Quick Counters */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-rose-900/40">
            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium">
              <RotateCcw className="w-3 h-3 text-pink-400" />
              <span>დატრიალება</span>
            </div>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {totalSpins}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-rose-900/40">
            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>სულ შესრულდა</span>
            </div>
            <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
              {totalCompleted}
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-rose-900/40">
            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium">
              <Users className="w-3 h-3 text-amber-400" />
              <span>მოთამაშეები</span>
            </div>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
              {players.length}
            </div>
          </div>
        </div>

        {/* 4. Leaderboard / All Players Ranked List */}
        {rankedPlayers.length > 1 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
              <span>აქტივობის რეიტინგი</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {rankedPlayers.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                    idx === 0
                      ? 'bg-amber-950/40 border border-amber-500/40 text-amber-100'
                      : 'bg-slate-950/50 border border-rose-950/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center font-bold font-mono text-rose-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-rose-400/40 shrink-0"
                    />
                    <span className="font-bold truncate max-w-[120px] sm:max-w-[160px] text-white">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    <span className="text-indigo-300" title="სიმართლე">
                      {p.truths}?
                    </span>
                    <span className="text-amber-300" title="მოქმედება">
                      {p.dares}🔥
                    </span>
                    <span className="font-bold text-white bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800/40">
                      {p.totalActivity} სვლა
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button at Bottom */}
        <button
          type="button"
          onClick={() => {
            soundEffects.playHeartSound();
            onClose();
          }}
          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-950 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4 text-amber-300" />
          <span>გასაგებია</span>
        </button>
      </div>
    </div>
  );
};
