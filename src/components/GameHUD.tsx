import React from 'react';
import { GameHUDState } from '../types/game';
import { Pause, Trophy, Coins, Flame } from 'lucide-react';

interface GameHUDProps {
  hud: GameHUDState;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hud, onPause }) => {
  return (
    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none select-none z-10 flex flex-col gap-2">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Score & Combo */}
        <div className="flex items-center gap-2 bg-arcade-dark/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-arcade-border/80 shadow-lg">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase leading-tight">Score</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight leading-none">{hud.score}</span>
          </div>

          {hud.combo > 1 && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs px-2 py-0.5 rounded-full shadow animate-pulse">
              <Flame size={13} className="text-black" />
              <span>{hud.combo}x</span>
            </div>
          )}
        </div>

        {/* Center: Best Score */}
        <div className="hidden sm:flex items-center gap-1.5 bg-arcade-dark/80 backdrop-blur-md px-3 py-1 rounded-full border border-arcade-border/60 text-xs font-mono text-slate-300">
          <Trophy size={14} className="text-yellow-400" />
          <span className="text-slate-400">BEST:</span>
          <span className="font-bold text-yellow-400">{hud.bestScore}</span>
        </div>

        {/* Right side: Coins & Pause button */}
        <div className="flex items-center gap-2">
          {/* Run Coins */}
          <div className="flex items-center gap-1.5 bg-arcade-dark/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-arcade-border/80 shadow-lg">
            <Coins size={16} className="text-amber-400 animate-bounce-subtle" />
            <span className="text-base font-bold font-mono text-amber-300 leading-none">{hud.coins}</span>
          </div>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="pointer-events-auto p-2 bg-arcade-dark/85 hover:bg-slate-800 active:scale-95 transition-transform backdrop-blur-md rounded-full border border-arcade-border/80 text-slate-300 hover:text-white shadow-lg"
            aria-label="Pause game"
          >
            <Pause size={18} />
          </button>
        </div>
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-black/40 text-cyan-400 border border-cyan-500/30">
          {hud.difficulty}
        </span>
        <span className="text-[11px] font-mono text-slate-400">
          {hud.survivalTime}s
        </span>
      </div>
    </div>
  );
};

