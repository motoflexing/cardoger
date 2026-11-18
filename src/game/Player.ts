import { GAME_CONSTANTS, LaneIndex } from '../types/game';
import { Road } from './Road';

export class Player {
  public currentLane: LaneIndex = 1;
  public targetLane: LaneIndex = 1;
  public x: number = 0;
  public y: number = GAME_CONSTANTS.PLAYER_Y_ANCHOR;
  public width: number = GAME_CONSTANTS.PLAYER_WIDTH;
  public height: number = GAME_CONSTANTS.PLAYER_HEIGHT;

  // Lane transition interpolation state
  public isTransitioning: boolean = false;
  private startX: number = 0;
  private targetX: number = 0;
  private transitionTimer: number = 0;
  private readonly transitionDuration: number = GAME_CONSTANTS.PLAYER_LANE_SWITCH_DURATION;

  // Input buffering (at most 1 rapid queued lane switch)
  private bufferedDirection: (-1 | 1) | 0 = 0;

  // Dynamic visual tilt angle (radians) during steering
  private tiltAngle: number = 0;

  // Reference to road for lane coordinates
  private road: Road;

  // Sound callback
  private onLaneSwitchSound?: () => void;

  // Current canvas viewport height
  private viewportHeight: number = GAME_CONSTANTS.CANVAS_HEIGHT;

  constructor(road: Road, onLaneSwitchSound?: () => void) {
    this.road = road;
    this.onLaneSwitchSound = onLaneSwitchSound;
    this.reset();
  }

  public updateDimensions(_width: number, height: number): void {
    this.viewportHeight = height;

    // Anchor player safely near the bottom of the visible screen
    // Keep the entire car + tail lights + clearance visible
    const bottomClearance = Math.max(50, Math.min(80, Math.round(height * 0.1)));
    this.y = Math.round(height - this.height - bottomClearance);

    if (!this.isTransitioning) {
      this.x = this.road.getLaneCenterX(this.targetLane);
      this.startX = this.x;
      this.targetX = this.x;
    } else {
      this.targetX = this.road.getLaneCenterX(this.targetLane);
    }
  }

  public reset(height?: number): void {
    this.currentLane = 1;
    this.targetLane = 1;
    this.x = this.road.getLaneCenterX(1);

    const h = height || this.viewportHeight || GAME_CONSTANTS.CANVAS_HEIGHT;
    this.viewportHeight = h;
    const bottomClearance = Math.max(50, Math.min(80, Math.round(h * 0.1)));
    this.y = Math.round(h - this.height - bottomClearance);

    this.isTransitioning = false;
    this.startX = this.x;
    this.targetX = this.x;
    this.transitionTimer = 0;
    this.bufferedDirection = 0;
    this.tiltAngle = 0;
  }

  public requestLaneChange(direction: -1 | 1): boolean {
    if (this.isTransitioning) {
      // Buffer at most 1 input during transition
      this.bufferedDirection = direction;
      return false;
    }

    const nextLane = (this.targetLane + direction) as number;
    if (nextLane < 0 || nextLane >= GAME_CONSTANTS.LANE_COUNT) {
      return false; // Clamped strictly to [0, 3]
    }

    this.startLaneTransition(nextLane as LaneIndex);
    return true;
  }

  private startLaneTransition(nextLane: LaneIndex): void {
    this.targetLane = nextLane;
    this.isTransitioning = true;
    this.startX = this.x;
    this.targetX = this.road.getLaneCenterX(nextLane);
    this.transitionTimer = 0;

    // Trigger steering sound
    if (this.onLaneSwitchSound) {
      this.onLaneSwitchSound();
    }
  }

