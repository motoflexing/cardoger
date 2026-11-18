# 🏎️ Traffic Escape (V1 Production Release)
**MotoFlexing Games** &bull; Mobile-First Portrait Endless Traffic Dodger

A high-speed, 60 FPS, responsive arcade traffic-dodging web application engineered with **React, TypeScript, HTML5 Canvas, Tailwind CSS, Web Audio API, and Playwright**.

---

## 🕹️ Architecture & Engineering Highlights

### 1. Strict Separation of Concerns
- **Canvas-Only Rendering:** All gameplay elements (road surface, modulo dashed lines, player vehicle, traffic archetypes, coins, particles, floating near-miss popups, and camera shake) render inside a single `<canvas>` element driven by `requestAnimationFrame`. Zero game entities exist in the React DOM.
- **React Role:** React manages solely application state machine overlays (`MENU`, `PAUSED`, `GAME_OVER`), the HUD bar, and persistent settings.
- **Throttled HUD Updates:** Score and status updates to React are throttled to 10 Hz (or on discrete events), keeping React out of the 60 FPS rendering path.

### 2. Custom Arcade Physics & Fixed-Timestep Loop
- **Deterministic Fixed Step:** Custom simulation ticker running at `1/60s` (16.666ms) with an accumulator.
- **Delta-Time Clamping:** Clamped to `0.25s` maximum to prevent the spiral of death when switching browser tabs.
- **DPR & Responsive Scaling:** Handles `window.devicePixelRatio` cleanly up to 3x with uniform scaling and zero aspect ratio distortion across mobile, tablet, and desktop viewports.
- **No Heavy Physics Engine Overhead:** Zero dependencies on Box2D, Matter.js, or Phaser.

### 3. Object Pooling & Memory Hygiene
- **Pre-allocated Pools:**
  - `TrafficManager`: 30 pre-allocated `TrafficVehicle` instances.
  - `CoinManager`: 25 pre-allocated `CoinEntity` instances.
  - `GameEngine`: 60 visual FX `ParticleEntity` instances and 15 `FloatingPopup` instances.
- **Zero GC Spikes:** Active entities are recycled back to pool stacks upon exiting the viewport or collection.

### 4. Gameplay & Mechanics
- **Player Movement:** Discrete lanes `[0, 3]`, smooth cosine interpolation over ~130ms, and dynamic steering body tilt. Never teleports.
- **Input Buffering:** Queues up to 1 rapid consecutive lane change while in active transition.
- **Fairness Guarantee:** The spawner checks longitudinal lane clearings and ensures at least one escape corridor is always guaranteed.
- **4 Traffic Archetypes:** Small Car (agile, compact), Sedan (standard), SUV (rugged, boxy), and Truck (long hauler with corrugated trailer).
- **Collisions & Inset Hitboxes:** Collision boxes are inset by 18% from visual boundaries for fair bumper-to-bumper gameplay.
- **Near-Miss System:** Triggers when passing vehicles in close longitudinal/lateral proximity without colliding. Chains consecutive combo multipliers (`+25 pts × combo`), floating text popups, ascending pitch audio, and mobile haptics (`navigator.vibrate?.(20)`).
- **Procedural Web Audio API:** Zero external MP3 dependency failures. Synthesizes engine revs, tire swooshes, coin chimes, rising harmonic combo pings, crunch crashes, and melancholic game over stings. Autoplay safe (initialized on user gesture).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build
```bash
npm run build
npm run preview
```

### Testing Suite
```bash
# Run deterministic physics and logic unit tests:
npm run test

# Run full Playwright End-to-End tests (Mobile Chrome + Desktop Chrome):
npm run test:e2e
```

---

## 📂 Source Code Structure
```text
src/
├── game/
│   ├── GameEngine.ts        # Fixed-timestep loop, state machine, DPR scaling, pools
│   ├── Road.ts              # Procedural asphalt texture, modulo dashed dividers, rumble strips
│   ├── Player.ts            # Lane interpolation (130ms), tilt dynamics, car vector graphics
│   ├── TrafficManager.ts    # Object pool, 4 archetypes, fair multi-lane spawner
│   ├── CoinManager.ts       # Coin pool, 3D spin rendering, sparkling pickup animation
│   ├── DifficultyManager.ts # Survival time scaling (Cruising -> Maximum Heat)
│   ├── ScoreManager.ts      # Survival points, near-miss combos, milestones, localStorage
│   ├── Collision.ts         # AABB calculations with 18% insets & near-miss proximity
│   ├── InputManager.ts      # Touch swipes (single-lane lock), tap zones, keyboard buffer
│   └── AudioManager.ts      # Web Audio API procedural sound synthesizer & mute state
├── components/
│   ├── MainMenu.tsx         # Arcade start screen, high score, total wallet, audio toggle
│   ├── GameHUD.tsx          # Minimal throttled in-game HUD (score, combo, coins, pause)
│   ├── PauseMenu.tsx        # Pause modal with resume, restart, home, audio toggle
│   └── GameOver.tsx         # Post-race report, new record badge, wallet persist, retry
├── types/
│   └── game.ts              # Strong TypeScript interfaces, archetypes, constants
├── App.tsx                  # Root component hosting canvas & overlay state routing
├── main.tsx                 # React entry point
└── index.css                # Mobile-first Tailwind styling & touch-action constraints
```

---

## 🎮 Controls

| Device | Control | Action |
| :--- | :--- | :--- |
| **Mobile** | Horizontal Swipe Left / Right | Move exactly 1 lane (locked until release) |
| **Mobile** | Left / Right Screen Tap | Steer Left / Right |
| **Desktop** | `ArrowLeft` / `ArrowRight` or `A` / `D` | Steer Left / Right |
| **Desktop** | `Space` / `Enter` | Start Race / Retry |
| **Universal** | `P` or `Escape` | Pause / Resume |

---

&copy; MotoFlexing Games. Built for high performance and pure arcade thrill.

