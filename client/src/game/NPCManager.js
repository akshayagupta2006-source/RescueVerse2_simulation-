import Phaser from "phaser";
import AnimationManager from "./AnimationManager";

/**
 * NPCManager.js
 * Reusable NPC behaviour engine for Phaser disaster scenes.
 *
 * Usage:
 *   import NPCManager from '../NPCManager';
 *   this.npcManager = new NPCManager(this, { count: 8, injured: 2, panicking: 2 });
 *   this.npcManager.spawn(bounds);
 *   // In update():
 *   this.npcManager.update(delta, phase, exitZone);
 *   // Interact:
 *   this.npcManager.tryInteract(playerX, playerY, range);
 */

const NPC_STATE = {
  IDLE: "idle",
  INJURED: "injured",
  PANICKING: "panicking",
  HELPED: "helped",
  EVACUATED: "evacuated",
};

const STATE_CONFIG = {
  idle: { color: 0xe6edf3, label: "CALM", speed: 0.6, moveInterval: 1800 },
  injured: {
    color: 0xf85149,
    label: "! INJURED",
    speed: 0,
    moveInterval: 99999,
  },
  panicking: {
    color: 0xe3b341,
    label: "!! PANIC",
    speed: 2.8,
    moveInterval: 280,
  },
  helped: {
    color: 0x3fb950,
    label: "✓ STABLE",
    speed: 0.3,
    moveInterval: 3000,
  },
  carried: {
    color: 0xfbbf24,
    label: "CARRIED",
    speed: 0,
    moveInterval: 99999,
  },
  evacuated: { color: 0x58a6ff, label: "→ OUT", speed: 0, moveInterval: 99999 },
};

const NPC_PACKS = ["city_men_2", "city_men_3"];
const NPC_SCALE = 0.82;
const NPC_ORIGIN_Y = 0.95;

const SCORE_EVENTS = {
  HELP_INJURED: { action: "helped_npc", pts: 150 },
  CALM_PANICKING: { action: "calmed_npc", pts: 100 },
  IGNORE_PENALTY: { action: "ignored_npc", pts: -80 },
};

export default class NPCManager {
  /**
   * @param {Phaser.Scene} scene     - The Phaser scene instance
   * @param {object} cfg
   * @param {number} cfg.count       - Total NPC count
   * @param {number} cfg.injured     - How many start as injured
   * @param {number} cfg.panicking   - How many start as panicking
   * @param {number} cfg.exitX       - Exit zone centre X
   * @param {number} cfg.exitY       - Exit zone centre Y
   */
  constructor(scene, cfg = {}) {
    this.scene = scene;
    this.cfg = cfg;
    this.npcs = [];
    this.exitX = cfg.exitX || 750;
    this.exitY = cfg.exitY || 570;
    this.animMgr = new AnimationManager(scene);

    if (!this.scene.anims.exists("npc_idle")) {
      this.animMgr.registerNPCAnimations();
    }
  }

