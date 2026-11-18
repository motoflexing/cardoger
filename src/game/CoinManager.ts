import { CoinEntity, LaneIndex, GAME_CONSTANTS } from '../types/game';
import { Road } from './Road';

export class CoinManager {
  private pool: CoinEntity[] = [];
  public activeCoins: CoinEntity[] = [];
  private nextId: number = 1;
  private road: Road;

  // Spawning timer
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.4; // Average seconds between coin spawns

  constructor(road: Road, initialPoolSize: number = 20) {
    this.road = road;
    this.initPool(initialPoolSize);
  }

  private initPool(size: number): void {
    for (let i = 0; i < size; i++) {
      this.pool.push({
        id: this.nextId++,
        active: false,
        lane: 0,
        x: 0,
        y: -999,
        radius: 14,
        rotation: Math.random() * Math.PI,
        isCollected: false,
        collectAnim: 0
      });
    }
  }

  public reset(): void {
    for (const coin of this.activeCoins) {
      coin.active = false;
      this.pool.push(coin);
    }
    this.activeCoins.length = 0;
    this.spawnTimer = 0;
  }

  public update(dt: number, roadSpeed: number, occupiedLanes?: Set<number>, viewportHeight?: number): void {
    const bottomLimit = (viewportHeight || GAME_CONSTANTS.CANVAS_HEIGHT) + 40;

    // 1. Update active coins
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const c = this.activeCoins[i];

      if (c.isCollected) {
        c.collectAnim += dt * 3.5; // Quick pop & scale out in ~280ms
        c.y -= roadSpeed * dt * 0.4; // Float upward slightly on collect
        if (c.collectAnim >= 1) {
          c.active = false;
          this.activeCoins.splice(i, 1);
          this.pool.push(c);
          continue;
        }
      } else {
        c.y += roadSpeed * dt;
        c.rotation += dt * 4; // Continuous 3D spin rotation

        // Despawn past bottom
        if (c.y > bottomLimit) {
          c.active = false;
          this.activeCoins.splice(i, 1);
          this.pool.push(c);
          continue;
        }
      }
    }

    // 2. Spawn coins periodically
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = 1.8 + Math.random() * 1.6;
      this.spawnPattern(occupiedLanes);
    }
  }

  private spawnPattern(occupiedLanes?: Set<number>): void {
    // Determine lane: if there are occupied lanes, sometimes place near them for high risk / high reward!
    let targetLane: LaneIndex = Math.floor(Math.random() * GAME_CONSTANTS.LANE_COUNT) as LaneIndex;

    if (occupiedLanes && occupiedLanes.size > 0 && Math.random() < 0.6) {
      const occList = Array.from(occupiedLanes);
      const chosenOcc = occList[Math.floor(Math.random() * occList.length)];
      // Choose adjacent lane
      const neighbors: LaneIndex[] = [];
      if (chosenOcc > 0) neighbors.push((chosenOcc - 1) as LaneIndex);
      if (chosenOcc < 3) neighbors.push((chosenOcc + 1) as LaneIndex);
      if (neighbors.length > 0) {
        targetLane = neighbors[Math.floor(Math.random() * neighbors.length)];
      }
    }

    // Spawn 1 to 3 coins in a line
    const count = Math.random() < 0.4 ? 3 : (Math.random() < 0.4 ? 2 : 1);
    for (let k = 0; k < count; k++) {
      const coin = this.pool.pop() || {
        id: this.nextId++,
        active: false,
        lane: targetLane,
        x: 0,
        y: -999,
        radius: 14,
        rotation: 0,
        isCollected: false,
        collectAnim: 0
      };

      coin.active = true;
      coin.lane = targetLane;
      coin.x = this.road.getLaneCenterX(targetLane);
      coin.y = -30 - k * 45; // Staggered vertical line
      coin.radius = 14;
      coin.rotation = Math.random() * Math.PI;
      coin.isCollected = false;
      coin.collectAnim = 0;

      this.activeCoins.push(coin);
    }
  }

  public collectCoin(coin: CoinEntity): void {
    if (!coin.isCollected) {
      coin.isCollected = true;
      coin.collectAnim = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, viewportHeight?: number): void {
    const bottomLimit = (viewportHeight || GAME_CONSTANTS.CANVAS_HEIGHT) + 30;
    for (const c of this.activeCoins) {
      if (c.y < -30 || c.y > bottomLimit) continue;

      ctx.save();
      ctx.translate(c.x, c.y);

      if (c.isCollected) {
        // Collect animation: expanding bright halo & fading away
        const scale = 1 + c.collectAnim * 1.2;
        const alpha = Math.max(0, 1 - c.collectAnim);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // Sparkle ring
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3D spinning coin effect: scale X based on cosine of rotation
      const spinScale = Math.cos(c.rotation);
      ctx.scale(Math.abs(spinScale) < 0.15 ? 0.15 : spinScale, 1);

      // 1. Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 6, c.radius, c.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer golden rim
      const rimGradient = ctx.createLinearGradient(-c.radius, -c.radius, c.radius, c.radius);
      rimGradient.addColorStop(0, '#fef08a'); // Light Gold
      rimGradient.addColorStop(0.5, '#f59e0b'); // Rich Gold
      rimGradient.addColorStop(1, '#b45309'); // Deep Bronze
      ctx.fillStyle = rimGradient;
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Inner coin face
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius - 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Center emblem ($ or star)
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);

      // 5. Specular glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-4, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

