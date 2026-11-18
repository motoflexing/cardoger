import {
  TrafficVehicle,
  VehicleArchetype,
  LaneIndex,
  DifficultyConfig,
  GAME_CONSTANTS,
  VEHICLE_CONFIGS
} from '../types/game';
import { Road } from './Road';

export class TrafficManager {
  private pool: TrafficVehicle[] = [];
  public activeVehicles: TrafficVehicle[] = [];
  private nextId: number = 1;
  private road: Road;

  // Spawn timing
  private spawnTimer: number = 0;

  // Lane cooldowns to prevent overlapping
  private laneLastSpawnY: number[] = [-999, -999, -999, -999];

  constructor(road: Road, initialPoolSize: number = 30) {
    this.road = road;
    this.initPool(initialPoolSize);
  }

  private initPool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.pool.push({
        id: this.nextId++,
        active: false,
        type: 'sedan',
        lane: 1,
        x: 0,
        y: -999,
        width: 45,
        height: 82,
        speed: 250,
        bodyColor: '#3b82f6',
        roofColor: '#2563eb',
        accentColor: '#93c5fd',
        glassColor: '#1e3a8a',
        hasNearMissed: false,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 1.5
      });
    }
  }

  public reset(): void {
    // Return all active vehicles to pool
    for (const vehicle of this.activeVehicles) {
      vehicle.active = false;
      this.pool.push(vehicle);
    }
    this.activeVehicles.length = 0;
    this.spawnTimer = 0;
    this.laneLastSpawnY = [-999, -999, -999, -999];
  }

  public update(dt: number, roadSpeed: number, config: DifficultyConfig, viewportHeight?: number): void {
    const bottomLimit = (viewportHeight || GAME_CONSTANTS.CANVAS_HEIGHT) + 80;

    // 1. Move active vehicles downward
    for (let i = this.activeVehicles.length - 1; i >= 0; i--) {
      const v = this.activeVehicles[i];
      v.y += v.speed * dt;
      v.wobbleOffset += v.wobbleSpeed * dt;

      // Despawn vehicles past bottom of screen
      if (v.y > bottomLimit) {
        v.active = false;
        this.activeVehicles.splice(i, 1);
        this.pool.push(v);
      }
    }

    // 2. Track highest vehicle in each lane for gap validation
    for (let l = 0; l < GAME_CONSTANTS.LANE_COUNT; l++) {
      let minY = 9999;
      for (const v of this.activeVehicles) {
        if (v.lane === l && v.y < minY) {
          minY = v.y;
        }
      }
      this.laneLastSpawnY[l] = minY;
    }

    // 3. Spawn timer logic
    this.spawnTimer += dt;
    if (this.spawnTimer >= config.spawnInterval && this.activeVehicles.length < config.maxConcurrent) {
      this.spawnTimer = 0;
      this.spawnWave(roadSpeed, config);
    }
  }

  private spawnWave(roadSpeed: number, config: DifficultyConfig): void {
    // Decide whether to spawn 1 vehicle or a 2-lane staggered formation
    const rollMulti = Math.random() < config.multiLaneProb;
    const countToSpawn = rollMulti ? 2 : 1;

    // Available lanes where the highest vehicle is sufficiently far down (> minGap)
    const availableLanes: LaneIndex[] = [];
    for (let l = 0; l < GAME_CONSTANTS.LANE_COUNT; l++) {
      // Must be either empty or above minGap distance
      if (this.laneLastSpawnY[l] === 9999 || this.laneLastSpawnY[l] > config.minGap) {
        availableLanes.push(l as LaneIndex);
      }
    }

    if (availableLanes.length === 0) return;

    // FAIRNESS GUARANTEE: Never occupy all 4 lanes simultaneously.
    // If active vehicles already occupy 3 lanes at the top, limit spawn to not choke all lanes.
    const occupiedNearTop = new Set<number>();
    for (const v of this.activeVehicles) {
      if (v.y < 220) {
        occupiedNearTop.add(v.lane);
      }
    }

    // Shuffle available lanes
    availableLanes.sort(() => Math.random() - 0.5);

    let spawned = 0;
    for (const lane of availableLanes) {
      if (spawned >= countToSpawn) break;

      // Invariant: Always keep at least 1 lane fully open in the top section
      if (occupiedNearTop.size >= 3 && !occupiedNearTop.has(lane)) {
        // Don't fill the last escape lane!
        continue;
      }

      const staggerY = spawned === 0 ? 0 : -(80 + Math.random() * 60);
      this.spawnVehicle(lane, roadSpeed, config, staggerY);
      occupiedNearTop.add(lane);
      spawned++;
    }
  }

  private spawnVehicle(lane: LaneIndex, roadSpeed: number, config: DifficultyConfig, yOffset: number): void {
    let vehicle = this.pool.pop();
    if (!vehicle) {
      // Fallback if pool is exhausted
      vehicle = {
        id: this.nextId++,
        active: false,
        type: 'sedan',
        lane: 1,
        x: 0,
        y: -999,
        width: 45,
        height: 82,
        speed: 250,
        bodyColor: '#3b82f6',
        roofColor: '#2563eb',
        accentColor: '#93c5fd',
        glassColor: '#1e3a8a',
        hasNearMissed: false,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 1.5
      };
    }

    // Select archetype based on weighted probability
    const archetype = this.chooseArchetype();
    const vConfig = VEHICLE_CONFIGS[archetype];
    const palette = vConfig.palette[Math.floor(Math.random() * vConfig.palette.length)];

    // Calculate downward screen speed
    // Slower forward speed vehicles (e.g. trucks) move DOWNWARD faster relative to camera
    // Higher forward speed vehicles (small cars) move DOWNWARD slower
    const speedRatio = 0.85 - (vConfig.speedMultiplier - 1) * 0.3;
    const variance = (Math.random() * 2 - 1) * config.speedVariance;
    const downwardSpeed = Math.max(160, roadSpeed * speedRatio + variance);

    vehicle.active = true;
    vehicle.type = archetype;
    vehicle.lane = lane;
    vehicle.width = vConfig.width;
    vehicle.height = vConfig.height;
    vehicle.x = this.road.getLaneCenterX(lane);
    vehicle.y = -vConfig.height - 20 + yOffset;
    vehicle.speed = downwardSpeed;
    vehicle.bodyColor = palette.body;
    vehicle.roofColor = palette.roof;
    vehicle.accentColor = palette.accent;
    vehicle.glassColor = palette.glass;
    vehicle.hasNearMissed = false;
    vehicle.wobbleOffset = Math.random() * Math.PI * 2;
    vehicle.wobbleSpeed = 1.0 + Math.random() * 1.5;

    this.activeVehicles.push(vehicle);
    this.laneLastSpawnY[lane] = vehicle.y;
  }

  private chooseArchetype(): VehicleArchetype {
    const r = Math.random();
    if (r < 0.32) return 'small';
    if (r < 0.65) return 'sedan';
    if (r < 0.88) return 'suv';
    return 'truck';
  }

  public render(ctx: CanvasRenderingContext2D, viewportHeight?: number): void {
    const bottomLimit = (viewportHeight || GAME_CONSTANTS.CANVAS_HEIGHT) + 10;
    for (const v of this.activeVehicles) {
      if (v.y + v.height < -10 || v.y > bottomLimit) continue;

      ctx.save();
      const halfW = v.width / 2;
      const halfH = v.height / 2;
      const centerX = v.x;
      const centerY = v.y + halfH;

      ctx.translate(centerX, centerY);

      // Subtle lateral drift/wobble for realistic feel
      const subtleWobble = Math.sin(v.wobbleOffset) * 0.6;
      ctx.translate(subtleWobble, 0);

      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-halfW - 2, -halfH + 3, v.width + 4, v.height, 10);
      ctx.fill();

      // Render archetype
      switch (v.type) {
        case 'small':
          this.renderSmallCar(ctx, v, halfW, halfH);
          break;
        case 'sedan':
          this.renderSedan(ctx, v, halfW, halfH);
          break;
        case 'suv':
          this.renderSUV(ctx, v, halfW, halfH);
          break;
        case 'truck':
          this.renderTruck(ctx, v, halfW, halfH);
          break;
      }

      ctx.restore();
    }
  }

  private renderSmallCar(ctx: CanvasRenderingContext2D, v: TrafficVehicle, halfW: number, halfH: number): void {
    // Tires
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW - 1, -halfH + 10, 6, 14);
    ctx.fillRect(halfW - 5, -halfH + 10, 6, 14);
    ctx.fillRect(-halfW - 1, halfH - 20, 6, 14);
    ctx.fillRect(halfW - 5, halfH - 20, 6, 14);

    // Chassis
    ctx.fillStyle = v.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, v.width, v.height, [14, 14, 10, 10]);
    ctx.fill();

    // Windshield
    ctx.fillStyle = v.glassColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 6, -halfH + 16, v.width - 12, 18, [6, 6, 3, 3]);
    ctx.fill();

    // Roof
    ctx.fillStyle = v.roofColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 7, -halfH + 32, v.width - 14, 20, 4);
    ctx.fill();

    // Rear window
    ctx.fillStyle = v.glassColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 7, halfH - 16, v.width - 14, 8, [2, 2, 4, 4]);
    ctx.fill();

    // Headlights (facing forward / down relative to traffic)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 4, halfH - 3, 7, 3);
    ctx.fillRect(halfW - 11, halfH - 3, 7, 3);

    // Taillights (at the top since it faces down)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-halfW + 4, -halfH + 1, 7, 2);
    ctx.fillRect(halfW - 11, -halfH + 1, 7, 2);
  }

  private renderSedan(ctx: CanvasRenderingContext2D, v: TrafficVehicle, halfW: number, halfH: number): void {
    // Tires
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW - 1, -halfH + 12, 6, 16);
    ctx.fillRect(halfW - 5, -halfH + 12, 6, 16);
    ctx.fillRect(-halfW - 1, halfH - 24, 6, 16);
    ctx.fillRect(halfW - 5, halfH - 24, 6, 16);

    // Chassis
    ctx.fillStyle = v.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, v.width, v.height, [12, 12, 10, 10]);
    ctx.fill();

    // Front/rear contours
    ctx.strokeStyle = v.accentColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trunk lid (top)
    ctx.fillStyle = v.roofColor;
    ctx.fillRect(-halfW + 8, -halfH + 4, v.width - 16, 10);

    // Rear windshield
    ctx.fillStyle = v.glassColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 7, -halfH + 16, v.width - 14, 12, [2, 2, 4, 4]);
    ctx.fill();

    // Roof
    ctx.fillStyle = v.roofColor;
    ctx.fillRect(-halfW + 6, -halfH + 30, v.width - 12, 24);

    // Front windshield
    ctx.fillStyle = v.glassColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 6, halfH - 26, v.width - 12, 14, [4, 4, 2, 2]);
    ctx.fill();

    // Headlights (facing downward)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 4, halfH - 3, 8, 3);
    ctx.fillRect(halfW - 12, halfH - 3, 8, 3);

    // Taillights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-halfW + 4, -halfH + 1, 8, 2);
    ctx.fillRect(halfW - 12, -halfH + 1, 8, 2);
  }

  private renderSUV(ctx: CanvasRenderingContext2D, v: TrafficVehicle, halfW: number, halfH: number): void {
    // Big Tires
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW - 2, -halfH + 14, 7, 18);
    ctx.fillRect(halfW - 5, -halfH + 14, 7, 18);
    ctx.fillRect(-halfW - 2, halfH - 28, 7, 18);
    ctx.fillRect(halfW - 5, halfH - 28, 7, 18);

    // Rugged Boxy Chassis
    ctx.fillStyle = v.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, v.width, v.height, [8, 8, 6, 6]);
    ctx.fill();

    // Large glass canopy
    ctx.fillStyle = v.glassColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 5, -halfH + 16, v.width - 10, v.height - 34, 4);
    ctx.fill();

    // Roof
    ctx.fillStyle = v.roofColor;
    ctx.fillRect(-halfW + 6, -halfH + 28, v.width - 12, 38);

    // Roof rails
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-halfW + 7, -halfH + 26, 3, 40);
    ctx.fillRect(halfW - 10, -halfH + 26, 3, 40);

    // Cross bars
    ctx.fillRect(-halfW + 7, -halfH + 34, v.width - 14, 2);
    ctx.fillRect(-halfW + 7, -halfH + 52, v.width - 14, 2);

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 4, halfH - 4, 9, 4);
    ctx.fillRect(halfW - 13, halfH - 4, 9, 4);

    // Taillights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-halfW + 4, -halfH + 1, 9, 3);
    ctx.fillRect(halfW - 13, -halfH + 1, 9, 3);
  }

  private renderTruck(ctx: CanvasRenderingContext2D, v: TrafficVehicle, halfW: number, halfH: number): void {
    // Dual Rear Tires
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW - 2, -halfH + 16, 7, 24);
    ctx.fillRect(halfW - 5, -halfH + 16, 7, 24);
    ctx.fillRect(-halfW - 2, -halfH + 46, 7, 24);
    ctx.fillRect(halfW - 5, -halfH + 46, 7, 24);
    // Front cab tires
    ctx.fillRect(-halfW - 2, halfH - 24, 7, 18);
    ctx.fillRect(halfW - 5, halfH - 24, 7, 18);

    // 1. Cargo Trailer Container
    ctx.fillStyle = v.bodyColor;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, v.width, v.height - 36, 4);
    ctx.fill();

    // Corrugated container lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 2;
    for (let y = -halfH + 12; y < halfH - 42; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-halfW + 3, y);
      ctx.lineTo(halfW - 3, y);
      ctx.stroke();
    }

    // Trailer hinge / hitch
    ctx.fillStyle = '#334155';
    ctx.fillRect(-4, halfH - 36, 8, 8);

    // 2. Cab (front)
    ctx.fillStyle = v.accentColor;
    ctx.beginPath();
    ctx.roundRect(-halfW + 2, halfH - 30, v.width - 4, 28, [4, 4, 8, 8]);
    ctx.fill();

    // Cab windshield
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-halfW + 5, halfH - 18, v.width - 10, 10, [2, 2, 4, 4]);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 4, halfH - 3, 10, 3);
    ctx.fillRect(halfW - 14, halfH - 3, 10, 3);

    // Trailer clearance lights
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-halfW + 2, -halfH + 2, 4, 3);
    ctx.fillRect(halfW - 6, -halfH + 2, 4, 3);
  }
}

