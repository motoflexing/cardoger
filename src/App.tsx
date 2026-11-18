import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { audioManager } from './game/AudioManager';
import { GameState, GameHUDState } from './types/game';
import { MainMenu } from './components/MainMenu';
import { GameHUD } from './components/GameHUD';
import { PauseMenu } from './components/PauseMenu';
import { GameOver } from './components/GameOver';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [hudState, setHudState] = useState<GameHUDState>({
    score: 0,
    bestScore: 0,
    coins: 0,
    totalCoins: 0,
    combo: 0,
    difficulty: 'EASY',
    survivalTime: 0
  });

  const [gameOverStats, setGameOverStats] = useState<{
    score: number;
    bestScore: number;
    isNewBest: boolean;
    coinsEarned: number;
    totalCoins: number;
  }>({
    score: 0,
    bestScore: 0,
    isNewBest: false,
    coinsEarned: 0,
    totalCoins: 0
  });

  const [isMuted, setIsMuted] = useState<boolean>(audioManager.getMuted());

  // Initialize GameEngine once canvas is mounted
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (newState) => {
        setGameState(newState);
      },
      onHUDUpdate: (newHud) => {
        setHudState(newHud);
      },
      onGameOver: (finalScore, isNewBest, coinsEarned) => {
        setGameOverStats({
          score: finalScore,
          bestScore: engine.score.getBestScore(),
          isNewBest,
          coinsEarned,
          totalCoins: engine.score.getTotalCoins()
        });
      }
    });

    engineRef.current = engine;

    // Load initial storage stats for menu
    setHudState((prev) => ({
      ...prev,
      bestScore: engine.score.getBestScore(),
      totalCoins: engine.score.getTotalCoins()
    }));

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startReady();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restart();
  }, []);

  const handleHome = useCallback(() => {
    engineRef.current?.goToMenu();
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = audioManager.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  return (
    <div className="w-full h-[100dvh] flex items-center justify-center bg-black overflow-hidden select-none">
      <main className="h-[100dvh] w-full max-w-[440px] mx-auto relative overflow-hidden bg-arcade-dark border-x border-arcade-border/30 flex flex-col">
        {/* Single Canvas Game World */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer touch-none"
          tabIndex={0}
          aria-label="Traffic Escape game canvas"
        />

        {/* HUD Overlay (Only visible during active gameplay) */}
        {(gameState === 'PLAYING' || gameState === 'READY') && (
          <GameHUD hud={hudState} onPause={handlePause} />
        )}

        {/* Main Menu Overlay */}
        {gameState === 'MENU' && (
          <MainMenu
            bestScore={hudState.bestScore}
            totalCoins={hudState.totalCoins}
            isMuted={isMuted}
            onStart={handleStartGame}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Pause Menu Overlay */}
        {gameState === 'PAUSED' && (
          <PauseMenu
            onResume={handleResume}
            onRestart={handleRestart}
            onHome={handleHome}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAME_OVER' && (
          <GameOver
            score={gameOverStats.score}
            bestScore={gameOverStats.bestScore}
            isNewBest={gameOverStats.isNewBest}
            coinsEarned={gameOverStats.coinsEarned}
            totalCoins={gameOverStats.totalCoins}
            onRetry={handleRestart}
            onHome={handleHome}
          />
        )}
      </main>
    </div>
  );
};
