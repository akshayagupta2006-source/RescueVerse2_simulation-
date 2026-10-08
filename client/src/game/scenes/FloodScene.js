import Phaser from "phaser";
import NPCManager from "../NPCManager.js";
import AnimationManager from "../AnimationManager.js";
import FloodEnvironment from "../FloodEnvironment.js";
import { DIFFICULTY_CONFIG } from "../SceneConfig.js";

const W = 800;
const H = 600;

const PHASE = {
  CALM: "calm",
  RISING_WATER: "rising_water",
  FLASH_FLOOD: "flash_flood",
  EVACUATION: "evacuation",
  END: "end",
};

const SCORE = {
  RESCUE_NPC: 100,
  RESCUE_INJURED: 150,
  REACH_HIGH_GROUND: 50,
  EVACUATE_SAFE: 200,
  DANGEROUS_WATER: -10,
  SURVIVOR_LOST: -100,
  DEBRIS_HIT: -50,
  FURNITURE_HIT: -60,
};

export default class FloodScene extends Phaser.Scene {
  constructor() {
    super({ key: "FloodScene" });
    this.phase = PHASE.CALM;
    this.score = 0;
    this.health = 100;
    this.elapsed = 0;
    this.decisions = [];
    this.isOnHighGround = false;
    this.debrisTimer = null;
    this.phaseTimer = null;
    this.waterDamageTimer = null;
    this.penaltyAccum = 0;
    this.debrisHits = 0;
    this.survivorsHelped = 0;
    this.survivorsPanicked = 0;
    this.survivorsLost = 0;
    this.cfg = DIFFICULTY_CONFIG.beginner;
    this.DURATIONS = {};
    this.waterLevel = 0;
    this._wasInside = null;
    this.carriedNpc = null;
    this.zoneTag = null;
  }

  create() {
    const difficulty = this.registry.get("difficulty") || "beginner";
    this.cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.beginner;
    this.DURATIONS = { ...(this.cfg.floodDurations || this.cfg.durations) };
    this.health = this.cfg.healthStart || 100;
    this.playerSpeed = this.cfg.playerSpeed || 140;

    this._buildWorld();
    this._spawnPlayer();

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
    this._startPhase(PHASE.CALM);

    this.registry.set("scene", this);
  }

  _buildWorld() {
    this.envMgr = new FloodEnvironment(this);
    this.highGroundZones = this.envMgr.buildEnvironment(W, H);
    this.exitZone = this.envMgr.exitZone || new Phaser.Geom.Rectangle(W - 80, H - 80, 80, 80);

    this.ambientOverlay = this.add.graphics().setDepth(3);
    this.ambientOverlay.fillStyle(0x050814, 0.45);
    this.ambientOverlay.fillRect(0, 0, W, H);

    this.safeZoneMarker = this.add.graphics().setDepth(5).setAlpha(0);
    this.safeZoneMarker.x = this.exitZone.centerX;
    this.safeZoneMarker.y = this.exitZone.centerY;
    this.safeZoneMarker.lineStyle(4, 0x3fb950, 1);
    this.safeZoneMarker.strokeCircle(0, 0, 24);
    this.safeZoneMarker.lineStyle(2, 0x3fb950, 0.6);
    this.safeZoneMarker.strokeCircle(0, 0, 36);

    this.tweens.add({
      targets: this.safeZoneMarker,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: { from: 1, to: 0.2 },
      duration: 1200,
      ease: 'Sine.inOut',
      repeat: -1,
      yoyo: true
    });

    this.waterGfx = this.add.graphics().setDepth(4).setAlpha(1);
    this.debrisGroup = this.physics.add.group();
  }

  _spawnPlayer() {
    this.playerPos = new Phaser.Math.Vector2(W / 2, H / 2);

    let spriteKey = "player_idle";
    if (!this.textures.exists(spriteKey)) {
      if (this.textures.exists("player")) {
        spriteKey = "player";
      } else {
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
    }

    this.player = this.physics.add.sprite(this.playerPos.x, this.playerPos.y, spriteKey);
    this.player.setOrigin(0.5, 0.95);
    this.player.setScale(0.82);
    this.player.setDepth(10);
    this.player.body.setSize(40, 68);
    this.player.body.setOffset((this.player.displayWidth - 40) * 0.5, this.player.displayHeight * 0.95 - 68);

    this.playerLabel = this.add.text(this.playerPos.x, 0, "YOU", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "9px",
      color: "#58a6ff",
      align: "center",
    }).setOrigin(0.5).setDepth(11);

    this.zoneTag = this.add.text(this.playerPos.x, this.playerPos.y, "STREET", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "8px",
      color: "#93c5fd",
    }).setOrigin(0.5, 0).setDepth(11);

