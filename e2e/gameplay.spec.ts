import { test, expect } from '@playwright/test';

test.describe('Traffic Escape Extended Gameplay & Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should handle tap zones on mobile screen to steer lanes', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await startBtn.click();

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // Start race via tap
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);

    // Tap right zone (75% across canvas)
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.7);
    await page.waitForTimeout(200);

    // Tap left zone (25% across canvas)
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.7);
    await page.waitForTimeout(200);

    // Score HUD should be active
    const scoreText = page.locator('text=Score');
    await expect(scoreText).toBeVisible();
  });

  test('should support restart from pause menu with clean world state', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await startBtn.click();

    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    // Pause via KeyP or Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=PAUSED')).toBeVisible();

    // Click Restart
    const restartBtn = page.getByRole('button', { name: /RESTART/i });
    await restartBtn.click();

    // Pause menu closes and HUD should be active
    await expect(page.locator('text=PAUSED')).not.toBeVisible();
    await expect(page.locator('text=Score')).toBeVisible();
  });
});

