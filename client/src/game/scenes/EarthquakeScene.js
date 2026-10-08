/**
 * EarthquakeScene.js — Phaser 3 Disaster Response Training Simulation
 *
 * Architecture:
 *   - Uses NPCManager for all NPC behaviour
 *   - Reads difficulty config from Phaser registry (injected by GameEngine)
 *   - Emits 'phaseChange', 'scoreUpdate', 'simulationEnd' events for React HUD
 *
 * Controls:
 *   WASD / Arrow keys  — Move player
 *   SPACE              — Take cover (must be near a desk/table)
 *   E                  — Help nearest injured or panicking NPC
 */

import Phaser from "phaser";
import NPCManager from "../NPCManager.js";
import AnimationManager from "../AnimationManager.js";
import EnvironmentManager from "../EnvironmentManager.js";
import { DIFFICULTY_CONFIG } from "../SceneConfig.js";

// ── Constants ────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;

const PHASE = {
  CALM: "calm",
  SHAKING_STRONG: "shaking_strong",
  SHAKING_WEAK: "shaking_weak",
  EVACUATION: "evacuation",
  END: "end",
};

const SCORE = {
  TAKE_COVER: 50,
  EVACUATE_SAFE: 200,
  EVACUATE_NPC: 80,
  OUTSIDE_SHAKING: -10, // per second while exposed
  DEBRIS_HIT: -60,
};

export default class EarthquakeScene extends Phaser.Scene {
  constructor() {
    super({ key: "EarthquakeScene" });
    this.phase = PHASE.CALM;
    this.score = 0;
    this.health = 100;
    this.elapsed = 0;
    this.decisions = [];
    this.isCovered = false;
    this.debrisTimer = null;
    this.phaseTimer = null;
    this.penaltyAccum = 0;
    this.cfg = DIFFICULTY_CONFIG.beginner;
    this.DURATIONS = {};
    this.dustEmitter = null;
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  create() {
    // Pull difficulty config from registry (set by GameEngine before scene start)
    const difficulty = this.registry.get("difficulty") || "beginner";
    this.cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.beginner;
    this.DURATIONS = { ...this.cfg.durations };
    this.health = this.cfg.healthStart || 100;
    this.playerSpeed = this.cfg.playerSpeed || 140;

    this._buildWorld();
    this._spawnPlayer();

    // NPCManager handles all NPC rendering, movement, and interaction
    this.npcMgr = new NPCManager(this, {
      count: this.cfg.npcCount || 8,
      injured: this.cfg.injuredCount || 2,
      panicking: this.cfg.panickingCount || 2,
      exitX: this.exitZone.centerX,
      exitY: this.exitZone.centerY,
    });
    this.npcMgr.spawn({ x: 40, y: 40, w: W - 80, h: H - 80 });

    this._buildHUD();
    this._setupInput();
    this._initializeParticleEffects();
    this._startPhase(PHASE.CALM);

    // Expose scene to React polling
    this.registry.set("scene", this);
  }

  // ── World ────────────────────────────────────────────────────────────────────
  _buildWorld() {
    // Use modular environment manager for all rendering
    this.envMgr = new EnvironmentManager(this);
    this.coverZones = this.envMgr.buildEnvironment(W, H);

    // Add exit label on top of environment layers
    this.exitLabel = this.add
      .text(this.exitZone.x + 4, this.exitZone.y + 14, "EXIT", {
        fontFamily: "Bebas Neue, sans-serif",
        fontSize: "18px",
        color: "#3fb950",
        alpha: 0.5,
      })
      .setDepth(5);

    // ── Visual FX layers ──────────────────────────────────────────────────────
    // Cracks appear on top of environment but below characters
    this.crackGfx = this.add.graphics().setDepth(6).setVisible(false);
    // Shake overlay for visual feedback
    this.shakeOverlay = this.add
      .rectangle(0, 0, W, H, 0xf85149, 0)
      .setOrigin(0)
      .setDepth(7);
  }

  // ── Player ───────────────────────────────────────────────────────────────────
  _spawnPlayer() {
    this.playerPos = new Phaser.Math.Vector2(W / 2, H / 2);

    // Choose a player texture: prefer per-action spritesheet 'player_idle', fall back to 'player'
    let spriteKey = null;
    if (
      this.textures &&
      this.textures.exists &&
      this.textures.exists("player_idle")
    ) {
      spriteKey = "player_idle";
    } else if (
      this.textures &&
      this.textures.exists &&
      this.textures.exists("player")
    ) {
      spriteKey = "player";
    }

    // If no texture exists yet, create a small procedural fallback texture named 'player'
    if (!spriteKey) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x58a6ff, 1);
      g.fillCircle(16, 18, 11);
      g.fillStyle(0x9ecfff, 1);
      g.fillCircle(16, 7, 6);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(16, 0, 3);
      g.generateTexture("player", 32, 32);
      g.destroy();
      spriteKey = "player";
    }

