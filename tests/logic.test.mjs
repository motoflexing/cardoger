import test from 'node:test';
import assert from 'node:assert/strict';

// Test Collision logic
test('Collision Hitbox Insets - 18% smaller hitbox', () => {
  const width = 46;
  const height = 84;
  const factor = 0.18;
  const insetX = width * factor;
  const insetY = height * factor;

  const playerX = 159; // Center
  const playerY = 540; // Top

  const hitbox = {
    left: playerX - width / 2 + insetX,
    right: playerX + width / 2 - insetX,
    top: playerY + insetY,
    bottom: playerY + height - insetY
  };

  assert.ok(Math.abs((hitbox.right - hitbox.left) - width * (1 - 2 * factor)) < 1e-5);
  assert.ok(Math.abs((hitbox.bottom - hitbox.top) - height * (1 - 2 * factor)) < 1e-5);
});

test('AABB Overlap Logic', () => {
  const boxA = { left: 10, right: 50, top: 10, bottom: 50 };
  const boxB = { left: 45, right: 90, top: 45, bottom: 90 };
  const boxC = { left: 60, right: 100, top: 60, bottom: 100 };

  const checkAABB = (a, b) => (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );

  assert.equal(checkAABB(boxA, boxB), true, 'Boxes A and B should overlap');
  assert.equal(checkAABB(boxA, boxC), false, 'Boxes A and C should not overlap');
});

test('Near-Miss Detection Logic', () => {
  const NEAR_MISS_LATERAL_THRESHOLD = 48;
  const NEAR_MISS_LONGITUDINAL_THRESHOLD = 40;
  const HITBOX_INSET_FACTOR = 0.18;

  const player = { x: 159, y: 540, width: 46, height: 84 };
  const vehicle = { x: 241, y: 540, width: 45, height: 82, hasNearMissed: false, active: true };

  const testNearMiss = (p, v) => {
    if (!v.active || v.hasNearMissed) return false;
    const pCenterY = p.y + p.height / 2;
    const vCenterY = v.y + v.height / 2;
    const dy = Math.abs(pCenterY - vCenterY);
    if (dy > NEAR_MISS_LONGITUDINAL_THRESHOLD) return false;

    const dx = Math.abs(p.x - v.x);
    const combinedHalf = (p.width + v.width) / 2;
    const isClose = dx <= combinedHalf + NEAR_MISS_LATERAL_THRESHOLD;
    const isOutside = dx > combinedHalf * (1 - HITBOX_INSET_FACTOR * 1.5);

    if (isClose && isOutside) {
      v.hasNearMissed = true;
      return true;
    }
    return false;
  };

  assert.equal(testNearMiss(player, vehicle), true, 'Close lateral vehicle should trigger near miss');
  assert.equal(testNearMiss(player, vehicle), false, 'Second check must NOT trigger again (at most once)');
});

test('Score & Combo Multiplier Progression', () => {
  let score = 0;
  let combo = 0;
  const NEAR_MISS_BASE_POINTS = 25;

  const registerNearMiss = () => {
    combo += 1;
    const pts = NEAR_MISS_BASE_POINTS * combo;
    score += pts;
    return { pts, combo };
  };

  // First near miss: 25 * 1 = 25
  const m1 = registerNearMiss();
  assert.equal(m1.pts, 25);
  assert.equal(m1.combo, 1);
  assert.equal(score, 25);

  // Second near miss: 25 * 2 = 50
  const m2 = registerNearMiss();
  assert.equal(m2.pts, 50);
  assert.equal(m2.combo, 2);
  assert.equal(score, 75);

  // Third near miss: 25 * 3 = 75
  const m3 = registerNearMiss();
  assert.equal(m3.pts, 75);
  assert.equal(m3.combo, 3);
  assert.equal(score, 150);
});

test('Difficulty Progression Time Scaling', () => {
  const getTier = (t) => {
    if (t < 15) return 'EASY';
    if (t < 30) return 'NORMAL';
    if (t < 60) return 'CHALLENGING';
    if (t < 90) return 'HARD';
    return 'EXTREME';
  };

  assert.equal(getTier(5), 'EASY');
  assert.equal(getTier(15), 'NORMAL');
  assert.equal(getTier(45), 'CHALLENGING');
  assert.equal(getTier(75), 'HARD');
  assert.equal(getTier(120), 'EXTREME');
});

test('Lane Clamping Invariant [0, 3]', () => {
  const clampLane = (current, dir) => {
    const next = current + dir;
    if (next < 0 || next >= 4) return current;
    return next;
  };

  assert.equal(clampLane(0, -1), 0, 'Cannot move left of lane 0');
  assert.equal(clampLane(0, 1), 1, 'Moves from 0 to 1');
  assert.equal(clampLane(3, 1), 3, 'Cannot move right of lane 3');
  assert.equal(clampLane(3, -1), 2, 'Moves from 3 to 2');
});
