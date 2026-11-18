import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onHome,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-arcade-dark/85 backdrop-blur-md select-none text-white">
      <div className="w-full max-w-xs flex flex-col items-center bg-arcade-card/90 border border-arcade-border/80 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-3xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 drop-shadow">
          PAUSED
        </h2>

        {/* Buttons List */}
        <div className="flex flex-col gap-3 w-full mb-6">
          {/* Resume */}
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-xl font-bold font-game tracking-wider uppercase text-black bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Play size={18} className="fill-black" />
            <span>RESUME</span>
          </button>

          {/* Restart */}
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-xl font-bold font-game tracking-wider uppercase text-white bg-slate-700/80 hover:bg-slate-700 active:scale-95 transition-all border border-slate-600 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            <span>RESTART</span>
          </button>

          {/* Main Menu */}
          <button
            onClick={onHome}
            className="w-full py-3 px-4 rounded-xl font-bold font-game tracking-wider uppercase text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/60 flex items-center justify-center gap-2"
          >
            <Home size={18} />
            <span>MAIN MENU</span>
          </button>
        </div>

        {/* Sound toggle footer */}
        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-slate-200 py-1 px-3 rounded-full border border-arcade-border/60 bg-arcade-dark/50"
        >
          {isMuted ? <VolumeX size={15} className="text-rose-400" /> : <Volume2 size={15} className="text-cyan-400" />}
          <span>{isMuted ? 'AUDIO: OFF' : 'AUDIO: ON'}</span>
        </button>
      </div>
    </div>
  );
};

