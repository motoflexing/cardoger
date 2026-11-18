import { DifficultyTier, DifficultyConfig } from '../types/game';

const DIFFICULTY_TIERS: DifficultyConfig[] = [
  {
    tier: 'EASY',
    label: 'Cruising',
    minTime: 0,
    maxTime: 15,
    roadSpeed: 360,
    spawnInterval: 1.6,
    minGap: 240,
    maxConcurrent: 5,
    speedVariance: 25,
    multiLaneProb: 0.15
  },
  {
    tier: 'NORMAL',
    label: 'Moderate',
    minTime: 15,
    maxTime: 30,
    roadSpeed: 420,
    spawnInterval: 1.25,
    minGap: 200,
    maxConcurrent: 7,
    speedVariance: 40,
    multiLaneProb: 0.35
  },
  {
    tier: 'CHALLENGING',
    label: 'Rush Hour',
    minTime: 30,
    maxTime: 60,
    roadSpeed: 490,
    spawnInterval: 0.95,
    minGap: 175,
    maxConcurrent: 9,
    speedVariance: 60,
    multiLaneProb: 0.55
  },
  {
    tier: 'HARD',
    label: 'Gridlock',
    minTime: 60,
    maxTime: 90,
    roadSpeed: 560,
    spawnInterval: 0.78,
    minGap: 155,
    maxConcurrent: 11,
    speedVariance: 80,
    multiLaneProb: 0.7
  },
  {
    tier: 'EXTREME',
    label: 'Maximum Heat',
    minTime: 90,
    maxTime: Infinity,
    roadSpeed: 620,
    spawnInterval: 0.65,
    minGap: 140,
    maxConcurrent: 13,
    speedVariance: 95,
    multiLaneProb: 0.85
  }
];

export class DifficultyManager {
  private currentTierIndex: number = 0;

  public reset(): void {
    this.currentTierIndex = 0;
  }

  public getConfig(survivalTime: number): DifficultyConfig {
    for (let i = 0; i < DIFFICULTY_TIERS.length; i++) {
      const cfg = DIFFICULTY_TIERS[i];
      if (survivalTime >= cfg.minTime && survivalTime < cfg.maxTime) {
        this.currentTierIndex = i;
        return cfg;
      }
    }
    return DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];
  }

  public getCurrentTier(): DifficultyTier {
    return DIFFICULTY_TIERS[this.currentTierIndex].tier;
  }

  public getCurrentLabel(): string {
    return DIFFICULTY_TIERS[this.currentTierIndex].label;
  }
}

