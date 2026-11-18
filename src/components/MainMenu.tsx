import React from 'react';
import { Play, Volume2, VolumeX, Trophy, Coins, Compass } from 'lucide-react';

interface MainMenuProps {
  bestScore: number;
  totalCoins: number;
  isMuted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  bestScore,
  totalCoins,
  isMuted,
  onStart,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 bg-gradient-to-b from-arcade-dark/95 via-arcade-surface/90 to-arcade-dark/95 backdrop-blur-sm select-none text-white">
      {/* Top Header & Branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
            MotoFlexing Games
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-full bg-arcade-card hover:bg-slate-700/80 active:scale-95 transition-transform border border-arcade-border text-slate-300 hover:text-white"
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} className="text-rose-400" /> : <Volume2 size={20} className="text-cyan-400" />}
        </button>
      </div>

      {/* Main Title & Hero Banner */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="relative mb-3">
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
            TRAFFIC
          </h1>
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)] -mt-2">
            ESCAPE
          </h1>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 font-mono tracking-wide max-w-xs mb-8">
          High-Speed Endless Highway Dodge. Weave through traffic, grab coins, and chain near misses!
        </p>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
          {/* Best Score */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-arcade-card/80 border border-arcade-border/80 shadow-inner">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mb-1">
              <Trophy size={14} className="text-yellow-400" />
              <span>RECORD</span>
            </div>
            <span className="text-xl font-bold font-mono text-yellow-400">{bestScore}</span>
          </div>

          {/* Total Coins */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-arcade-card/80 border border-arcade-border/80 shadow-inner">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mb-1">
              <Coins size={14} className="text-amber-400" />
              <span>WALLET</span>
            </div>
            <span className="text-xl font-bold font-mono text-amber-300">{totalCoins}</span>
          </div>
        </div>

        {/* Big Arcade Start Button */}
        <button
          onClick={onStart}
          className="group relative w-full max-w-xs py-4 px-8 rounded-2xl font-black text-xl tracking-wider uppercase text-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] active:scale-95 transition-all overflow-hidden flex items-center justify-center gap-3"
        >
          <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          <Play size={24} className="fill-black" />
          <span>START RACE</span>
        </button>
      </div>

      {/* Footer Controls Guide */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-arcade-border/40 text-center">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Compass size={14} className="text-cyan-400" />
          <span>SWIPE LEFT / RIGHT OR USE ARROW KEYS</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          V1.0.0 Production Release &bull; 60 FPS Engine
        </span>
      </div>
    </div>
  );
};

