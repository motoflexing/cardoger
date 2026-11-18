export type InputAction = 'LANE_LEFT' | 'LANE_RIGHT' | 'PAUSE' | 'START';

export interface InputManagerCallbacks {
  onLaneChange: (direction: -1 | 1) => void;
  onPauseToggle: () => void;
  onActionStart: () => void;
}

export class InputManager {
  private callbacks: InputManagerCallbacks;
  private targetElement: HTMLElement | null = null;

  // Touch tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private swipeLocked: boolean = false;
  private readonly SWIPE_THRESHOLD = 26; // Pixel threshold to trigger swipe

  // Key tracking to prevent repeating keys on hold
  private keysDown: Set<string> = new Set();

  constructor(callbacks: InputManagerCallbacks) {
    this.callbacks = callbacks;
  }

  public attach(element: HTMLElement): void {
    this.detach();
    this.targetElement = element;

    // Window keyboard listeners
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);

    // Touch events on canvas / container
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancel);

    // Pointer / mouse click for tap zones on desktop if desired
    element.addEventListener('pointerdown', this.handlePointerDown);
  }

  public detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    if (this.targetElement) {
      this.targetElement.removeEventListener('touchstart', this.handleTouchStart);
      this.targetElement.removeEventListener('touchmove', this.handleTouchMove);
      this.targetElement.removeEventListener('touchend', this.handleTouchEnd);
      this.targetElement.removeEventListener('touchcancel', this.handleTouchCancel);
      this.targetElement.removeEventListener('pointerdown', this.handlePointerDown);
      this.targetElement = null;
    }

    this.keysDown.clear();
    this.swipeLocked = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;

    // Prevent default scrolling for game keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyP'].includes(code)) {
      e.preventDefault();
    }

    if (this.keysDown.has(code)) {
      return; // Ignore key repeat when held down
    }
    this.keysDown.add(code);

    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.callbacks.onLaneChange(-1);
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.callbacks.onLaneChange(1);
    } else if (code === 'KeyP' || code === 'Escape') {
      this.callbacks.onPauseToggle();
    } else if (code === 'Space' || code === 'Enter') {
      this.callbacks.onActionStart();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = performance.now();
      this.swipeLocked = false;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (this.swipeLocked || e.touches.length === 0) return;

    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    // Lock gesture immediately once threshold is crossed so one swipe NEVER skips 2 lanes
    if (Math.abs(dx) >= this.SWIPE_THRESHOLD) {
      if (Math.abs(dx) > Math.abs(dy) * 0.7) {
        e.preventDefault();
        this.swipeLocked = true;
        const direction = dx > 0 ? 1 : -1;
        this.callbacks.onLaneChange(direction);
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const elapsed = performance.now() - this.touchStartTime;

    // If swipe was not triggered and it was a quick tap (< 300ms) with minimal movement (< 15px)
    if (!this.swipeLocked && elapsed < 300 && e.changedTouches.length > 0 && this.targetElement) {
      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - this.touchStartX);
      const dy = Math.abs(touch.clientY - this.touchStartY);

      if (dx < 15 && dy < 15) {
        const rect = this.targetElement.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const width = rect.width;

        // Left tap zone (left 45% of screen)
        if (tapX < width * 0.45) {
          this.callbacks.onLaneChange(-1);
        } else if (tapX > width * 0.55) {
          // Right tap zone (right 45% of screen)
          this.callbacks.onLaneChange(1);
        } else {
          // Center tap triggers start if ready
          this.callbacks.onActionStart();
        }
      }
    }

    this.swipeLocked = false;
  };

  private handleTouchCancel = (): void => {
    this.swipeLocked = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    // For non-touch desktop clicks on left/right half
    if (e.pointerType === 'mouse' && this.targetElement) {
      const rect = this.targetElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < rect.width * 0.35) {
        this.callbacks.onLaneChange(-1);
      } else if (clickX > rect.width * 0.65) {
        this.callbacks.onLaneChange(1);
      } else {
        this.callbacks.onActionStart();
      }
    }
  };
}

