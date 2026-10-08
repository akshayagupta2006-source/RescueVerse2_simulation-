/**
 * AnimationManager.js
 * Reusable animation registry for Phaser scenes.
 * Centralizes animation definitions to avoid duplication across scenes and NPCs.
 *
 * Usage:
 *   const animMgr = new AnimationManager(scene);
 *   animMgr.registerPlayerAnimations();
 *   animMgr.registerNPCAnimations();
 */

export default class AnimationManager {
  constructor(scene) {
    this.scene = scene;
    this.registered = new Set();
  }

  /**
   * Register a single animation if not already registered.
   * @param {string} key - Animation key
   * @param {object} config - Phaser animation config
   */
  registerAnimation(key, config) {
    if (this.registered.has(key)) return;

    const anim = this.scene.anims.create({
      key,
      ...config,
    });

    this.registered.add(key);
    return anim;
  }

  /**
   * Register all player animations.
   * Assumes 'player' spritesheet is loaded.
   */
  registerPlayerAnimations() {
    // Register animations from per-action spritesheets if present.
    // Each spritesheet is expected to contain only the frames for that action.
    const registerFromSheet = (
      sheetKey,
      animKey,
      frameRate = 10,
      repeat = -1,
    ) => {
      if (!this.scene.textures.exists(sheetKey)) return false;
      const count = this._getFrameCount(sheetKey);
      if (count <= 0) return false;
      this.registerAnimation(animKey, {
        frames: this.scene.anims.generateFrameNumbers(sheetKey, {
          start: 0,
          end: Math.max(0, count - 1),
        }),
        frameRate,
        repeat,
      });
      return true;
    };

    registerFromSheet("player_idle", "player_idle", 8, -1);
    registerFromSheet("player_walk", "player_walk", 10, -1);
    registerFromSheet("player_run", "player_run", 14, -1);
    registerFromSheet("player_hurt", "player_hurt", 8, 0);
    registerFromSheet("player_attack", "player_attack", 10, 0);
    registerFromSheet("player_dead", "player_death", 6, 0);
  }

  _getFrameCount(key) {
    try {
      const tex = this.scene.textures.get(key);
      if (!tex || !tex.frames) return 0;
      return Object.keys(tex.frames).filter((n) => n !== "__BASE").length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Register all NPC animations.
   * Loads animations from available NPC packs and also registers generic keys.
   */
  registerNPCAnimations() {
    const packs = [
      { name: "City_men_2", prefix: "city_men_2" },
      { name: "City_men_3", prefix: "city_men_3" },
    ];

    const actions = [
      { sheet: "idle", anim: "npc_idle", frameRate: 6, repeat: -1 },
      { sheet: "walk", anim: "npc_walk", frameRate: 10, repeat: -1 },
      { sheet: "run", anim: "npc_run", frameRate: 14, repeat: -1 },
      { sheet: "hurt", anim: "npc_hurt", frameRate: 8, repeat: 0 },
      { sheet: "dead", anim: "npc_dead", frameRate: 6, repeat: 0 },
      { sheet: "attack", anim: "npc_attack", frameRate: 12, repeat: 0 },
    ];

    const genericCreated = new Set();
    packs.forEach((pack) => {
      actions.forEach(({ sheet, anim, frameRate, repeat }) => {
        const textureKey = `${pack.prefix}_${sheet}`;
        if (!this.scene.textures.exists(textureKey)) return;

        const count = this._getFrameCount(textureKey);
        if (count <= 0) return;

        const variantAnim = `${anim}_${pack.prefix}`;
        this.registerAnimation(variantAnim, {
          frames: this.scene.anims.generateFrameNumbers(textureKey, {
            start: 0,
            end: Math.max(0, count - 1),
          }),
          frameRate,
          repeat,
        });

        if (!genericCreated.has(anim)) {
          this.registerAnimation(anim, {
            frames: this.scene.anims.generateFrameNumbers(textureKey, {
              start: 0,
              end: Math.max(0, count - 1),
            }),
            frameRate,
            repeat,
          });
          genericCreated.add(anim);
        }
      });
    });
  }

  /**
   * List all registered animations.
   */
  getRegistered() {
    return Array.from(this.registered);
  }

  /**
   * Check if an animation is registered.
   */
  has(key) {
    return this.registered.has(key);
  }
}
