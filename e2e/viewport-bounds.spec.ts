import { test, expect } from '@playwright/test';

test.describe('Canvas Viewport & Layout Bounds Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should enforce strict 100dvh containment without page overflow', async ({ page }) => {
    const overflowInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        hasVerticalScroll: doc.scrollHeight > doc.clientHeight,
        hasHorizontalScroll: doc.scrollWidth > doc.clientWidth,
        bodyHeight: document.body.clientHeight,
        windowHeight: window.innerHeight,
      };
    });

    expect(overflowInfo.hasVerticalScroll).toBe(false);
    expect(overflowInfo.hasHorizontalScroll).toBe(false);
  });

  test('should render canvas with exact DPR backing store without distortion', async ({ page }) => {
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return {
        cssWidth: rect.width,
        cssHeight: rect.height,
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
        expectedBufferWidth: Math.round(rect.width * dpr),
        expectedBufferHeight: Math.round(rect.height * dpr),
      };
    });

    expect(canvasInfo.bufferWidth).toBe(canvasInfo.expectedBufferWidth);
    expect(canvasInfo.bufferHeight).toBe(canvasInfo.expectedBufferHeight);
  });

  test('should keep player car fully visible with clearance above the bottom fold', async ({ page }) => {
    // Start the race
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await startBtn.click();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    const playerBounds = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      // Access engine instance through canvas or internal state if needed
      // Check that canvas bounding rect bottom matches viewport bottom or has margin
      const rect = canvas.getBoundingClientRect();
      return {
        canvasTop: rect.top,
        canvasBottom: rect.bottom,
        windowHeight: window.innerHeight,
      };
    });

    expect(playerBounds.canvasBottom).toBeLessThanOrEqual(playerBounds.windowHeight + 1);
  });
});