    this.player = this.physics.add.sprite(
      this.playerPos.x,
      this.playerPos.y,
      spriteKey,
    );
    this.player.setOrigin(0.5, 0.95);
    this.player.setScale(0.82);
    this.player.setDepth(10);

    // Align physics body to the character's lower-body region for natural standing/collision alignment
    const bodyWidth = 40;
    const bodyHeight = 68;
    const bodyOffsetX = Math.round(
      (this.player.displayWidth - bodyWidth) * 0.5,
    );
    const bodyOffsetY = Math.round(
      this.player.displayHeight * 0.95 - bodyHeight,
    );
    this.player.body.setSize(bodyWidth, bodyHeight);
    this.player.body.setOffset(bodyOffsetX, bodyOffsetY);

    // Add label
    this.playerLabel = this.add
      .text(this.playerPos.x, 0, "YOU", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "9px",
        color: "#58a6ff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11);

    this._positionPlayerLabel();

    // Initialize animation manager and register animations
    this.animMgr = new AnimationManager(this);
    try {
      this.animMgr.registerPlayerAnimations();
    } catch (e) {
      console.warn(
        "Player animations unavailable (no spritesheet):",
        e.message,
      );
    }

    // Start with idle animation if available
    if (this.animMgr.has("player_idle")) {
      this.player.play("player_idle");
    }
    this.playerState = "idle";

    this._updatePlayerVisuals();
  }

  _positionPlayerLabel() {
    const labelY = this.player.y - this.player.displayHeight * 0.52;
    this.playerLabel.setPosition(this.player.x, labelY);
  }

