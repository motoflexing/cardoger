import { GAME_CONSTANTS, LaneIndex } from '../types/game';

export class Road {
  private dashOffset: number = 0;
  private readonly dashLength: number = 38;
  private readonly dashSpacing: number = 72; // dashLength + dashGap

  // Shoulder decoration scrolling
  private shoulderRumbleOffset: number = 0;
  private readonly rumbleSpacing: number = 40;

  // Offscreen pre-rendered asphalt texture pattern for zero frame GC
  private asphaltPattern: CanvasPattern | null = null;

  // Dynamic layout geometry matching actual viewport width & height
  public canvasWidth: number = GAME_CONSTANTS.CANVAS_WIDTH;
  public canvasHeight: number = GAME_CONSTANTS.CANVAS_HEIGHT;
  public margin: number = GAME_CONSTANTS.ROAD_MARGIN_LEFT;
  public roadWidth: number = GAME_CONSTANTS.ROAD_WIDTH;
  public laneWidth: number = GAME_CONSTANTS.LANE_WIDTH;

  constructor(initialWidth: number = GAME_CONSTANTS.CANVAS_WIDTH, initialHeight: number = GAME_CONSTANTS.CANVAS_HEIGHT) {
    this.createAsphaltPattern();
    this.updateDimensions(initialWidth, initialHeight);
  }

  private createAsphaltPattern(): void {
    if (typeof document === 'undefined') return;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 64;
    patternCanvas.height = 64;
    const pctx = patternCanvas.getContext('2d');
    if (!pctx) return;

    // Dark charcoal asphalt base
    pctx.fillStyle = '#161a22';
    pctx.fillRect(0, 0, 64, 64);

    // Subtle grain dots
    pctx.fillStyle = '#1c212b';
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      pctx.fillRect(x, y, 1, 1);
    }
    pctx.fillStyle = '#10141a';
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      pctx.fillRect(x, y, 1, 1);
    }

    const dummyCanvas = document.createElement('canvas');
    const dctx = dummyCanvas.getContext('2d');
    if (dctx) {
      this.asphaltPattern = dctx.createPattern(patternCanvas, 'repeat');
    }
  }

  public updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Symmetrical shoulders: adaptive margin between 18px and 32px (~7% of width)
    this.margin = Math.max(18, Math.min(32, Math.round(width * 0.07)));
    this.roadWidth = width - 2 * this.margin;
    this.laneWidth = this.roadWidth / GAME_CONSTANTS.LANE_COUNT;
  }

  public getLaneCenterX(lane: LaneIndex): number {
    return this.margin + (lane + 0.5) * this.laneWidth;
  }

  public update(dt: number, roadSpeed: number): void {
    this.dashOffset = (this.dashOffset + roadSpeed * dt) % this.dashSpacing;
    this.shoulderRumbleOffset = (this.shoulderRumbleOffset + roadSpeed * dt) % this.rumbleSpacing;
  }

  public render(ctx: CanvasRenderingContext2D, width?: number, height?: number): void {
    const cWidth = width || this.canvasWidth;
    const cHeight = height || this.canvasHeight;
    const roadMargin = this.margin;
    const roadWidth = this.roadWidth;
    const roadRight = roadMargin + roadWidth;
    const laneWidth = this.laneWidth;

    // 1. Outer scenery / grass / gravel shoulders (fills exact canvas width/height)
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Subtle shoulder rumble strips (alternating warning blocks)
    const rumbleCount = Math.ceil(cHeight / this.rumbleSpacing) + 2;
    for (let i = -1; i < rumbleCount; i++) {
      const y = i * this.rumbleSpacing + this.shoulderRumbleOffset;
      const isAlt = (Math.floor((y - this.shoulderRumbleOffset) / this.rumbleSpacing) % 2 + 2) % 2 === 0;

      // Left rumble strip
      ctx.fillStyle = isAlt ? '#ef4444' : '#f8fafc';
      ctx.fillRect(roadMargin - 9, y, 7, this.rumbleSpacing / 2);

      // Right rumble strip
      ctx.fillRect(roadRight + 2, y, 7, this.rumbleSpacing / 2);
    }

    // Guardrail borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(roadMargin - 13, 0);
    ctx.lineTo(roadMargin - 13, cHeight);
    ctx.moveTo(roadRight + 13, 0);
    ctx.lineTo(roadRight + 13, cHeight);
    ctx.stroke();

    // 2. Road surface (textured dark asphalt)
    if (this.asphaltPattern) {
      ctx.fillStyle = this.asphaltPattern;
    } else {
      ctx.fillStyle = '#161a22';
    }
    ctx.fillRect(roadMargin, 0, roadWidth, cHeight);

    // 3. Solid shoulder boundary lines
    ctx.strokeStyle = '#f59e0b'; // Crisp highway amber
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(roadMargin + 1.5, 0);
    ctx.lineTo(roadMargin + 1.5, cHeight);
    ctx.moveTo(roadRight - 1.5, 0);
    ctx.lineTo(roadRight - 1.5, cHeight);
    ctx.stroke();

    // 4. White dashed lane dividers (3 lines separating 4 lanes)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const dashesCount = Math.ceil(cHeight / this.dashSpacing) + 2;

    for (let l = 1; l < 4; l++) {
      const lineX = roadMargin + l * laneWidth;

      ctx.beginPath();
      for (let i = -1; i < dashesCount; i++) {
        const startY = i * this.dashSpacing + this.dashOffset;
        const endY = startY + this.dashLength;

        ctx.moveTo(lineX, startY);
        ctx.lineTo(lineX, Math.min(endY, cHeight));
      }
      ctx.stroke();
    }
  }
}
