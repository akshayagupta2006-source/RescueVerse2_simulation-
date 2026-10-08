# Contributing to DRTS

## Adding a New Disaster Type

### 1. Create the Phaser Scene

Copy `client/src/game/scenes/FloodScene.js` as your template and implement:

```js
// Required events your scene must emit:
this.events.emit('phaseChange', phaseName);   // whenever phase transitions
this.events.emit('scoreUpdate', score);        // when score changes
this.events.emit('simulationEnd', result);     // when simulation ends

// Required registry keys your scene must set:
this.registry.set('health',  this.health);
this.registry.set('elapsed', Math.round(this.elapsed));
this.registry.set('score',   this.score);
```

The `result` object emitted by `simulationEnd` must match:
```js
{
  score:            Number,
  survivorsHelped:  Number,
  survivorsPanicked:Number,
  survivorsLost:    Number,
  evacuated:        Boolean,
  healthRemaining:  Number,   // 0–100
  decisions:        Array,    // decision log
  durationSeconds:  Number,
}
```

### 2. Register in SceneConfig

```js
// client/src/game/SceneConfig.js
export const SCENE_KEY_MAP = {
  earthquake: 'EarthquakeScene',
  flood:      'FloodScene',     // ← add here
};
```

### 3. Register in GameEngine

```js
// client/src/game/GameEngine.jsx
import FloodScene from './scenes/FloodScene';

scene: [PreloadScene, EarthquakeScene, FloodScene],  // ← add here
```

### 4. Add difficulty config

```js
// client/src/game/SceneConfig.js — DIFFICULTY_CONFIG
// Each difficulty key must have:
{
  npcCount, injuredCount, panickingCount,
  debrisIntervalStrong, debrisIntervalWeak,   // or flood equivalent
  cameraShakeStrong, cameraShakeWeak,
  playerSpeed, healthStart,
  durations: { calm, shaking_strong, shaking_weak, evacuation }
}
```

### 5. Seed MongoDB scenario

Add a document:
```js
{
  name: 'Flash Flood — Level 1',
  description: '...',
  difficulty: 'intermediate',
  type: 'flood',
  durationSeconds: 240,
  active: true,
  objectives: ['...'],
}
```

---

## Adding a New NPC Behaviour

In `EarthquakeScene.js`, NPC state machine lives in `_updateNPCs()`.

States: `idle | injured | panicking | helped | evacuated`

To add a new state (e.g. `trapped`):
1. Add to `NPC_STATE` constant
2. Add color/label in `_renderNPC()`
3. Handle movement in `_updateNPCs()`
4. Add interaction logic in `_tryInteractNPC()`

---

## Adding a New API Route

1. Add controller method to `server/controllers/`
2. Register route in `server/routes/`
3. Add test case in `server/tests/api.test.js`
4. Add API helper in `client/src/services/results.js`

---

## Code Style

- **Server**: CommonJS (`require`/`module.exports`), async/await, Express error pattern
- **Client**: ESM (`import`/`export`), React functional components with hooks
- **Phaser**: Class-based scenes extending `Phaser.Scene`
- **CSS**: CSS custom properties (`var(--token)`), no external CSS frameworks

---

## Project Checklist for New Scenarios

- [ ] Phaser scene implemented with all 4 required phases
- [ ] Scene emits `phaseChange`, `scoreUpdate`, `simulationEnd`
- [ ] Scene registered in `SCENE_KEY_MAP` and `GameEngine.jsx`
- [ ] Difficulty config added for all 3 levels
- [ ] MongoDB scenario document seeded (or migration written)
- [ ] Backend `scenarioType` enum updated in `TrainingResult.js`
- [ ] Test coverage added in `api.test.js`