  _updatePlayerVisuals() {
    // Update player sprite position
    this.player.setPosition(this.playerPos.x, this.playerPos.y);
    this._positionPlayerLabel();

    // Visual feedback for cover state
    if (this.isCovered) {
      this.player.setAlpha(0.6);
      this.player.setTint(0x2a3f5a);
    } else {
      this.player.setAlpha(1);
      this.player.clearTint();
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────────
  _setupInput() {
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    this.input.keyboard.on("keydown-SPACE", this._tryTakeCover, this);
    this.input.keyboard.on("keydown-E", this._tryInteract, this);
  }

  _tryTakeCover() {
    if (this.phase === PHASE.END) return;

    const nearCover = this.coverZones.some((z) =>
      Phaser.Geom.Rectangle.Contains(z, this.playerPos.x, this.playerPos.y),
    );

    if (!this.isCovered && nearCover) {
      this.isCovered = true;
      this._updatePlayerVisuals();
      this._log("took_cover", null, SCORE.TAKE_COVER);
      this._addScore(SCORE.TAKE_COVER);
      this._msg("COVER TAKEN — debris risk reduced", "#3fb950");
    } else if (this.isCovered) {
      this.isCovered = false;
      this._updatePlayerVisuals();
      this._msg("EXPOSED — find cover during shaking!", "#e3b341");
    } else {
      this._msg("NO COVER NEARBY — move to a desk first", "#e3b341");
    }
  }

  _tryInteract() {
    if (this.phase === PHASE.END) return;
    const result = this.npcMgr.tryInteract(
      this.playerPos.x,
      this.playerPos.y,
      52,
    );
    if (!result) {
      this._msg("NO ONE TO HELP NEARBY — press E near an NPC", "#7d8590");
      return;
    }

    this._log(result.action, result.npcId, result.pts);
    this._addScore(result.pts);

    const label =
      result.action === "helped_npc"
        ? `+${result.pts}  INJURED CIVILIAN STABILISED`
        : `+${result.pts}  CIVILIAN CALMED`;
    const color = result.action === "helped_npc" ? "#3fb950" : "#58a6ff";
    this._msg(label, color);
  }

  // ── Phase control ─────────────────────────────────────────────────────────────
  _startPhase(phase) {
    this.phase = phase;
    this.events.emit("phaseChange", phase);
    if (this.phaseTimer) {
      this.phaseTimer.remove();
      this.phaseTimer = null;
    }

    if (phase === PHASE.CALM) {
      this._msg(
        "STANDBY — Seismic sensors detecting unusual activity",
        "#3fb950",
      );
      this.phaseTimer = this.time.delayedCall(this.DURATIONS.calm * 1000, () =>
        this._startPhase(PHASE.SHAKING_STRONG),
      );
    } else if (phase === PHASE.SHAKING_STRONG) {
      this._msg("⚡ EARTHQUAKE! DROP, COVER, HOLD ON!", "#f85149");
      this.cameras.main.shake(600, this.cfg.cameraShakeStrong || 0.018);
      this._startDebris(this.cfg.debrisIntervalStrong || 2000);
      this._applyCracks();
      this.shakeOverlay.setAlpha(0.07);
      // Pulse exit brighter
      this.exitLabel.setAlpha(0.8);
      this.phaseTimer = this.time.delayedCall(
        this.DURATIONS.shaking_strong * 1000,
        () => this._startPhase(PHASE.SHAKING_WEAK),
      );
    } else if (phase === PHASE.SHAKING_WEAK) {
      this._msg(
        "AFTERSHOCK — Shaking subsiding. Prepare to evacuate.",
        "#e3b341",
      );
      this.cameras.main.shake(300, this.cfg.cameraShakeWeak || 0.007);
      this._startDebris(this.cfg.debrisIntervalWeak || 4000);
      this.shakeOverlay.setAlpha(0.03);
      this.phaseTimer = this.time.delayedCall(
        this.DURATIONS.shaking_weak * 1000,
        () => this._startPhase(PHASE.EVACUATION),
      );
    } else if (phase === PHASE.EVACUATION) {
      this._msg(
        "EVACUATION WINDOW OPEN — Reach the EXIT! (bottom-right)",
        "#58a6ff",
      );
      this._stopDebris();
      this.shakeOverlay.setAlpha(0);
      // Blink exit zone
      this.tweens.add({
        targets: this.exitLabel,
        alpha: 1,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
      // Penalise ignored injured NPCs
      this.npcMgr.collectIgnorePenalties().forEach((p) => {
        this._log(p.action, p.npcId, p.pts);
        this._addScore(p.pts);
      });
      this.phaseTimer = this.time.delayedCall(
        this.DURATIONS.evacuation * 1000,
        () => this._endSim(false),
      );
    } else if (phase === PHASE.END) {
      this._endSim(true);
    }
  }

  // ── Debris system ─────────────────────────────────────────────────────────────
  _startDebris(intervalMs) {
    this._stopDebris();
    this.time.delayedCall(700, this._dropDebris, [], this);
    this.debrisTimer = this.time.addEvent({
      delay: intervalMs,
      loop: true,
      callback: this._dropDebris,
      callbackScope: this,
    });
  }

  _stopDebris() {
    if (this.debrisTimer) {
      this.debrisTimer.remove();
      this.debrisTimer = null;
    }
  }

  _dropDebris() {
    if (this.phase === PHASE.EVACUATION || this.phase === PHASE.END) return;

    const cx = Phaser.Math.Between(36, W - 36);
    const cy = Phaser.Math.Between(36, H - 36);

    // Warning shadow with pulsing effect
    const warn = this.add.graphics().setDepth(6);
    warn.fillStyle(0xf85149, 0.18);
    warn.fillCircle(cx, cy, 20);
    warn.lineStyle(2, 0xf85149, 0.8);
    warn.strokeCircle(cx, cy, 20);

    // Pulse warning effect
    this.tweens.add({
      targets: warn,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 500,
      ease: "Quad.easeOut",
    });

    this.time.delayedCall(750, () => {
      warn.destroy();

      const d = this.add.graphics().setDepth(7);
      const size = Phaser.Math.Between(12, 24);
      const shape = Phaser.Math.Between(0, 2);

      d.fillStyle(0x484f58, 1);
      d.lineStyle(2, 0x30363d, 1);

      if (shape === 0) {
        d.fillRect(cx - size / 2, cy - size / 3, size, size * 0.65);
        d.strokeRect(cx - size / 2, cy - size / 3, size, size * 0.65);
        // Add inner highlight
        d.fillStyle(0x666c74, 0.5);
        d.fillRect(cx - size / 2 + 2, cy - size / 3 + 2, size - 4, size * 0.65 - 4);
      } else if (shape === 1) {
        d.fillTriangle(
          cx,
          cy - size / 2,
          cx - size / 2,
          cy + size / 2,
          cx + size / 2,
          cy + size / 2,
        );
      } else {
        d.fillRect(cx - size, cy - size / 4, size * 2, size / 2);
        d.strokeRect(cx - size, cy - size / 4, size * 2, size / 2);
      }

      // Collision check
      const dist = Phaser.Math.Distance.Between(
        this.playerPos.x,
        this.playerPos.y,
        cx,
        cy,
      );
      if (dist < 28 + size / 2) {
        if (this.isCovered) {
          this._msg("Debris deflected — cover is working!", "#3fb950");
        } else {
          const dmg = Phaser.Math.Between(14, 22);
          this.health = Math.max(0, this.health - dmg);
          this._log("hit_by_debris", null, SCORE.DEBRIS_HIT);
          this._addScore(SCORE.DEBRIS_HIT);
          this._msg(`DEBRIS HIT! −${dmg} HP`, "#f85149");
          this.cameras.main.shake(180, 0.011);
          // Visual impact effects
          this._emitDust(cx, cy, 15);
          this._flashScreen(120, 0.4);
          // Play hurt animation if available
          try {
            if (
              this.animMgr &&
              this.animMgr.has &&
              this.animMgr.has("player_hurt")
            ) {
              this.player.play("player_hurt");
            }
          } catch (e) {
            /* ignore */
          }

          // If health reached zero, play death animation if available then end simulation
          if (this.health <= 0) {
            try {
              if (
                this.animMgr &&
                this.animMgr.has &&
                this.animMgr.has("player_death")
              ) {
                this.player.play("player_death");
              }
            } catch (e) {
              /* ignore */
            }
            this._endSim(false);
          }
        }
      }

      // Emit dust particles on all debris impacts
      this._emitDust(cx, cy, 8);

      this.tweens.add({
        targets: d,
        alpha: 0,
        delay: 3500,
        duration: 600,
        onComplete: () => d.destroy(),
      });
    });
  }

  // ── Visual effects ────────────────────────────────────────────────────────────
  _applyCracks() {
    this.crackGfx.setVisible(true).clear();

    // Multiple passes for subtle glow effect
    this.crackGfx.lineStyle(3, 0x3d4450, 0.2);
    for (let i = 0; i < 8; i++) {
      let cx = Phaser.Math.Between(20, W - 20);
      let cy = Phaser.Math.Between(20, H - 20);
      for (let j = 0; j < 6; j++) {
        const nx = cx + Phaser.Math.Between(-36, 36);
        const ny = cy + Phaser.Math.Between(-36, 36);
        this.crackGfx.lineBetween(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
      }
    }

    // Main cracks with variable thickness
    this.crackGfx.lineStyle(1, 0x3d4450, 0.7);
    for (let i = 0; i < 8; i++) {
      let cx = Phaser.Math.Between(20, W - 20);
      let cy = Phaser.Math.Between(20, H - 20);
      for (let j = 0; j < 6; j++) {
        const nx = cx + Phaser.Math.Between(-36, 36);
        const ny = cy + Phaser.Math.Between(-36, 36);
        this.crackGfx.lineBetween(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
      }
    }
  }

  // ── Particle effects ──────────────────────────────────────────────────────────
  _initializeParticleEffects() {
    // Create a small dust particle texture if not already present
    if (!this.textures.exists("dust_particle")) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xc8c8c8, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture("dust_particle", 4, 4);
      g.destroy();
    }

    // Create dust particle emitter with enhanced visibility
    this.dustEmitter = this.add.particles(0, 0, "dust_particle", {
      speed: { min: -100, max: 100 },
      angle: { min: 200, max: 340 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.9, end: 0.0 },
      lifespan: 1000,
      gravityY: 250,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Circle(0, 0, 20),
      },
    });
    this.dustEmitter.stop();
    this.dustEmitter.setDepth(8);
  }

  _emitDust(x, y, count = 10) {
    if (this.dustEmitter) {
      this.dustEmitter.emitParticleAt(x, y, count);
    }
  }

  _flashScreen(duration = 100, intensity = 0.6) {
    this.shakeOverlay.setAlpha(intensity);
    this.tweens.add({
      targets: this.shakeOverlay,
      alpha: 0,
      duration,
      ease: "Quad.easeOut",
    });
  }

  // ── Evacuation check ──────────────────────────────────────────────────────────
  _checkEvacuation() {
    if (this.phase !== PHASE.EVACUATION) return;
    if (
      Phaser.Geom.Rectangle.Contains(
        this.exitZone,
        this.playerPos.x,
        this.playerPos.y,
      )
    ) {
      const escorted = this.npcMgr.survivorsHelped;
      const pts = SCORE.EVACUATE_SAFE + escorted * SCORE.EVACUATE_NPC;
      this._log("evacuated", null, pts);
      this._addScore(pts);
      this._endSim(true);
    }
  }

  // ── Scoring ───────────────────────────────────────────────────────────────────
  _addScore(pts) {
    this.score = Math.max(0, this.score + pts);
    this.registry.set("score", this.score);
    this.events.emit("scoreUpdate", this.score);
  }

  _log(action, target, scoreImpact) {
    this.decisions.push({
      timestamp: Math.round(this.elapsed),
      phase: this.phase,
      action,
      target: target || null,
      scoreImpact: scoreImpact || 0,
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────
  _buildHUD() {
    // Bottom message strip
    this.hudMsg = this.add
      .text(W / 2, H - 18, "", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "11px",
        color: "#e6edf3",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Controls reminder
    this.add
      .text(14, H - 11, "WASD: Move  ·  SPACE: Cover  ·  E: Help NPC", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "9px",
        color: "#30363d",
      })
      .setDepth(20);

    this.hudMsgTimer = null;
  }

  _msg(text, color = "#e6edf3") {
    this.hudMsg.setText(text).setColor(color);
    if (this.hudMsgTimer) this.hudMsgTimer.remove();
    this.hudMsgTimer = this.time.delayedCall(3200, () =>
      this.hudMsg.setText(""),
    );
  }

  // ── End simulation ────────────────────────────────────────────────────────────
  _endSim(evacuated) {
    if (this.phase === PHASE.END) return;
    this.phase = PHASE.END;
    if (this.phaseTimer) {
      this.phaseTimer.remove();
      this.phaseTimer = null;
    }
    this._stopDebris();

    const result = {
      score: this.score,
      survivorsHelped: this.npcMgr.survivorsHelped,
      survivorsPanicked: this.npcMgr.survivorsPanicked,
      survivorsLost: this.npcMgr.survivorsLost,
      evacuated,
      healthRemaining: this.health,
      decisions: this.decisions,
      durationSeconds: Math.round(this.elapsed),
    };

    this.events.emit("simulationEnd", result);
    this.registry.set("result", result);
  }

  // ── Update loop ───────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this.phase === PHASE.END) return;

    this.elapsed += delta / 1000;

    // ── Player movement ────────────────────────────────────────────────────
    const speed = this.playerSpeed * (delta / 1000);
    const { w, s, a, d, up, down, left, right } = this.keys;
    let dx = 0,
      dy = 0;

    if (w.isDown || up.isDown) dy = -speed;
    if (s.isDown || down.isDown) dy = speed;
    if (a.isDown || left.isDown) dx = -speed;
    if (d.isDown || right.isDown) dx = speed;

    const isMoving = dx !== 0 || dy !== 0;
    const movementDisabled = this.phase === PHASE.END || this.playerSpeed <= 0;
    const shouldIdle = this.isCovered || !isMoving || movementDisabled;

    if (isMoving && !this.isCovered && !movementDisabled) {
      this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x + dx, 20, W - 20);
      this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y + dy, 20, H - 20);
      this.player.setPosition(this.playerPos.x, this.playerPos.y);
      this._positionPlayerLabel();

      if (this.animMgr.has("player_walk")) {
        if (this.playerState !== "walk") {
          this.player.play("player_walk", true);
          this.playerState = "walk";
        }
      }
    } else {
      if (this.isCovered && this.playerState !== "idle") {
        if (this.animMgr.has("player_idle")) {
          this.player.play("player_idle", true);
        }
        this.playerState = "idle";
      }

      if (!isMoving && this.playerState !== "idle") {
        if (this.animMgr.has("player_idle")) {
          this.player.play("player_idle", true);
        }
        this.playerState = "idle";
      }
    }

    // ── NPC update ─────────────────────────────────────────────────────────
    this.npcMgr.update(delta, this.phase, this.exitZone);

    // ── Evacuation check ───────────────────────────────────────────────────
    this._checkEvacuation();

    // ── Exposure penalty ───────────────────────────────────────────────────
    if (this.phase === PHASE.SHAKING_STRONG && !this.isCovered) {
      this.penaltyAccum += delta;
      if (this.penaltyAccum >= 1000) {
        this.penaltyAccum = 0;
        this._log("outside_shaking", null, SCORE.OUTSIDE_SHAKING);
        this._addScore(SCORE.OUTSIDE_SHAKING);
      }
    } else {
      this.penaltyAccum = 0;
    }

    // ── Random micro-shakes and visual pulses during strong phase ────────────────────────
    if (this.phase === PHASE.SHAKING_STRONG) {
      if (Math.random() < 0.025) {
        this.cameras.main.shake(100, 0.005);
      }
      // Occasional intense pulses with flash
      if (Math.random() < 0.008) {
        this.cameras.main.shake(150, 0.012);
        this._flashScreen(80, 0.15);
      }
    }

    // ── Registry sync for React HUD ────────────────────────────────────────
    this.registry.set("health", this.health);
    this.registry.set("elapsed", Math.round(this.elapsed));
    this.registry.set("score", this.score);
  }
}