  public update(dt: number): void {
    if (this.isTransitioning) {
      this.transitionTimer += dt;
      const progress = Math.min(1, this.transitionTimer / this.transitionDuration);

      // Smooth cosine easing for natural car lateral momentum
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      this.x = this.startX + (this.targetX - this.startX) * ease;

      // Dynamic tilt: tilt into the turn and recover smoothly
      const steerDirection = Math.sign(this.targetX - this.startX);
      const tiltMagnitude = Math.sin(progress * Math.PI) * 0.12; // ~7 degrees peak tilt
      this.tiltAngle = steerDirection * tiltMagnitude;

      if (progress >= 1) {
        this.x = this.targetX;
        this.currentLane = this.targetLane;
        this.isTransitioning = false;
        this.tiltAngle = 0;

        // Immediately consume buffered input if any
        if (this.bufferedDirection !== 0) {
          const nextBuffered = this.bufferedDirection;
          this.bufferedDirection = 0;
          this.requestLaneChange(nextBuffered);
        }
      }
    } else {
      // Smooth decay of tilt
      this.tiltAngle *= 0.8;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, tiltAngle } = this;
    const halfW = width / 2;
    const halfH = height / 2;
    const centerX = x;
    const centerY = y + halfH;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(tiltAngle);

    // 1. Headlights projecting forward
    const lightGradient = ctx.createLinearGradient(0, -halfH, 0, -halfH - 140);
    lightGradient.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    lightGradient.addColorStop(0.3, 'rgba(254, 240, 138, 0.2)');
    lightGradient.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = lightGradient;
    ctx.beginPath();
    // Left beam
    ctx.moveTo(-halfW + 4, -halfH + 6);
    ctx.lineTo(-halfW - 20, -halfH - 140);
    ctx.lineTo(-halfW + 18, -halfH - 140);
    ctx.lineTo(-halfW + 14, -halfH + 6);
    // Right beam
    ctx.moveTo(halfW - 14, -halfH + 6);
    ctx.lineTo(halfW - 18, -halfH - 140);
    ctx.lineTo(halfW + 20, -halfH - 140);
    ctx.lineTo(halfW - 4, -halfH + 6);
    ctx.closePath();
    ctx.fill();

    // 2. Drop Shadow under car
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(-halfW - 2, -halfH + 4, width + 4, height, 12);
    ctx.fill();

    // 3. Wheels / Tires
    ctx.fillStyle = '#0f172a';
    const tireW = 8;
    const tireH = 18;
    // Front tires
    ctx.fillRect(-halfW - 2, -halfH + 12, tireW, tireH);
    ctx.fillRect(halfW - 6, -halfH + 12, tireW, tireH);
    // Rear tires
    ctx.fillRect(-halfW - 2, halfH - 24, tireW, tireH);
    ctx.fillRect(halfW - 6, halfH - 24, tireW, tireH);

    // Tire tread rims
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-halfW, -halfH + 18, 4, 6);
    ctx.fillRect(halfW - 4, -halfH + 18, 4, 6);
    ctx.fillRect(-halfW, halfH - 18, 4, 6);
    ctx.fillRect(halfW - 4, halfH - 18, 4, 6);

    // 4. Main Car Chassis (Electric Cyan / Neon Azure Sports Car)
    const chassisGradient = ctx.createLinearGradient(-halfW, 0, halfW, 0);
    chassisGradient.addColorStop(0, '#0284c7');
    chassisGradient.addColorStop(0.3, '#00f2fe');
    chassisGradient.addColorStop(0.7, '#38bdf8');
    chassisGradient.addColorStop(1, '#0284c7');

    ctx.fillStyle = chassisGradient;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, width, height, [16, 16, 10, 10]);
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 5. Dual White Racing Stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(-5, -halfH + 4, 3, height - 12);
    ctx.fillRect(2, -halfH + 4, 3, height - 12);

    // 6. Aerodynamic Windshield / Glass Canopy
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-halfW + 7, -halfH + 20, width - 14, 24, [8, 8, 4, 4]);
    ctx.fill();

    // Windshield glass specular reflection
    const glassReflection = ctx.createLinearGradient(-halfW + 8, -halfH + 20, halfW - 8, -halfH + 44);
    glassReflection.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    glassReflection.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
    glassReflection.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
    ctx.fillStyle = glassReflection;
    ctx.beginPath();
    ctx.roundRect(-halfW + 8, -halfH + 21, width - 16, 22, [6, 6, 3, 3]);
    ctx.fill();

    // Rear window
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-halfW + 9, halfH - 26, width - 18, 12, [3, 3, 5, 5]);
    ctx.fill();

    // 7. Roof panel
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.roundRect(-halfW + 8, -halfH + 38, width - 16, 16, 4);
    ctx.fill();

    // 8. Side Mirrors
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(-halfW - 5, -halfH + 26, 5, 6);
    ctx.fillRect(halfW, -halfH + 26, 5, 6);

    // 9. Rear Spoiler / Wing
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-halfW - 2, halfH - 7, width + 4, 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW + 6, halfH - 10, 4, 4);
    ctx.fillRect(halfW - 10, halfH - 10, 4, 4);

    // 10. Headlights (LED clusters)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-halfW + 4, -halfH + 1, 9, 4);
    ctx.fillRect(halfW - 13, -halfH + 1, 9, 4);

    // 11. Taillights (Glowing Red LEDs)
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 8;
    ctx.fillRect(-halfW + 4, halfH - 3, 10, 3);
    ctx.fillRect(halfW - 14, halfH - 3, 10, 3);
    ctx.shadowBlur = 0; // Reset shadow blur

    ctx.restore();
  }
}