  // ── Spawn ───────────────────────────────────────────────────────────────────
  spawn(bounds = { x: 40, y: 40, w: 720, h: 520 }) {
    const {
      count = 8,
      injured: injCount = 2,
      panicking: panCount = 2,
    } = this.cfg;

    const types = [];
    for (let i = 0; i < injCount; i++) types.push(NPC_STATE.INJURED);
    for (let i = 0; i < panCount; i++) types.push(NPC_STATE.PANICKING);
    while (types.length < count) types.push(NPC_STATE.IDLE);

    // Shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    for (let i = 0; i < count; i++) {
      const x = bounds.x + Math.random() * bounds.w;
      const y = bounds.y + Math.random() * bounds.h;
      this.npcs.push(this._create(x, y, types[i], `NPC_${i}`));
    }
  }

  _selectNPCPack() {
    return NPC_PACKS[Math.floor(Math.random() * NPC_PACKS.length)];
  }

  _getNpcAnimationKey(npc, base) {
    const variantKey = `${base}_${npc.variant}`;
    if (this.scene.anims.exists(variantKey)) return variantKey;
    if (this.scene.anims.exists(base)) return base;
    return null;
  }

  _ensureFallbackTexture() {
    const fallbackKey = "npc_fallback";
    if (!this.scene.textures.exists(fallbackKey)) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0xe6edf3, 1);
      g.fillRoundedRect(0, 12, 30, 40, 10);
      g.fillStyle(0x8b94a3, 1);
      g.fillCircle(15, 8, 6);
      g.generateTexture(fallbackKey, 32, 56);
      g.destroy();
    }
    return fallbackKey;
  }

  _applyNPCAnimation(npc) {
    if (!npc.sprite) return;
    let action;
    if (npc.state === NPC_STATE.INJURED) {
      action = "npc_hurt";
    } else if (npc.state === NPC_STATE.EVACUATED) {
      action = "npc_idle";
    } else {
      const moving = npc.dx !== 0 || npc.dy !== 0;
      if (moving) {
        if (
          npc.state === NPC_STATE.PANICKING &&
          this.scene.anims.exists("npc_run")
        ) {
          action = "npc_run";
        } else {
          action = "npc_walk";
        }
      } else {
        action = "npc_idle";
      }
    }

    const key = this._getNpcAnimationKey(npc, action);
    if (!key) return;
    if (npc.currentAnim === key) return;
    npc.sprite.play(key, true);
    npc.currentAnim = key;
  }

  _create(x, y, state, id) {
    const { scene } = this;
    const variant = this._selectNPCPack();
    const textureKey = `${variant}_idle`;
    const finalTexture = scene.textures.exists(textureKey)
      ? textureKey
      : this._ensureFallbackTexture();

    const sprite = scene.add
      .sprite(x, y, finalTexture)
      .setOrigin(0.5, NPC_ORIGIN_Y)
      .setScale(NPC_SCALE)
      .setDepth(9);

    const label = scene.add
      .text(x, y - 22, "", {
        fontFamily: "Share Tech Mono, monospace",
        fontSize: "9px",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11);

    const npc = {
      id,
      x,
      y,
      state,
      variant,
      sprite,
      label,
      currentAnim: null,
      moveTimer: Math.random() * 1000,
      dx: 0,
      dy: 0,
      targetX: x,
      targetY: y,
    };

    this._render(npc);
    return npc;
  }

  _positionNpcLabel(npc) {
    return npc.sprite.y - (npc.sprite.displayHeight * 0.52);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  _render(npc) {
    const cfg = STATE_CONFIG[npc.state] || STATE_CONFIG.idle;

    npc.sprite.setVisible(true);
    npc.sprite.setPosition(npc.x, npc.y);
    this._applyNPCAnimation(npc);

    const labelY = this._positionNpcLabel(npc);
    npc.label.setPosition(npc.x, labelY);
    npc.label.setText(cfg.label);
    npc.label.setColor(
      npc.state === NPC_STATE.INJURED
        ? "#f85149"
        : npc.state === NPC_STATE.PANICKING
          ? "#e3b341"
          : npc.state === NPC_STATE.HELPED
            ? "#3fb950"
            : npc.state === NPC_STATE.EVACUATED
              ? "#58a6ff"
              : "#484f58",
    );
  }

  // ── Update (called each frame) ───────────────────────────────────────────────
  update(delta, phase, exitZone) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.npcs.forEach((npc) => {
      if (npc.state === NPC_STATE.EVACUATED) return;

      const cfg = STATE_CONFIG[npc.state];

      // ── Change move target periodically ───────────────────────────────────
      npc.moveTimer -= delta;
      if (npc.moveTimer <= 0) {
        npc.moveTimer = cfg.moveInterval + Math.random() * 400;

        if (
          phase === "evacuation" &&
          (npc.state === NPC_STATE.IDLE || npc.state === NPC_STATE.HELPED)
        ) {
          // Navigate toward exit
          npc.targetX = this.exitX + (Math.random() - 0.5) * 20;
          npc.targetY = this.exitY + (Math.random() - 0.5) * 20;
        } else {
          // Random wander
          npc.targetX = Phaser.Math.Clamp(
            npc.x + (Math.random() - 0.5) * 120,
            36,
            W - 36,
          );
          npc.targetY = Phaser.Math.Clamp(
            npc.y + (Math.random() - 0.5) * 120,
            36,
            H - 36,
          );
        }

        // Compute direction
        const dist = Phaser.Math.Distance.Between(
          npc.x,
          npc.y,
          npc.targetX,
          npc.targetY,
        );
        if (dist > 2) {
          npc.dx = ((npc.targetX - npc.x) / dist) * cfg.speed;
          npc.dy = ((npc.targetY - npc.y) / dist) * cfg.speed;
        }
      }

      // ── Apply movement ────────────────────────────────────────────────────
      if (cfg.speed > 0) {
        npc.x = Phaser.Math.Clamp(npc.x + npc.dx, 36, W - 36);
        npc.y = Phaser.Math.Clamp(npc.y + npc.dy, 36, H - 36);
        npc.sprite.setPosition(npc.x, npc.y);
        const labelY = this._positionNpcLabel(npc);
        npc.label.setPosition(npc.x, labelY);
      }

      if (npc.sprite) {
        this._applyNPCAnimation(npc);
      }

      // ── Evacuate once in exit zone ────────────────────────────────────────
      if (
        phase === "evacuation" &&
        exitZone &&
        Phaser.Geom.Rectangle.Contains(exitZone, npc.x, npc.y) &&
        npc.state !== NPC_STATE.EVACUATED
      ) {
        npc.state = NPC_STATE.EVACUATED;
        this._render(npc);
        // Fade out
        this.scene.tweens.add({
          targets: [npc.sprite, npc.label].filter(Boolean),
          alpha: 0,
          delay: 600,
          duration: 500,
        });
      }
    });
  }

  // ── Player interaction ───────────────────────────────────────────────────────
  /**
   * Attempt to interact with the nearest actionable NPC within range.
   * Returns a result object or null if no NPC is in range.
   * @returns {{ action: string, pts: number, label: string } | null}
   */
  tryInteract(playerX, playerY, range = 50) {
    const near = this.npcs
      .filter(
        (n) => n.state === NPC_STATE.INJURED || n.state === NPC_STATE.PANICKING,
      )
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(playerX, playerY, a.x, a.y) -
          Phaser.Math.Distance.Between(playerX, playerY, b.x, b.y),
      )[0];

    if (!near) return null;

    const dist = Phaser.Math.Distance.Between(playerX, playerY, near.x, near.y);
    if (dist > range) return null;

    if (near.state === NPC_STATE.INJURED) {
      near.state = NPC_STATE.HELPED;
      this._render(near);
      return { ...SCORE_EVENTS.HELP_INJURED, npcId: near.id };
    }

    if (near.state === NPC_STATE.PANICKING) {
      near.state = NPC_STATE.IDLE;
      this._render(near);
      return { ...SCORE_EVENTS.CALM_PANICKING, npcId: near.id };
    }

    return null;
  }

  // ── Penalty pass at end ──────────────────────────────────────────────────────
  /**
   * Call at evacuation start. Returns array of penalty events for all still-injured NPCs.
   */
  collectIgnorePenalties() {
    return this.npcs
      .filter((n) => n.state === NPC_STATE.INJURED)
      .map((n) => ({ ...SCORE_EVENTS.IGNORE_PENALTY, npcId: n.id }));
  }

  // ── Stat getters ─────────────────────────────────────────────────────────────
  get survivorsHelped() {
    return this.npcs.filter(
      (n) => n.state === NPC_STATE.HELPED || n.state === NPC_STATE.EVACUATED,
    ).length;
  }
  get survivorsPanicked() {
    return this.npcs.filter((n) => n.state === NPC_STATE.PANICKING).length;
  }
  get survivorsLost() {
    return this.npcs.filter((n) => n.state === NPC_STATE.INJURED).length;
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  destroy() {
    this.npcs.forEach((n) => {
      n.sprite?.destroy();
      n.label?.destroy();
    });
    this.npcs = [];
  }
}
