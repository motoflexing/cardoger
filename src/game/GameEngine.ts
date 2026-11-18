import {
  GameState,
  GameHUDState,
  GameEngineCallbacks,
  GAME_CONSTANTS,
  TrafficVehicle,
  ParticleEntity,
  FloatingPopup
} from '../types/game';
import { Road } from './Road';
import { Player } from './Player';
import { TrafficManager } from './TrafficManager';
import { CoinManager } from './CoinManager';
import { DifficultyManager } from './DifficultyManager';
import { ScoreManager } from './ScoreManager';
import { Collision } from './Collision';
import { InputManager } from './InputManager';
import { audioManager } from './AudioManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  // Subsystems
  public road: Road;
  public player: Player;
  public traffic: TrafficManager;
  public coins: CoinManager;
  public difficulty: DifficultyManager;
  public score: ScoreManager;
  public input: InputManager;

  // State
  private state: GameState = 'MENU';
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  // Fixed timestep physics loop
  private readonly FIXED_STEP: number = 1 / 60; // 16.666ms
  private accumulator: number = 0;
  private lastTime: number = 0;

  // HUD throttling (send to React at 10 Hz or on critical change)
  private lastHUDUpdate: number = 0;
  private readonly HUD_UPDATE_INTERVAL: number = 0.1; // 100ms

  // Screen shake
  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  // Object pools for visual FX (zero GC allocations during gameplay)
  private particlePool: ParticleEntity[] = [];
  private activeParticles: ParticleEntity[] = [];

  private popupPool: FloatingPopup[] = [];
  private activePopups: FloatingPopup[] = [];

  // Canvas scaling & actual CSS viewport dimensions
  public width: number = GAME_CONSTANTS.CANVAS_WIDTH;
  public height: number = GAME_CONSTANTS.CANVAS_HEIGHT;
  private dpr: number = 1;
  private resizeObserver: ResizeObserver | null = null;

  // Crash guard to ensure crash runs at most once
  private hasCrashed: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to acquire 2D canvas context');
    }
    this.ctx = context;
    this.callbacks = callbacks;

    // Subsystem instances
    this.road = new Road();
    this.player = new Player(this.road, () => {
      audioManager.playLaneSwitch();
    });
    this.traffic = new TrafficManager(this.road, 30);
    this.coins = new CoinManager(this.road, 25);
    this.difficulty = new DifficultyManager();
    this.score = new ScoreManager();

    this.input = new InputManager({
      onLaneChange: (dir) => this.handleLaneChange(dir),
      onPauseToggle: () => this.handlePauseToggle(),
      onActionStart: () => this.handleActionStart()
    });

    this.initPools();
    this.setupListeners();
    this.resizeCanvas();

    // Start loop
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  private initPools(): void {
    // 60 particles in pool
    for (let i = 0; i < 60; i++) {
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#ffffff',
        alpha: 1,
        size: 4,
        life: 0,
        maxLife: 1,
        shape: 'circle'
      });
    }

    // 15 floating popups in pool
    for (let i = 0; i < 15; i++) {
      this.popupPool.push({
        active: false,
        text: '',
        x: 0,
        y: 0,
        alpha: 1,
        scale: 1,
        color: '#ffffff',
        life: 0,
        maxLife: 1.2
      });
    }
  }

  private setupListeners(): void {
    this.input.attach(this.canvas);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.canvas);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.input.detach();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
  }

  private handleResize = (): void => {
    this.resizeCanvas();
  };

  private handleVisibilityChange = (): void => {
    // Auto-pause if active when switching tabs
    if (document.hidden && this.state === 'PLAYING') {
      this.setState('PAUSED');
    }
  };

  private handleWindowBlur = (): void => {
    if (this.state === 'PLAYING') {
      this.setState('PAUSED');
    }
  };

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);

    this.width = rect.width;
    this.height = rect.height;

    this.road.updateDimensions(this.width, this.height);
    this.player.updateDimensions(this.width, this.height);
  }

  // --- State Machine Transitions ---
  public setState(newState: GameState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);

    if (newState === 'PLAYING') {
      this.lastTime = performance.now();
      this.accumulator = 0;
    }
  }

  public startReady(): void {
    audioManager.initOnGesture();
    audioManager.playClick();
    this.resetWorld();
    this.setState('READY');
  }

  public startPlaying(): void {
    audioManager.initOnGesture();
    audioManager.playStart();
    this.setState('PLAYING');
  }

  public resume(): void {
    if (this.state === 'PAUSED') {
      audioManager.playClick();
      this.setState('PLAYING');
    }
  }

  public pause(): void {
    if (this.state === 'PLAYING') {
      audioManager.playClick();
      this.setState('PAUSED');
    }
  }

  public restart(): void {
    audioManager.playClick();
    this.resetWorld();
    this.startPlaying();
  }

  public goToMenu(): void {
    audioManager.playClick();
    this.resetWorld();
    this.setState('MENU');
  }

  private resetWorld(): void {
    this.hasCrashed = false;
    this.player.reset(this.height);
    this.traffic.reset();
    this.coins.reset();
    this.difficulty.reset();
    this.score.resetRun();
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Reset particles
    for (const p of this.activeParticles) {
      p.active = false;
      this.particlePool.push(p);
    }
    this.activeParticles.length = 0;

    // Reset popups
    for (const pop of this.activePopups) {
      pop.active = false;
      this.popupPool.push(pop);
    }
    this.activePopups.length = 0;

    this.emitHUDUpdate();
  }

  // --- Input Handlers ---
  private handleLaneChange(direction: -1 | 1): void {
    if (this.state === 'READY') {
      this.startPlaying();
      this.player.requestLaneChange(direction);
    } else if (this.state === 'PLAYING') {
      this.player.requestLaneChange(direction);
    }
  }

  private handlePauseToggle(): void {
    if (this.state === 'PLAYING') {
      this.pause();
    } else if (this.state === 'PAUSED') {
      this.resume();
    }
  }

  private handleActionStart(): void {
    if (this.state === 'MENU') {
      this.startReady();
    } else if (this.state === 'READY') {
      this.startPlaying();
    }
  }

  // --- Game Loop (Fixed Timestep + Accumulator) ---
  private gameLoop = (currentTime: number): void => {
    if (this.isDestroyed) return;

    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp dt to prevent spiral of death
    if (dt > 0.25) dt = 0.25;

    if (this.state === 'PLAYING') {
      this.accumulator += dt;
      while (this.accumulator >= this.FIXED_STEP) {
        this.physicsStep(this.FIXED_STEP);
        this.accumulator -= this.FIXED_STEP;
      }
    } else if (this.state === 'READY') {
      // Gentle idle road scroll in READY state so it looks alive
      this.road.update(dt, 160);
      this.player.update(dt);
      this.updateParticles(dt);
    }

    // Render pass
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private physicsStep(step: number): void {
    if (this.hasCrashed) return;

    // 1. Difficulty progression
    const survivalTime = this.score.getSurvivalTime();
    const diffConfig = this.difficulty.getConfig(survivalTime);
    const roadSpeed = diffConfig.roadSpeed;

    // 2. Road & Subsystems
    this.road.update(step, roadSpeed);
    this.player.update(step);

    // Track occupied lanes for coin placement
    const occupiedLanes = new Set<number>();
    for (const v of this.traffic.activeVehicles) {
      if (v.y > -50 && v.y < 350) {
        occupiedLanes.add(v.lane);
      }
    }

    this.traffic.update(step, roadSpeed, diffConfig, this.height);
    this.coins.update(step, roadSpeed, occupiedLanes, this.height);

    // 3. Collision Checks
    for (const v of this.traffic.activeVehicles) {
      if (Collision.testVehicleCollision(this.player, v)) {
        this.triggerCrash();
        return; // Crash stops current step
      }

      // Near-miss check
      if (Collision.testNearMiss(this.player, v)) {
        this.triggerNearMiss(v);
      }
    }

    // 4. Coin Pickup Checks
    for (const c of this.coins.activeCoins) {
      if (Collision.testCoinPickup(this.player, c)) {
        this.triggerCoinPickup(c);
      }
    }

    // 5. Score & Milestones
    this.score.update(step, (milestoneSec, bonus) => {
      audioManager.playMilestone();
      this.spawnFloatingPopup(
        `${milestoneSec}s MILESTONE!`,
        `+${bonus} PTS`,
        this.player.x,
        this.player.y - 70,
        '#38bdf8'
      );
    });

    // 6. Visual FX updates
    this.updateParticles(step);
    this.updatePopups(step);

    // 7. Screen Shake decay
    if (this.shakeTimer > 0) {
      this.shakeTimer -= step;
      const progress = this.shakeTimer / 0.45;
      const currentIntensity = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }

    // 8. Throttled HUD update
    this.lastHUDUpdate += step;
    if (this.lastHUDUpdate >= this.HUD_UPDATE_INTERVAL) {
      this.lastHUDUpdate = 0;
      this.emitHUDUpdate();
    }
  }

  private triggerCrash(): void {
    if (this.hasCrashed) return;
    this.hasCrashed = true;

    // SFX, Shake & Haptics
    audioManager.playCrash();
    try {
      navigator.vibrate?.([50, 70, 120]);
    } catch {
      // Haptics unavailable
    }

    this.shakeTimer = 0.45;
    this.shakeIntensity = 16;

    // Spawn impact particles
    this.spawnExplosionParticles(this.player.x, this.player.y + 30);

    // Finalize score and transition after brief pause
    const runResult = this.score.finalizeRun();

    setTimeout(() => {
      audioManager.playGameOver();
      this.setState('GAME_OVER');
      this.callbacks.onGameOver(runResult.finalScore, runResult.isNewBest, runResult.coinsEarned);
    }, 450);
  }

  private triggerNearMiss(vehicle: TrafficVehicle): void {
    const { points, combo } = this.score.registerNearMiss();
    audioManager.playNearMiss(combo);

    try {
      navigator.vibrate?.(20);
    } catch {
      // Haptics unavailable
    }

    const popupY = Math.min(this.player.y, vehicle.y + vehicle.height / 2) - 30;
    const popupText = combo > 1 ? `NEAR MISS! x${combo}` : `NEAR MISS!`;
    const popupSub = `+${points}`;
    this.spawnFloatingPopup(popupText, popupSub, this.player.x, popupY, '#f59e0b');

    // Spawn subtle speed streak particles
    this.spawnSpeedStreaks(this.player.x, this.player.y);
  }

  private triggerCoinPickup(coin: { x: number; y: number; isCollected: boolean }): void {
    this.coins.collectCoin(coin as any);
    const { points } = this.score.addCoin();
    audioManager.playCoin();

    // Spawn sparkles
    this.spawnCoinSparkles(coin.x, coin.y);

    // Floating text
    this.spawnFloatingPopup(`+${points}`, undefined, coin.x, coin.y - 15, '#fbbf24');
  }

  private emitHUDUpdate(): void {
    const hud: GameHUDState = {
      score: this.score.getScore(),
      bestScore: this.score.getBestScore(),
      coins: this.score.getRunCoins(),
      totalCoins: this.score.getTotalCoins(),
      combo: this.score.getCombo(),
      difficulty: this.difficulty.getCurrentTier(),
      survivalTime: Math.floor(this.score.getSurvivalTime())
    };
    this.callbacks.onHUDUpdate(hud);
  }

  // --- Particle & Floating Popup Helpers (Pooled) ---
  private spawnExplosionParticles(x: number, y: number): void {
    const colors = ['#f97316', '#ef4444', '#fbbf24', '#64748b', '#00f2fe'];
    for (let i = 0; i < 24; i++) {
      const p = this.particlePool.pop();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.size = 3 + Math.random() * 5;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.4;
      p.shape = Math.random() < 0.5 ? 'spark' : 'circle';

      this.activeParticles.push(p);
    }
  }

  private spawnCoinSparkles(x: number, y: number): void {
    const colors = ['#fef08a', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 8; i++) {
      const p = this.particlePool.pop();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
      p.size = 2.5 + Math.random() * 3;
      p.life = 0;
      p.maxLife = 0.35;
      p.shape = 'spark';

      this.activeParticles.push(p);
    }
  }

  private spawnSpeedStreaks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const p = this.particlePool.pop();
      if (!p) break;

      p.active = true;
      p.x = x + (Math.random() * 50 - 25);
      p.y = y + (Math.random() * 40 - 20);
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = -180 - Math.random() * 100;
      p.color = '#38bdf8';
      p.alpha = 0.8;
      p.size = 2;
      p.life = 0;
      p.maxLife = 0.25;
      p.shape = 'spark';

      this.activeParticles.push(p);
    }
  }

  private spawnFloatingPopup(text: string, subtext: string | undefined, x: number, y: number, color: string): void {
    const pop = this.popupPool.pop();
    if (!pop) return;

    pop.active = true;
    pop.text = text;
    pop.subtext = subtext;
    pop.x = x;
    pop.y = y;
    pop.alpha = 1;
    pop.scale = 0.8;
    pop.color = color;
    pop.life = 0;
    pop.maxLife = 0.9;

    this.activePopups.push(pop);
  }

  private updateParticles(dt: number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        p.active = false;
        this.activeParticles.splice(i, 1);
        this.particlePool.push(p);
      }
    }
  }

  private updatePopups(dt: number): void {
    for (let i = this.activePopups.length - 1; i >= 0; i--) {
      const pop = this.activePopups[i];
      pop.life += dt;
      pop.y -= 45 * dt; // Float upward
      const progress = pop.life / pop.maxLife;

      if (progress < 0.2) {
        pop.scale = 0.8 + (progress / 0.2) * 0.4; // Pop in
      } else {
        pop.scale = 1.2;
      }
      pop.alpha = Math.max(0, 1 - progress);

      if (pop.life >= pop.maxLife) {
        pop.active = false;
        this.activePopups.splice(i, 1);
        this.popupPool.push(pop);
      }
    }
  }

  // --- Render Pass ---
  private render(): void {
    const { ctx, dpr } = this;
    const width = this.width;
    const height = this.height;

    ctx.save();
    // Always reset transform cleanly to DPR, never stack ctx.scale() or multiply
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply screen shake
    if (this.shakeTimer > 0) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }

    // 1. Road & shoulders (draws precisely to width & height)
    this.road.render(ctx, width, height);

    // 2. Coins
    this.coins.render(ctx, height);

    // 3. Traffic vehicles
    this.traffic.render(ctx, height);

    // 4. Player vehicle
    this.player.render(ctx);

    // 5. Particles
    for (const p of this.activeParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.shape === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size, p.size, p.size * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Floating popups
    for (const pop of this.activePopups) {
      ctx.save();
      ctx.globalAlpha = pop.alpha;
      ctx.translate(pop.x, pop.y);
      ctx.scale(pop.scale, pop.scale);

      ctx.fillStyle = pop.color;
      ctx.font = 'bold 16px "Chakra Petch", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(pop.text, 0, 0);

      if (pop.subtext) {
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pop.subtext, 0, 18);
      }
      ctx.restore();
    }

    // 7. READY State Overlay Beat
    if (this.state === 'READY') {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 13, 20, 0.65)';
      ctx.fillRect(0, 0, width, height);

      // Animated glowing pulse prompt
      const pulse = 0.85 + Math.sin(performance.now() / 200) * 0.15;
      ctx.translate(width / 2, height / 2 - 20);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 24px "Chakra Petch", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SWIPE OR TAP TO START', 0, 0);

      ctx.shadowBlur = 0;
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Use Arrow Keys or A/D on Desktop', 0, 32);

      ctx.restore();
    }

    ctx.restore();
  }
}
