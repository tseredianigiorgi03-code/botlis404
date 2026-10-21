import React from 'react';
import { Player } from '../types';
import { Sparkles, UserPlus, X, RefreshCw, Flame } from 'lucide-react';
import { BOT_CANDIDATES } from '../data/defaultQuestions';
import { soundEffects } from '../utils/audio';

interface BottleCircleProps {
  players: Player[];
  currentTurnIndex: number;
  bottleAngle: number;
  isSpinning: boolean;
  spinnerPlayerId: string | null;
  targetPlayerId: string | null;
  myPlayerId: string;
  activeQuestion?: { text: string; category: string } | null;
  onSpin: () => void;
  onAddBot: (bot: { name: string; avatar: string; status: string; bio: string }) => void;
  onRemovePlayer: (playerId: string) => void;
  onSelectPlayerForReaction: (targetPlayer: Player) => void;
}

export const BottleCircle: React.FC<BottleCircleProps> = ({
  players,
  currentTurnIndex,
  bottleAngle,
  isSpinning,
  spinnerPlayerId,
  targetPlayerId,
  myPlayerId,
  activeQuestion,
  onSpin,
  onAddBot,
  onRemovePlayer,
  onSelectPlayerForReaction,
}) => {
  const currentSpinner = players[currentTurnIndex] || players[0];
  const isMyTurn = currentSpinner?.id === myPlayerId;
  const targetPlayer = !isSpinning && targetPlayerId ? players.find((p) => p.id === targetPlayerId) : null;

  const handleAddRandomCompanion = () => {
    // Pick candidate not yet at table
    const existingNames = new Set(players.map((p) => p.name));
    const available = BOT_CANDIDATES.filter((b) => !existingNames.has(b.name));
    const pick = available.length > 0 ? available[0] : BOT_CANDIDATES[Math.floor(Math.random() * BOT_CANDIDATES.length)];
    soundEffects.playHeartSound();
    onAddBot(pick);
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-1 sm:py-2 px-1 select-none">
      {/* Turn & Status Indicator Banner (Displays active state or question directly at table level) */}
      <div className="mb-2 sm:mb-3 text-center z-10 max-w-lg w-full px-2">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-rose-800/60 backdrop-blur-md shadow-lg shadow-rose-950/60 max-w-full">
          {isSpinning ? (
            <>
              <RefreshCw className="w-4 h-4 text-rose-400 animate-spin shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-rose-200 truncate">
                ბოთლი ტრიალებს... ვის აირჩევს ბედი? 💘
              </span>
            </>
          ) : targetPlayer && activeQuestion ? (
            <>
              <Flame className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-rose-100 truncate">
                <strong className="text-pink-400 underline decoration-pink-500">{targetPlayer.name}</strong>: „{activeQuestion.text}“
              </span>
            </>
          ) : targetPlayer ? (
            <>
              <Flame className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-rose-100 truncate">
                ბოთლმა მიუთითა: <strong className="text-pink-400 underline decoration-pink-500">{targetPlayer.name}</strong>-ზე!
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-rose-100 truncate">
                {isMyTurn ? (
                  <span className="text-amber-300 font-bold">შენი ჯერია! დაატრიალე ბოთლი ✨</span>
                ) : (
                  <span><strong>{currentSpinner?.name}</strong>-ს ჯერია ბოთლის დატრიალება 🥂</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Circle Container (Table and Players) - Compact to avoid any page scrolling on phones */}
      <div className="relative w-[300px] h-[300px] xs:w-[340px] xs:h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] flex items-center justify-center">
        {/* Table Background Layer with Romantic Glow and Velvet Wood Texture */}
        <div className="absolute inset-8 sm:inset-12 rounded-full bg-gradient-to-tr from-[#2d071b] via-[#4a0d2a] to-[#200413] border-4 border-rose-900/60 shadow-[0_0_60px_rgba(244,63,94,0.35)] flex items-center justify-center overflow-hidden">
          {/* Subtle concentric rings like a wine barrel / table top */}
          <div className="absolute inset-3 sm:inset-5 rounded-full border border-rose-500/20" />
          <div className="absolute inset-8 sm:inset-12 rounded-full border border-rose-500/15" />
          <div className="absolute inset-16 sm:inset-22 rounded-full border border-rose-500/10" />

          {/* Candle / Ambient Center Light */}
          <div className="absolute w-36 h-36 sm:w-52 sm:h-52 rounded-full bg-radial from-rose-500/25 via-pink-600/10 to-transparent blur-xl pointer-events-none" />

          {/* Rose petals decorative emojis scattered */}
          <span className="absolute top-[18%] left-[24%] text-base opacity-40 select-none pointer-events-none">🌹</span>
          <span className="absolute bottom-[22%] right-[20%] text-sm opacity-40 select-none pointer-events-none">✨</span>
          <span className="absolute top-[28%] right-[22%] text-xs opacity-35 select-none pointer-events-none">💖</span>
          <span className="absolute bottom-[24%] left-[26%] text-sm opacity-35 select-none pointer-events-none">🍷</span>
        </div>

        {/* Center Spinning Bottle */}
        <div
          onClick={() => {
            if (!isSpinning) {
              onSpin();
            }
          }}
          className={`relative z-20 cursor-pointer flex items-center justify-center transition-all ${
            isSpinning ? 'cursor-wait' : 'hover:scale-105 active:scale-95'
          }`}
          style={{
            transform: `rotate(${bottleAngle}deg)`,
            transition: isSpinning
              ? 'transform 3.5s cubic-bezier(0.12, 0.85, 0.28, 1)'
              : 'transform 0.3s ease-out',
          }}
          title={isSpinning ? 'ბოთლი ტრიალებს...' : 'დააწკაპუნე ბოთლს დასატრიალებლად!'}
        >
          {/* Realistic SVG Glass Bottle */}
          <svg
            viewBox="0 0 100 240"
            className="w-14 sm:w-20 h-36 sm:h-52 drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] filter"
          >
            <defs>
              <linearGradient id="bottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e3a1f" />
                <stop offset="25%" stopColor="#2e7d32" />
                <stop offset="50%" stopColor="#4caf50" />
                <stop offset="75%" stopColor="#2e7d32" />
                <stop offset="100%" stopColor="#0e2310" />
              </linearGradient>
              <linearGradient id="bottleWine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b0716" />
                <stop offset="35%" stopColor="#881337" />
                <stop offset="65%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#1e040a" />
              </linearGradient>
              <linearGradient id="glassShine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="labelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>

            {/* Pointer Indicator Arrow at top of bottle neck */}
            <polygon points="50,2 43,18 57,18" fill="#f43f5e" className="animate-pulse" />

            {/* Cork */}
            <rect x="44" y="10" width="12" height="12" rx="2" fill="#d97706" />

            {/* Bottle Neck Ring */}
            <rect x="42" y="22" width="16" height="6" rx="2" fill="url(#labelGold)" />

            {/* Bottle Neck */}
            <path
              d="M 44 28 L 44 80 C 44 100 25 115 25 135 L 25 220 C 25 230 35 235 50 235 C 65 235 75 230 75 220 L 75 135 C 75 115 56 100 56 80 L 56 28 Z"
              fill="url(#bottleWine)"
              stroke="#fb7185"
              strokeWidth="1.5"
            />

            {/* Wine Level Inner */}
            <path
              d="M 27 140 L 27 218 C 27 227 36 232 50 232 C 64 232 73 227 73 218 L 73 140 Z"
              fill="#4c0519"
              opacity="0.85"
            />

            {/* Romantic Label */}
            <rect x="31" y="145" width="38" height="52" rx="4" fill="url(#labelGold)" stroke="#78350f" strokeWidth="1" />
            <text x="50" y="162" textAnchor="middle" fontSize="10" fill="#78350f" fontWeight="bold">
              LOVE
            </text>
            {/* Heart symbol on label */}
            <path
              d="M 50 176 C 45 168 36 172 38 180 C 40 186 50 193 50 193 C 50 193 60 186 62 180 C 64 172 55 168 50 176 Z"
              fill="#be123c"
            />

            {/* Glass Reflection Streak */}
            <path
              d="M 46 30 L 46 80 C 46 95 31 110 31 130 L 31 220"
              stroke="url(#glassShine)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Players Arranged in a Circle Around the Table */}
        {players.map((player, index) => {
          const total = players.length;
          // Calculate angle for player in radians
          // 0 index at top (-PI/2)
          const angleRad = (index / total) * 2 * Math.PI - Math.PI / 2;
          
          // Radius in percentage or pixels: relative to container center
          // Scale based on total players
          const isSelectedTarget = !isSpinning && !!targetPlayerId && targetPlayerId === player.id;
          const isCurrentSpinner = currentSpinner?.id === player.id;
          const isMe = player.id === myPlayerId;

          return (
            <div
              key={player.id}
              className="absolute transition-all duration-500 z-30"
              style={{
                top: `calc(50% + ${Math.sin(angleRad) * 44}%)`,
                left: `calc(50% + ${Math.cos(angleRad) * 44}%)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex flex-col items-center group">
                {/* Target Selected Spotlight Halo */}
                {isSelectedTarget && (
                  <div className="absolute -inset-3 sm:-inset-4 rounded-full bg-pink-500/40 animate-ping pointer-events-none" />
                )}

                {/* Avatar Button */}
                <button
                  type="button"
                  onClick={() => onSelectPlayerForReaction(player)}
                  className={`relative rounded-full transition-transform active:scale-95 ${
                    isSelectedTarget
                      ? 'ring-4 ring-pink-400 ring-offset-2 ring-offset-slate-950 scale-110 shadow-[0_0_30px_rgba(244,63,94,0.9)] animate-bounce'
                      : isCurrentSpinner
                      ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.7)]'
                      : 'ring-2 ring-rose-500/40 hover:ring-rose-400 hover:scale-105 shadow-md'
                  }`}
                  title={`${player.name} (${player.status}) - დააწკაპუნე სიყვარულის რეაქციის გასაგზავნად`}
                >
                  <img
                    src={player.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80'}
                    alt={player.name}
                    className="w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full object-cover"
                  />

                  {/* Status Badge Pin */}
                  {isSelectedTarget ? (
                    <span className="absolute -top-2 -right-1 bg-pink-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold shadow ring-1 ring-slate-950 flex items-center gap-0.5">
                      💘 რჩეული
                    </span>
                  ) : isCurrentSpinner ? (
                    <span className="absolute -top-2 -right-1 bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black shadow ring-1 ring-slate-950">
                      ტრიალებს 🔄
                    </span>
                  ) : null}

                  {/* Me badge */}
                  {isMe && (
                    <span className="absolute -bottom-1 -left-1 bg-rose-600 text-white text-[9px] px-1 rounded-full font-bold shadow">
                      შენ
                    </span>
                  )}

                  {/* Bot indicator & remove bot button */}
                  {player.isBot && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlayer(player.id);
                      }}
                      className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center shadow transition-colors"
                      title="მოთამაშის წაშლა მაგიდიდან"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </button>

                {/* Player Name and Relationship Tag */}
                <div className="mt-1 text-center max-w-[70px] xs:max-w-[80px] sm:max-w-[95px]">
                  <div className={`text-[11px] sm:text-xs font-bold truncate leading-tight ${
                    isSelectedTarget ? 'text-pink-300 drop-shadow' : isMe ? 'text-rose-200' : 'text-slate-200'
                  }`}>
                    {player.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-rose-300/70 truncate">
                    {player.status.split(' ')[0]}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Spin Action & Companions Controls - Compact and directly below table */}
      <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 z-20">
        <button
          type="button"
          onClick={() => {
            soundEffects.playHeartSound();
            onSpin();
          }}
          disabled={isSpinning || players.length < 2}
          className={`px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer ${
            isSpinning
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:to-pink-500 text-white border border-rose-400/40 shadow-rose-950/80 glow-romantic hover:scale-105'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>დაატრიალე ბოთლი! 🍾</span>
        </button>

        {/* Add Companion Bot Button */}
        {players.length < 8 && (
          <button
            type="button"
            onClick={handleAddRandomCompanion}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/40 text-rose-200 border border-rose-800/50 shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="დაამატე ქართველი კომპანიონი მაგიდასთან სათამაშოდ"
          >
            <UserPlus className="w-3.5 h-3.5 text-pink-400" />
            <span>+ მოთამაშე</span>
          </button>
        )}
      </div>

      {players.length < 2 && (
        <p className="mt-2 text-xs text-amber-300 bg-amber-950/50 border border-amber-800/40 px-3 py-1 rounded-xl">
          ბოთლის დასატრიალებლად დააჭირე "+ მოთამაშის დამატება" ან გაუგზავნე ბმული მეგობარს!
        </p>
      )}
    </div>
  );
};
