export type GameState = 'MENU' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type LaneIndex = 0 | 1 | 2 | 3;

export type VehicleArchetype = 'small' | 'sedan' | 'suv' | 'truck';

export interface VehicleConfig {
  type: VehicleArchetype;
  name: string;
  width: number;
  height: number;
  speedMultiplier: number;
  hitboxInsetX: number; // Inset from each side (e.g. 0.18 = 18% smaller hitbox)
  hitboxInsetY: number;
  palette: Array<{
    body: string;
    roof: string;
    accent: string;
    glass: string;
  }>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TrafficVehicle {
  id: number;
  active: boolean;
  type: VehicleArchetype;
  lane: LaneIndex;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  bodyColor: string;
  roofColor: string;
  accentColor: string;
  glassColor: string;
  hasNearMissed: boolean;
  // Dynamic offset/wobble for realistic feel
  wobbleOffset: number;
  wobbleSpeed: number;
}

export interface CoinEntity {
  id: number;
  active: boolean;
  lane: LaneIndex;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  isCollected: boolean;
  collectAnim: number; // 0 to 1
}

export interface ParticleEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'spark' | 'smoke';
}

export interface FloatingPopup {
  active: boolean;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  alpha: number;
  scale: number;
  color: string;
  life: number;
  maxLife: number;
}

export type DifficultyTier = 'EASY' | 'NORMAL' | 'CHALLENGING' | 'HARD' | 'EXTREME';

export interface DifficultyConfig {
  tier: DifficultyTier;
  label: string;
  minTime: number;
  maxTime: number;
  roadSpeed: number;
  spawnInterval: number; // Seconds between spawns
  minGap: number;        // Minimum longitudinal pixel gap
  maxConcurrent: number; // Max vehicles on screen
  speedVariance: number; // Random deviation in vehicle speed
  multiLaneProb: number; // Probability of spawning multi-lane staggered pattern
}

export interface GameHUDState {
  score: number;
  bestScore: number;
  coins: number;
  totalCoins: number;
  combo: number;
  difficulty: DifficultyTier;
  survivalTime: number;
}

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onHUDUpdate: (hud: GameHUDState) => void;
  onGameOver: (finalScore: number, isNewBest: boolean, coinsEarned: number) => void;
}

// Coordinate & Rendering Constants
export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 700,
  LANE_COUNT: 4,
  ROAD_MARGIN_LEFT: 36,
  ROAD_MARGIN_RIGHT: 36,
  ROAD_WIDTH: 328, // 400 - 72
  LANE_WIDTH: 82,  // 328 / 4
  PLAYER_WIDTH: 46,
  PLAYER_HEIGHT: 84,
  PLAYER_Y_ANCHOR: 540,
  PLAYER_LANE_SWITCH_DURATION: 0.13, // 130 ms (within 100-160ms spec)
  NEAR_MISS_LATERAL_THRESHOLD: 48,
  NEAR_MISS_LONGITUDINAL_THRESHOLD: 40,
  HITBOX_INSET_FACTOR: 0.18, // 18% smaller hitbox
  SURVIVAL_POINTS_PER_SEC: 10,
  COIN_POINTS: 5,
  NEAR_MISS_BASE_POINTS: 25,
  MILESTONE_POINTS: 100,
  MILESTONE_INTERVAL_SEC: 15,
  COMBO_TIMEOUT_SEC: 3.5,
  STORAGE_KEYS: {
    BEST_SCORE: 'moto_traffic_escape_best_score',
    TOTAL_COINS: 'moto_traffic_escape_total_coins',
    IS_MUTED: 'moto_traffic_escape_muted',
    HAPTICS_ENABLED: 'moto_traffic_escape_haptics',
  }
} as const;

export const VEHICLE_CONFIGS: Record<VehicleArchetype, VehicleConfig> = {
  small: {
    type: 'small',
    name: 'Compact',
    width: 42,
    height: 70,
    speedMultiplier: 1.15,
    hitboxInsetX: 0.18,
    hitboxInsetY: 0.18,
    palette: [
      { body: '#06b6d4', roof: '#0891b2', accent: '#a5f3fc', glass: '#164e63' }, // Cyan
      { body: '#eab308', roof: '#ca8a04', accent: '#fef08a', glass: '#713f12' }, // Taxi Yellow
      { body: '#84cc16', roof: '#65a30d', accent: '#d9f99d', glass: '#365314' }, // Lime
      { body: '#ec4899', roof: '#db2777', accent: '#fbcfe8', glass: '#831843' }, // Pink
    ]
  },
  sedan: {
    type: 'sedan',
    name: 'Sedan',
    width: 45,
    height: 82,
    speedMultiplier: 1.0,
    hitboxInsetX: 0.18,
    hitboxInsetY: 0.18,
    palette: [
      { body: '#3b82f6', roof: '#2563eb', accent: '#93c5fd', glass: '#1e3a8a' }, // Cobalt Blue
      { body: '#ef4444', roof: '#dc2626', accent: '#fca5a5', glass: '#7f1d1d' }, // Crimson
      { body: '#94a3b8', roof: '#64748b', accent: '#e2e8f0', glass: '#334155' }, // Silver
      { body: '#a855f7', roof: '#9333ea', accent: '#e9d5ff', glass: '#581c87' }, // Purple
    ]
  },
  suv: {
    type: 'suv',
    name: 'SUV',
    width: 48,
    height: 94,
    speedMultiplier: 0.88,
    hitboxInsetX: 0.18,
    hitboxInsetY: 0.18,
    palette: [
      { body: '#10b981', roof: '#059669', accent: '#a7f3d0', glass: '#064e3b' }, // Emerald
      { body: '#334155', roof: '#1e293b', accent: '#94a3b8', glass: '#0f172a' }, // Midnight
      { body: '#f97316', roof: '#ea580c', accent: '#fed7aa', glass: '#7c2d12' }, // Bronze
      { body: '#0284c7', roof: '#0369a1', accent: '#bae6fd', glass: '#0c4a6e' }, // Navy
    ]
  },
  truck: {
    type: 'truck',
    name: 'Hauler',
    width: 52,
    height: 132,
    speedMultiplier: 0.72,
    hitboxInsetX: 0.16,
    hitboxInsetY: 0.16,
    palette: [
      { body: '#e2e8f0', roof: '#cbd5e1', accent: '#3b82f6', glass: '#475569' }, // White/Blue
      { body: '#f59e0b', roof: '#d97706', accent: '#1e293b', glass: '#78350f' }, // Industrial Amber
      { body: '#dc2626', roof: '#b91c1c', accent: '#f1f5f9', glass: '#450a0a' }, // Red Freight
    ]
  }
};