    this._positionPlayerLabel();
    this.animMgr = new AnimationManager(this);
    try { this.animMgr.registerPlayerAnimations(); } catch (e) {}

    if (this.animMgr.has("player_idle")) this.player.play("player_idle");

    this._updatePlayerVisuals();
  }

  _positionPlayerLabel() {
    const labelY = this.player.y - this.player.displayHeight * 0.52;
    this.playerLabel.setPosition(this.player.x, labelY);
    if (this.zoneTag) this.zoneTag.setPosition(this.player.x, this.player.y + 4);
  }

  _updatePlayerVisuals() {
    this.player.setPosition(this.playerPos.x, this.playerPos.y);
    this._positionPlayerLabel();

    if (this.isOnHighGround) {
      this.player.setAlpha(0.8);
      this.playerLabel.setText("SAFE");
      this.playerLabel.setColor("#27ae60");
    } else {
      this.player.setAlpha(1);
      this.playerLabel.setText("YOU");
      this.playerLabel.setColor("#58a6ff");
    }
  }

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

    this.input.keyboard.on("keydown-SPACE", this._tryHighGround, this);
    this.input.keyboard.on("keydown-E", this._tryInteract, this);
  }

  _tryHighGround() {
    if (this.phase === PHASE.END) return;

    const nearHighGround = this.highGroundZones.some(z =>
      Phaser.Geom.Rectangle.Contains(z, this.playerPos.x, this.playerPos.y)
    );

    if (!this.isOnHighGround && nearHighGround) {
      this.isOnHighGround = true;
      this._updatePlayerVisuals();
      this._log("reached_high_ground", null, SCORE.REACH_HIGH_GROUND);
      this._showFloatingText(this.player.x, this.player.y - 30, "HIGH GROUND", "#3fb950");
    } else if (this.isOnHighGround) {
      this.isOnHighGround = false;
      this._updatePlayerVisuals();
    }
  }

  _tryInteract() {
    if (this.phase === PHASE.END) return;

    // Already carrying someone: E delivers them (exit / high ground) or sets them down
    if (this.carriedNpc) {
      const npc = this.carriedNpc;
      const px = this.playerPos.x;
      const py = this.playerPos.y;
      const safe =
        Phaser.Geom.Rectangle.Contains(this.exitZone, px, py) ||
        this.highGroundZones.some(z => Phaser.Geom.Rectangle.Contains(z, px, py));

      if (safe) {
        npc.state = "helped";
        npc.label.setText("\u2713 STABLE").setColor("#3fb950");
        this.survivorsHelped++;
        this._log("delivered_injured_npc", npc.id, SCORE.RESCUE_INJURED);
        this._showFloatingText(npc.x, npc.y - 30, "DELIVERED!", "#3fb950");
      } else {
        npc.state = "injured";
        npc.label.setText("! INJURED").setColor("#f85149");
        this._showFloatingText(npc.x, npc.y - 30, "SET DOWN - get them to safety", "#e3b341");
      }
      this.carriedNpc = null;
      return;
    }

    let nearest = null;
    let minDist = 90;

    this.npcMgr.npcs.forEach(npc => {
      if (npc.state === "evacuated" || npc.state === "helped" || npc.state === "carried") return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < minDist) { minDist = d; nearest = npc; }
    });

    if (!nearest) return;

    if (nearest.state === "injured") {
      // Injured survivors must be carried to safety
      nearest.state = "carried";
      nearest.label.setText("CARRIED").setColor("#fbbf24");
      this.carriedNpc = nearest;
      this._showFloatingText(nearest.x, nearest.y - 30, "PICKED UP - reach safe ground, press E", "#fbbf24");
    } else {
      // Panicking / calm civilians are calmed in place
      nearest.state = "helped";
      nearest.label.setText("\u2713 STABLE").setColor("#3fb950");
      this.survivorsHelped++;
      this._log("helped_npc", nearest.id, SCORE.RESCUE_NPC);
      this._showFloatingText(nearest.x, nearest.y - 30, "CALMED", "#3fb950");
    }
  }

  _buildHUD() {
    // Banner slides in below the top objective/stats HTML HUD (see _showMessage)
    this.msgPanel = this.add.container(W / 2, -100).setDepth(100);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x1e293b, 0.95);
    bg.fillRoundedRect(-300, -40, 600, 80, 16);
    bg.lineStyle(3, 0x3b82f6, 1);
    bg.strokeRoundedRect(-300, -40, 600, 80, 16);
    
    // Add a subtle shadow
    bg.preFX?.addShadow(0, 4, 0.05, 1, 0x000000, 6, 1);
    this.msgPanelBg = bg;

    this.msgText = this.add.text(0, 0, "", {
      fontFamily: "Playfair Display, serif",
      fontSize: "26px",
      fontWeight: "bold",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 560 }
    }).setOrigin(0.5);

    this.msgPanel.add([bg, this.msgText]);

  }

  _showMessage(text, color = "#3b82f6", duration = 3000) {
    this.msgText.setText(text);
    
    const colorNum = parseInt(color.replace('#', '0x'));
    this.msgPanelBg.clear();
    this.msgPanelBg.fillStyle(0x1e293b, 0.95);
    this.msgPanelBg.fillRoundedRect(-300, -40, 600, 80, 16);
    this.msgPanelBg.lineStyle(3, colorNum, 1);
    this.msgPanelBg.strokeRoundedRect(-300, -40, 600, 80, 16);

    this.tweens.killTweensOf(this.msgPanel);
    this.msgPanel.y = -100;
    
    this.tweens.add({
      targets: this.msgPanel,
      y: 170,
      ease: 'Back.out',
      duration: 600,
      hold: duration,
      yoyo: true,
      onComplete: () => {
        this.msgPanel.y = -100;
      }
    });
  }

  _showFloatingText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "12px",
      color: color,
      stroke: "#000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
  }

  _log(action, target = null, pts = 0) {
    if (pts !== 0) {
      this.score = Math.max(0, this.score + pts);
      this.events.emit("scoreUpdate", this.score);
    }
    this.decisions.push({
      timestamp: Math.round(this.elapsed),
      phase: this.phase,
      action,
      target,
      scoreImpact: pts,
    });
  }

  _startPhase(p) {
    if (this.phase === PHASE.END) return;
    this.phase = p;
    this.events.emit("phaseChange", p);

    if (this.phaseTimer) this.phaseTimer.remove();

    switch (p) {
      case PHASE.CALM:
        this._showMessage("FLOOD WARNING: FIND HIGH GROUND", "#e67e22");
        this.waterLevel = 0.1;
        this.phaseTimer = this.time.delayedCall(this.DURATIONS.calm * 1000, () => this._startPhase(PHASE.RISING_WATER));
        break;

      case PHASE.RISING_WATER:
        this._showMessage("WATER RISING!", "#3b82f6");
        this.tweens.add({ targets: this, waterLevel: 0.4, duration: this.DURATIONS.rising_water * 1000 });
        this.phaseTimer = this.time.delayedCall(this.DURATIONS.rising_water * 1000, () => this._startPhase(PHASE.FLASH_FLOOD));
        break;

      case PHASE.FLASH_FLOOD:
        this._showMessage("FLASH FLOOD WARNING!", "#e74c3c");
        this.tweens.add({ targets: this, waterLevel: 0.7, duration: 2000 });
        
        this.debrisTimer = this.time.addEvent({
          delay: this.cfg.debrisIntervalStrong || 2000,
          callback: this._spawnDebris,
          callbackScope: this,
          loop: true,
        });

        this.waterDamageTimer = this.time.addEvent({
          delay: 1500,
          callback: () => {
            if (!this.isOnHighGround) {
              this.health = Math.max(0, this.health - 5);
              this._log("dangerous_water_damage", null, SCORE.DANGEROUS_WATER);
              this._showFloatingText(this.player.x, this.player.y - 20, "-5 HP", "#e74c3c");
              if (this.health <= 0) this._endSimulation(false, "Critical Health");
            }
          },
          callbackScope: this,
          loop: true
        });

        this.phaseTimer = this.time.delayedCall(this.DURATIONS.flash_flood * 1000, () => this._startPhase(PHASE.EVACUATION));
        break;

      case PHASE.EVACUATION:
        this._showMessage("EVACUATION ZONE OPEN\nReach the Safe Zone!", "#27ae60", 4000);
        this.safeZoneMarker.setAlpha(1);
        if (this.debrisTimer) this.debrisTimer.remove();
        this.phaseTimer = this.time.delayedCall(this.DURATIONS.evacuation * 1000, () => this._endSimulation(false, "Time Expired"));
        break;
    }
  }

  _spawnDebris() {
    if (this.phase !== PHASE.FLASH_FLOOD) return;
    const x = Math.random() < 0.5 ? 0 : W;
    const y = Math.random() * H;
    const vx = x === 0 ? 150 + Math.random() * 100 : -(150 + Math.random() * 100);
    const vy = (Math.random() - 0.5) * 50;

    const g = this.add.graphics();
    g.fillStyle(0x8B4513, 1);
    g.fillRect(-15, -5, 30, 10);
    g.generateTexture("debrisTex", 30, 10);
    g.destroy();

    const d = this.debrisGroup.create(x, y, "debrisTex");
    d.setVelocity(vx, vy);
    d.setAngularVelocity((Math.random() - 0.5) * 200);
    d.setDepth(5);
    
    this.time.delayedCall(5000, () => { if (d && d.active) d.destroy(); });
  }

  update(time, delta) {
    if (this.phase === PHASE.END) return;
    
    const dt = delta / 1000;
    this.elapsed += dt;

    this.waterGfx.clear();
    if (this.waterLevel > 0) {
      // Simulate dynamic water flow with elapsed time
      const flow = Math.sin(this.elapsed * 2) * 0.05;
      const alphaTop = Math.max(0, this.waterLevel + flow);
      const alphaBot = Math.max(0, this.waterLevel * 0.8 - flow);
      
      this.waterGfx.fillGradientStyle(
        0x1e40af, 0x1e40af, 0x0284c7, 0x0284c7, 
        alphaTop, alphaTop, alphaBot, alphaBot
      );
      this.waterGfx.fillRect(0, 0, W, H);
    }

    this._handlePlayerMovement(dt);
    this._updateFurniture();
    this._updateZoneLabel();
    this.npcMgr.update(delta, this.phase, this.exitZone);

    if (this.carriedNpc) {
      const n = this.carriedNpc;
      n.x = this.playerPos.x;
      n.y = this.playerPos.y - 30;
      n.sprite.setPosition(n.x, n.y);
      n.label.setPosition(n.x, n.y - n.sprite.displayHeight * 0.52);
    }

    if (this.phase === PHASE.FLASH_FLOOD && !this.isOnHighGround) {
      this.playerPos.x += 30 * dt;
    }

    this.physics.overlap(this.player, this.debrisGroup, (p, debris) => {
      debris.destroy();
      if (this._isNearFurnitureCover()) {
        this._showFloatingText(p.x, p.y - 20, "BLOCKED!", "#22d3ee");
        return;
      }
      this.debrisHits++;
      this.health = Math.max(0, this.health - 15);
      this._log("hit_by_debris", null, SCORE.DEBRIS_HIT);
      this._showFloatingText(p.x, p.y - 20, "HIT!", "#e74c3c");
      
      this.cameras.main.shake(100, 0.01);
      
      if (this.health <= 0) {
        this._endSimulation(false, "Critical Health");
      }
    });

    if (this.phase === PHASE.EVACUATION) {
      if (Phaser.Geom.Rectangle.Contains(this.exitZone, this.playerPos.x, this.playerPos.y)) {
        this._endSimulation(true, "Evacuated Successfully");
      }
    }

    this._updatePlayerVisuals();
    this._syncRegistry();
  }

  _handlePlayerMovement(dt) {
    if (this.isOnHighGround && this.phase !== PHASE.EVACUATION) return; 
    
    let dx = 0;
    let dy = 0;

    if (this.keys.a.isDown || this.keys.left.isDown) dx = -1;
    if (this.keys.d.isDown || this.keys.right.isDown) dx = 1;
    if (this.keys.w.isDown || this.keys.up.isDown) dy = -1;
    if (this.keys.s.isDown || this.keys.down.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      if (this.isOnHighGround) {
        this.isOnHighGround = false;
      }
      
      const mag = Math.sqrt(dx * dx + dy * dy);
      let spd = this.playerSpeed;
      if (this.phase === PHASE.FLASH_FLOOD && !this.isOnHighGround) {
        spd *= 0.6;
      }
      if (this.carriedNpc) spd *= 0.65;

      this.playerPos.x += (dx / mag) * spd * dt;
      this.playerPos.y += (dy / mag) * spd * dt;

      this.playerPos.x = Phaser.Math.Clamp(this.playerPos.x, 20, W - 20);
      this.playerPos.y = Phaser.Math.Clamp(this.playerPos.y, 20, H - 20);
      
      if (this.animMgr.has("player_walk")) {
        if (this.player.anims.currentAnim?.key !== "player_walk") {
          this.player.play("player_walk", true);
        }
      }
      if (dx < 0) this.player.setFlipX(true);
      if (dx > 0) this.player.setFlipX(false);
    } else {
      if (this.animMgr.has("player_idle")) {
        if (this.player.anims.currentAnim?.key !== "player_idle") {
          this.player.play("player_idle", true);
        }
      }
    }
  }

  _updateFurniture() {
    const items = this.envMgr && this.envMgr.furniture;
    if (!items) return;

    const floodStarted = this.waterLevel > 0.15;

    items.forEach((item) => {
      if (item.tipped) return;

      if (item.weight === "light") {
        if (!floodStarted) return;
        const bob = Math.sin(this.elapsed * item.floatSpeed + item.floatSeed) * 4;
        const sway = Math.sin(this.elapsed * item.floatSpeed * 0.6 + item.floatSeed) * 0.08;
        item.gfx.y = item.baseY + bob;
        item.gfx.rotation = sway;
      } else if (item.weight === "heavy") {
        if (this.phase === PHASE.FLASH_FLOOD) {
          item.tipped = true;
          if (Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, item.baseX, item.baseY) < 50) {
            this.health = Math.max(0, this.health - 12);
            this._log("struck_by_toppling_furniture", null, SCORE.FURNITURE_HIT);
            this._showFloatingText(this.player.x, this.player.y - 24, "FURNITURE FELL!", "#e74c3c");
            this.cameras.main.shake(120, 0.012);
            if (this.health <= 0) this._endSimulation(false, "Critical Health");
          }
          const dir = Math.random() < 0.5 ? -1 : 1;
          this.tweens.add({
            targets: item.gfx,
            rotation: dir * Phaser.Math.DegToRad(75 + Math.random() * 15),
            x: item.baseX + dir * (16 + Math.random() * 14),
            y: item.baseY + (6 + Math.random() * 10),
            duration: 500 + Math.random() * 250,
            ease: "Back.easeIn",
          });
        } else if (floodStarted) {
          // Subtle pre-tip rocking as water starts to rise around it
          item.gfx.rotation = Math.sin(this.elapsed * 3 + item.floatSeed) * 0.02;
        }
      }
    });
  }

  _isNearFurnitureCover() {
    const items = this.envMgr && this.envMgr.furniture;
    if (!items) return false;
    return items.some(item =>
      item.weight === "heavy" && !item.tipped &&
      Phaser.Math.Distance.Between(this.playerPos.x, this.playerPos.y, item.baseX, item.baseY) < 46
    );
  }

  _updateZoneLabel() {
    if (!this.zoneTag || !this.envMgr || !this.envMgr.buildingZone) return;
    const inside = Phaser.Geom.Rectangle.Contains(this.envMgr.buildingZone, this.playerPos.x, this.playerPos.y);
    if (inside !== this._wasInside) {
      this._wasInside = inside;
      this.zoneTag.setText(inside ? "INSIDE" : "STREET");
      this.zoneTag.setColor(inside ? "#fbbf24" : "#93c5fd");
    }
  }

  _syncRegistry() {
    this.registry.set("health", this.health);
    this.registry.set("elapsed", Math.round(this.elapsed));
    this.registry.set("score", this.score);
  }

  _endSimulation(success, reason) {
    if (this.phase === PHASE.END) return;
    this.phase = PHASE.END;
    
    if (this.phaseTimer) this.phaseTimer.remove();
    if (this.debrisTimer) this.debrisTimer.remove();
    if (this.waterDamageTimer) this.waterDamageTimer.remove();

    this.events.emit("phaseChange", PHASE.END);
    this.player.setTint(0x555555);
    this.physics.pause();

    if (success) {
      this._log("evacuated", null, SCORE.EVACUATE_SAFE);
      this._showMessage("EVACUATION SUCCESSFUL", "#27ae60", 99999);
    } else {
      this._log("failed_health", reason, 0);
      this._showMessage(`TRAINING FAILED: ${reason.toUpperCase()}`, "#e74c3c", 99999);
    }

    this.npcMgr.npcs.forEach(n => {
      if (n.state === "panicking") this.survivorsPanicked++;
      if (n.state === "injured" || n.state === "carried") this.survivorsLost++;
    });

    this.time.delayedCall(2000, () => {
      this.events.emit("simulationEnd", {
        score: this.score,
        survivorsHelped: this.survivorsHelped,
        survivorsPanicked: this.survivorsPanicked,
        survivorsLost: this.survivorsLost,
        evacuated: success,
        healthRemaining: this.health,
        debrisHits: this.debrisHits,
        decisions: this.decisions,
        durationSeconds: Math.round(this.elapsed),
      });
    });
  }
}
