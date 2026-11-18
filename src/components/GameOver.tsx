import React from 'react';
import { RotateCcw, Home, Trophy, Coins, Award } from 'lucide-react';

interface GameOverProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  coinsEarned: number;
  totalCoins: number;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  score,
  bestScore,
  isNewBest,
  coinsEarned,
  totalCoins,
  onRetry,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-arcade-dark/90 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="w-full max-w-xs flex flex-col items-center bg-arcade-card/95 border border-arcade-border rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Top glowing accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

        {/* Header */}
        <h2 className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-red-400 to-orange-500 mt-2 mb-1 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          CRASHED!
        </h2>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6">
          Race Terminated
        </span>

        {/* New Best Badge */}
        {isNewBest && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg mb-4 animate-bounce">
            <Award size={15} />
            <span>NEW BEST RECORD!</span>
          </div>
        )}

        {/* Score & Coins Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          {/* Final Score */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-arcade-surface/90 border border-arcade-border/80">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Score</span>
            <span className="text-2xl font-black font-mono text-white mt-0.5">{score}</span>
          </div>

          {/* Record */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-arcade-surface/90 border border-arcade-border/80">
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
              <Trophy size={12} className="text-yellow-400" />
              <span>Record</span>
            </div>
            <span className="text-2xl font-black font-mono text-yellow-400 mt-0.5">{bestScore}</span>
          </div>

          {/* Coins Earned */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-arcade-surface/90 border border-arcade-border/80">
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
              <Coins size={12} className="text-amber-400" />
              <span>Collected</span>
            </div>
            <span className="text-lg font-bold font-mono text-amber-300 mt-0.5">+{coinsEarned}</span>
          </div>

          {/* Total Bank */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-arcade-surface/90 border border-arcade-border/80">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Wallet</span>
            <span className="text-lg font-bold font-mono text-slate-200 mt-0.5">{totalCoins}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {/* Retry */}
          <button
            onClick={onRetry}
            className="w-full py-3.5 px-4 rounded-xl font-black font-game text-lg tracking-wider uppercase text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} className="stroke-[2.5]" />
            <span>PLAY AGAIN</span>
          </button>

          {/* Home */}
          <button
            onClick={onHome}
            className="w-full py-3 px-4 rounded-xl font-bold font-game tracking-wider uppercase text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/60 flex items-center justify-center gap-2"
          >
            <Home size={18} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

