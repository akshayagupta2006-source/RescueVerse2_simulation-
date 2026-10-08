import Phaser from "phaser";

/**
 * FloodEnvironment.js
 * Flood-scenario environment: an outdoor street (left) connected through a
 * doorway to a building interior (right). Exposes:
 *   - highGroundZones: rectangles the player can shelter on (street stoop +
 *     indoor mezzanine) — same contract EnvironmentManager.js provides.
 *   - exitZone: the evacuation target.
 *   - furniture: an array of { gfx, weight, baseX, baseY, tipped, ... }
 *     that FloodScene animates as the water rises — "light" items bob/float,
 *     "heavy" items tip over and roll once the flash flood hits.
 *
 * This is intentionally a separate file from EnvironmentManager.js (used by
 * EarthquakeScene) so the earthquake scenario is left completely unchanged.
 */
export default class FloodEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.W = 800;
    this.H = 600;
    this.furniture = [];
    this.highGroundZones = [];
    this.exitZone = null;
    this.streetZone = null;
    this.buildingZone = null;
  }

  buildEnvironment(W, H) {
    this.W = W;
    this.H = H;

    this.streetZone = new Phaser.Geom.Rectangle(16, 16, 284, H - 32);
    this.buildingZone = new Phaser.Geom.Rectangle(320, 16, W - 336, H - 32);
    this.doorGap = { yTop: 250, yBottom: 380 };

    this._drawStreet();
    this._drawBuilding();
    this._drawDividerWall();
    this._drawHighGround();
    this._drawExit();
    this._spawnFurniture();

    return this.highGroundZones;
  }

  // ── Street (outdoor) ──────────────────────────────────────────────────
  _drawStreet() {
    const g = this.scene.add.graphics().setDepth(0);
    const z = this.streetZone;

    // Asphalt
    g.fillStyle(0x1c2230, 1);
    g.fillRect(z.x, z.y, z.width, z.height);

    // Sidewalk strip beside the building
    g.fillStyle(0x262e3d, 1);
    g.fillRect(z.x + z.width - 34, z.y, 34, z.height);

    // Dashed center line
    g.fillStyle(0x4b5563, 0.8);
    for (let y = z.y + 10; y < z.y + z.height; y += 34) {
      g.fillRect(z.x + z.width / 2 - 2, y, 4, 18);
    }

    // Lamp posts (decorative)
    [z.y + 90, z.y + z.height - 110].forEach((ly) => {
      g.fillStyle(0x3a3f4a, 1);
      g.fillRect(z.x + 26, ly, 4, 40);
      g.fillStyle(0xf4d35e, 0.85);
      g.fillCircle(z.x + 28, ly - 4, 5);
    });

    // Puddles (atmosphere)
    g.fillStyle(0x0ea5e9, 0.18);
    [[z.x + 60, z.y + 200], [z.x + 130, z.y + 340], [z.x + 70, z.y + 430]].forEach(([px, py]) => {
      g.fillEllipse(px, py, 34, 14);
    });

    const label = this.scene.add.text(z.x + z.width / 2, z.y + 14, "STREET", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "10px",
      color: "#64748b",
    }).setOrigin(0.5, 0).setDepth(1);
    label.setAlpha(0.8);
  }

  // ── Building interior ─────────────────────────────────────────────────
  _drawBuilding() {
    const g = this.scene.add.graphics().setDepth(0);
    const z = this.buildingZone;

    // Interior floor
    g.fillStyle(0x241d17, 1);
    g.fillRect(z.x, z.y, z.width, z.height);

    // Floorboards
    g.lineStyle(1, 0x342a20, 0.6);
    for (let x = z.x; x < z.x + z.width; x += 28) {
      g.lineBetween(x, z.y, x, z.y + z.height);
    }

    // Outer building walls
    g.lineStyle(4, 0x0d1117, 1);
    g.strokeRect(z.x, z.y, z.width, z.height);

    // A couple of windows on the far (right) wall
    g.fillStyle(0x1e293b, 0.9);
    [z.y + 70, z.y + z.height / 2 + 40].forEach((wy) => {
      g.fillRect(z.x + z.width - 6, wy, 6, 60);
    });

    const label = this.scene.add.text(z.x + 14, z.y + 14, "BUILDING INTERIOR", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "10px",
      color: "#8a6a4d",
    }).setOrigin(0, 0).setDepth(1);
    label.setAlpha(0.8);
  }

  // ── Dividing wall with a doorway ──────────────────────────────────────
  _drawDividerWall() {
    const g = this.scene.add.graphics().setDepth(1);
    const wallX = this.streetZone.x + this.streetZone.width;
    const { yTop, yBottom } = this.doorGap;

    g.fillStyle(0x0d1117, 1);
    g.fillRect(wallX, this.streetZone.y, 20, yTop - this.streetZone.y);
    g.fillRect(wallX, yBottom, 20, this.streetZone.y + this.streetZone.height - yBottom);

    // Door frame
    g.lineStyle(3, 0x3fb950, 0.7);
    g.strokeRect(wallX - 2, yTop, 24, yBottom - yTop);
    const doorLabel = this.scene.add.text(wallX + 10, (yTop + yBottom) / 2, "DOOR", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "8px",
      color: "#3fb950",
    }).setOrigin(0.5).setDepth(2).setAngle(90);
    doorLabel.setAlpha(0.75);
  }

  // ── High ground (safe from rising water) ───────────────────────────────
  _drawHighGround() {
    // Raised stoop/steps just outside the building door
    const stoop = new Phaser.Geom.Rectangle(this.streetZone.x + this.streetZone.width - 42, this.doorGap.yTop - 8, 40, (this.doorGap.yBottom - this.doorGap.yTop) + 16);
    this._paintHighGround(stoop, { staircaseSide: null });
    this.highGroundZones.push(stoop);

    // Indoor mezzanine platform (reached via a drawn staircase)
    const platform = new Phaser.Geom.Rectangle(this.buildingZone.x + this.buildingZone.width - 150, this.buildingZone.y + 24, 130, 90);
    this._paintHighGround(platform, { staircaseSide: "left" });
    this.highGroundZones.push(platform);
  }

  // Bright, legible "safe tile" ground paint + a pulsing beacon so the
  // player can spot high ground from anywhere on screen.
  _paintHighGround(zone, { staircaseSide } = {}) {
    const g = this.scene.add.graphics().setDepth(2);

    // Base
    g.fillStyle(0x163024, 1);
    g.fillRect(zone.x, zone.y, zone.width, zone.height);

    // Saturated shimmer stripes (reads instantly as a "safe tile")
    g.fillStyle(0x22c55e, 0.3);
    for (let sx = -zone.height; sx < zone.width; sx += 11) {
      const stripeX = zone.x + sx;
      g.fillRect(Math.max(zone.x, stripeX), zone.y, 5, zone.height);
    }

    g.lineStyle(3, 0x4ade80, 0.95);
    g.strokeRect(zone.x, zone.y, zone.width, zone.height);

    if (staircaseSide === "left") {
      for (let i = 0; i < 5; i++) {
        g.fillStyle(0x3a2c1e, 1);
        g.fillRect(zone.x - 16, zone.y + zone.height - 8 - i * 10, 16, 8);
      }
    }

    const label = this.scene.add.text(zone.centerX, zone.centerY, "HIGH\nGROUND", {
      fontFamily: "Share Tech Mono, monospace",
      fontSize: "9px",
      color: "#dcfce7",
      align: "center",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(3);
    label.setAlpha(0.8);

    // Pulsing beacon above the zone
    const beaconX = zone.centerX;
    const beam = this.scene.add.graphics().setDepth(6);
    beam.fillStyle(0x4ade80, 0.55);
    beam.fillTriangle(beaconX - 9, zone.y, beaconX + 9, zone.y, beaconX, zone.y - 44);
    const orb = this.scene.add.circle(beaconX, zone.y - 44, 6, 0x4ade80, 0.95).setDepth(6);

    this.scene.tweens.add({
      targets: [beam, orb],
      alpha: { from: 1, to: 0.25 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    // Shimmering glow drawn above the water tint so safe tiles stay vivid as water rises
    const glow = this.scene.add.graphics().setDepth(4.5);
    glow.fillStyle(0x4ade80, 1);
    glow.fillRect(zone.x, zone.y, zone.width, zone.height);
    glow.setAlpha(0.15);
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.4,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  // ── Evacuation exit ────────────────────────────────────────────────────
  _drawExit() {
    const g = this.scene.add.graphics().setDepth(2);
    const exitZone = new Phaser.Geom.Rectangle(this.W - 104, this.H - 64, 88, 48);

    g.fillStyle(0x3fb950, 0.12);
    g.fillRect(exitZone.x, exitZone.y, exitZone.width, exitZone.height);
    g.lineStyle(2, 0x3fb950, 0.6);
    g.strokeRect(exitZone.x, exitZone.y, exitZone.width, exitZone.height);

    this.exitZone = exitZone;
  }

  // ── Furniture / street props ──────────────────────────────────────────
  // Heavy items get a faint "cover radius" ring, since standing close to
  // one blocks flying debris while it's still upright (FloodScene handles
  // the actual gameplay check — this is just the visual hint).
  _addItem(x, y, weight, drawFn) {
    const gfx = this.scene.add.graphics().setDepth(3);
    drawFn(gfx);
    gfx.x = x;
    gfx.y = y;

    let coverRing = null;
    if (weight === "heavy") {
      coverRing = this.scene.add.graphics().setDepth(2);
      coverRing.lineStyle(2, 0x60a5fa, 0.22);
      coverRing.strokeCircle(0, 0, 46);
      coverRing.x = x;
      coverRing.y = y;
    }

    const item = {
      gfx,
      coverRing,
      weight,
      baseX: x,
      baseY: y,
      floatSeed: Math.random() * Math.PI * 2,
      floatSpeed: 1.1 + Math.random() * 0.7,
      tipped: false,
    };
    this.furniture.push(item);
    return item;
  }

  _spawnFurniture() {
    // ── Street props ──
    this._addItem(this.streetZone.x + 96, this.streetZone.y + 450, "heavy", (g) => {
      g.fillStyle(0x8899aa, 1);
      g.fillRoundedRect(-30, -14, 60, 28, 6);
      g.fillStyle(0xcfe8ff, 0.8);
      g.fillRect(-18, -10, 36, 8);
      g.fillStyle(0x111318, 1);
      g.fillCircle(-18, 14, 6);
      g.fillCircle(18, 14, 6);
    });

    this._addItem(this.streetZone.x + 70, this.streetZone.y + 150, "light", (g) => {
      g.fillStyle(0x4b5563, 1);
      g.fillRect(-8, -14, 16, 28);
      g.fillStyle(0x6b7280, 1);
      g.fillRect(-9, -16, 18, 4);
    });

    this._addItem(this.streetZone.x + 200, this.streetZone.y + 480, "light", (g) => {
      g.fillStyle(0x2563eb, 1);
      g.fillRect(-7, -10, 14, 18);
      g.fillStyle(0x1d4ed8, 1);
      g.fillRect(-8, -12, 16, 3);
    });

    // ── Building interior furniture ──
    this._addItem(this.buildingZone.x + 60, this.buildingZone.y + 74, "heavy", (g) => {
      g.fillStyle(0x5b3a29, 1);
      g.fillRect(-22, -32, 44, 64);
      g.fillStyle(0x3d2818, 1);
      for (let i = -24; i < 32; i += 16) g.fillRect(-20, i, 40, 2);
    });

    this._addItem(this.buildingZone.x + 150, this.buildingZone.y + 454, "heavy", (g) => {
      g.fillStyle(0xd1d5db, 1);
      g.fillRect(-16, -30, 32, 60);
      g.fillStyle(0x9ca3af, 1);
      g.fillRect(-16, -4, 32, 2);
      g.fillStyle(0x6b7280, 1);
      g.fillRect(10, -24, 3, 10);
    });

    this._addItem(this.buildingZone.x + 240, this.buildingZone.y + 190, "heavy", (g) => {
      g.fillStyle(0x7c3f5a, 1);
      g.fillRoundedRect(-30, -14, 60, 28, 8);
      g.fillStyle(0x954868, 1);
      g.fillRoundedRect(-30, -20, 10, 26, 4);
      g.fillRoundedRect(20, -20, 10, 26, 4);
    });

    this._addItem(this.buildingZone.x + 380, this.buildingZone.y + 454, "heavy", (g) => {
      g.fillStyle(0x40342a, 1);
      g.fillRect(-18, -34, 36, 68);
      g.fillStyle(0x2b2119, 1);
      g.fillRect(-1, -30, 2, 60);
    });

    this._addItem(this.buildingZone.x + 180, this.buildingZone.y + 84, "light", (g) => {
      g.fillStyle(0x7a4b32, 1);
      g.fillRect(-8, 4, 16, 14);
      g.fillStyle(0x2f855a, 1);
      g.fillCircle(0, -4, 12);
    });

    this._addItem(this.buildingZone.x + 100, this.buildingZone.y + 284, "light", (g) => {
      g.fillStyle(0xd97706, 1);
      g.fillRoundedRect(-10, -10, 20, 20, 6);
    });

    this._addItem(this.buildingZone.x + 330, this.buildingZone.y + 284, "light", (g) => {
      g.fillStyle(0xb08968, 1);
      g.fillRect(-12, -12, 24, 24);
      g.lineStyle(2, 0x8a6a4d, 1);
      g.strokeRect(-12, -12, 24, 24);
      g.lineBetween(-12, 0, 12, 0);
    });
  }
}
