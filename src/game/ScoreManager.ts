import { GAME_CONSTANTS } from '../types/game';

export interface ScoreState {
  currentScore: number;
  bestScore: number;
  runCoins: number;
  totalCoins: number;
  nearMissCombo: number;
  survivalTime: number;
  lastMilestoneTime: number;
}

export class ScoreManager {
  private currentScore: number = 0;
  private bestScore: number = 0;
  private runCoins: number = 0;
  private totalCoins: number = 0;
  private nearMissCombo: number = 0;
  private comboTimer: number = 0;
  private survivalTime: number = 0;
  private survivalAccumulator: number = 0;
  private lastMilestoneTime: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage(): void {
    try {
      const savedBest = localStorage.getItem(GAME_CONSTANTS.STORAGE_KEYS.BEST_SCORE);
      this.bestScore = savedBest ? parseInt(savedBest, 10) || 0 : 0;

      const savedCoins = localStorage.getItem(GAME_CONSTANTS.STORAGE_KEYS.TOTAL_COINS);
      this.totalCoins = savedCoins ? parseInt(savedCoins, 10) || 0 : 0;
    } catch {
      this.bestScore = 0;
      this.totalCoins = 0;
    }
  }

  public resetRun(): void {
    this.currentScore = 0;
    this.runCoins = 0;
    this.nearMissCombo = 0;
    this.comboTimer = 0;
    this.survivalTime = 0;
    this.survivalAccumulator = 0;
    this.lastMilestoneTime = 0;
  }

  public update(dt: number, onMilestone?: (milestoneSec: number, bonus: number) => void): void {
    this.survivalTime += dt;
    this.survivalAccumulator += dt;

    // Survival points: +10 pts/sec
    if (this.survivalAccumulator >= 0.1) {
      const points = Math.floor(this.survivalAccumulator * GAME_CONSTANTS.SURVIVAL_POINTS_PER_SEC);
      this.currentScore += points;
      this.survivalAccumulator -= points / GAME_CONSTANTS.SURVIVAL_POINTS_PER_SEC;
    }

    // Near-miss combo decay timer
    if (this.nearMissCombo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.nearMissCombo = 0;
        this.comboTimer = 0;
      }
    }

    // Survival milestone check every 15 seconds
    const milestoneInterval = GAME_CONSTANTS.MILESTONE_INTERVAL_SEC;
    if (this.survivalTime - this.lastMilestoneTime >= milestoneInterval) {
      this.lastMilestoneTime += milestoneInterval;
      this.currentScore += GAME_CONSTANTS.MILESTONE_POINTS;
      if (onMilestone) {
        onMilestone(Math.floor(this.lastMilestoneTime), GAME_CONSTANTS.MILESTONE_POINTS);
      }
    }
  }

  public addCoin(): { points: number; runCoins: number; totalCoins: number } {
    this.runCoins += 1;
    this.totalCoins += 1;
    this.currentScore += GAME_CONSTANTS.COIN_POINTS;

    try {
      localStorage.setItem(GAME_CONSTANTS.STORAGE_KEYS.TOTAL_COINS, String(this.totalCoins));
    } catch {
      // Storage unavailable or quota exceeded
    }

    return {
      points: GAME_CONSTANTS.COIN_POINTS,
      runCoins: this.runCoins,
      totalCoins: this.totalCoins
    };
  }

  public registerNearMiss(): { points: number; combo: number } {
    this.nearMissCombo += 1;
    this.comboTimer = GAME_CONSTANTS.COMBO_TIMEOUT_SEC;
    const points = GAME_CONSTANTS.NEAR_MISS_BASE_POINTS * this.nearMissCombo;
    this.currentScore += points;
    return { points, combo: this.nearMissCombo };
  }

  public finalizeRun(): { finalScore: number; isNewBest: boolean; coinsEarned: number; totalCoins: number } {
    const isNewBest = this.currentScore > this.bestScore;
    if (isNewBest) {
      this.bestScore = this.currentScore;
      try {
        localStorage.setItem(GAME_CONSTANTS.STORAGE_KEYS.BEST_SCORE, String(this.bestScore));
      } catch {
        // Storage unavailable
      }
    }

    return {
      finalScore: this.currentScore,
      isNewBest,
      coinsEarned: this.runCoins,
      totalCoins: this.totalCoins
    };
  }

  public getScore(): number {
    return this.currentScore;
  }

  public getBestScore(): number {
    return this.bestScore;
  }

  public getRunCoins(): number {
    return this.runCoins;
  }

  public getTotalCoins(): number {
    return this.totalCoins;
  }

  public getCombo(): number {
    return this.nearMissCombo;
  }

  public getSurvivalTime(): number {
    return this.survivalTime;
  }
}

