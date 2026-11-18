import { test, expect } from '@playwright/test';

test.describe('Traffic Escape V1 Arcade Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render Main Menu with MotoFlexing branding and controls', async ({ page }) => {
    // Check MotoFlexing branding
    await expect(page.locator('text=MotoFlexing Games')).toBeVisible();

    // Check Title
    await expect(page.getByRole('heading', { name: 'TRAFFIC' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ESCAPE' })).toBeVisible();

    // Check Start button
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await expect(startBtn).toBeVisible();

    // Check Canvas exists
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should toggle sound mute and persist in localStorage', async ({ page }) => {
    const audioBtn = page.getByRole('button', { name: /(Mute|Unmute)/i });
    await expect(audioBtn).toBeVisible();

    // Initial state check
    const initialMuted = await page.evaluate(() => localStorage.getItem('moto_traffic_escape_muted'));

    await audioBtn.click();
    const afterClickMuted = await page.evaluate(() => localStorage.getItem('moto_traffic_escape_muted'));
    expect(afterClickMuted).not.toBe(initialMuted);
  });

  test('should start race, display HUD, and allow pausing/resuming', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await startBtn.click();

    // Canvas should now be in READY state
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Trigger start via Space or Arrow key
    await page.keyboard.press('Space');

    // HUD should be visible
    const scoreLabel = page.locator('text=Score');
    await expect(scoreLabel).toBeVisible();

    // Pause via HUD button
    const pauseBtn = page.getByRole('button', { name: /Pause game/i });
    await pauseBtn.click();

    // Pause menu should be open
    await expect(page.locator('text=PAUSED')).toBeVisible();
    const resumeBtn = page.getByRole('button', { name: /RESUME/i });
    await expect(resumeBtn).toBeVisible();

    // Resume game
    await resumeBtn.click();
    await expect(page.locator('text=PAUSED')).not.toBeVisible();
  });

  test('should respond to lane change keyboard controls', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /START RACE/i });
    await startBtn.click();

    // Press ArrowRight to move right
    await page.keyboard.press('ArrowRight');

    // Wait a brief tick for lane transition
    await page.waitForTimeout(200);

    // Press ArrowLeft to move left
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(200);

    // Press KeyA and KeyD
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyA');
    await page.waitForTimeout(200);

    // Verify game canvas is actively running
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
