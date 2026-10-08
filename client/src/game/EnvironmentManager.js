/**
 * EnvironmentManager.js
 * Modular environment rendering system for disaster scenarios.
 * Handles floor, obstacles, decorations, and environment layers.
 * 
 * Rendering Layer Architecture (Depth Order):
 *   0: Background      — Floor tiles, base grid
 *   1: Environment     — Walls, boundaries
 *   2: Obstacles       — Tables, cover objects (with collision)
 *   4: Decorations     — Cracks, debris, rubble (no collision)
 *   5: Exit Zone       — Exit label & marker
 *   6: Cracks/VFX      — Dynamic earthquake cracks
 *   7: Shake Overlay   — Screen flash effects
 *   8: Particles       — Dust, impact effects
 *   10: Player         — Player sprite
 *   11: Labels         — Text labels (YOU, CALM, etc.)
 *   20+: HUD           — UI elements
 *
 * Collision Zones:
 *   - Only obstacles have collision (coverZones)
 *   - All decorations are purely visual (no collision)
 *   - Original table positions and sizes are preserved exactly
 *
 * Usage:
 *   const envMgr = new EnvironmentManager(scene);
 *   const coverZones = envMgr.buildEnvironment(W, H);
 *
 * Reusability:
 *   This architecture is designed to be copied to FloodScene, FireScene, etc.
 *   Simply replace _drawFloor, _drawWalls, _drawDecorations with scenario-specific variants.
 *   Collision zones and layer depths remain constant across scenarios.
 */

export default class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.W = 800;
    this.H = 600;
    this.coverZones = [];
    
    // Layer references
    this.layerBackground = null;
    this.layerEnvironment = null;
    this.layerObstacles = null;
    this.layerDecorations = null;
    this.layerVFX = null;
  }

  /**
   * Build complete environment with all layers.
   * @returns {Array} coverZones for gameplay
   */
  buildEnvironment(W, H) {
    this.W = W;
    this.H = H;
    
    this._createLayers();
    this._drawFloor();
    this._drawWalls();
    this._drawObstacles();
    this._drawDecorations();
    this._drawEvacuationExit();
    
    return this.coverZones;
  }

  // ── Layer Management ──────────────────────────────────────────────────────
  _createLayers() {
    // Layers ensure consistent rendering order
    // Depth values: Background(0), Environment(1), Obstacles(2), Decorations(4), VFX(6)
  }

  // ── Floor Rendering ──────────────────────────────────────────────────────
  _drawFloor() {
    const g = this.scene.add.graphics().setDepth(0);
    
    // Base floor color
    g.fillStyle(0x1a1f2e, 1);
    g.fillRect(0, 0, this.W, this.H);

    // Floor pattern with variation
    g.lineStyle(1, 0x252b3b, 0.45);
    for (let x = 0; x < this.W; x += 32) {
      g.lineBetween(x, 0, x, this.H);
    }
    for (let y = 0; y < this.H; y += 32) {
      g.lineBetween(0, y, this.W, y);
    }

    // Add subtle floor tiles with color variation
    const tg = this.scene.add.graphics().setDepth(0);
    for (let x = 32; x < this.W; x += 64) {
      for (let y = 32; y < this.H; y += 64) {
        // Darker alternating tiles
        tg.fillStyle(0x151a26, 0.3);
        tg.fillRect(x, y, 32, 32);
      }
    }
  }

  // ── Wall Rendering ────────────────────────────────────────────────────────
  _drawWalls() {
    const g = this.scene.add.graphics().setDepth(1);
    
    const walls = [
      [0, 0, this.W, 16],
      [0, this.H - 16, this.W, 16],
      [0, 0, 16, this.H],
      [this.W - 16, 0, 16, this.H],
    ];

    walls.forEach(([x, y, w, h]) => {
      // Outer edge
      g.fillStyle(0x0d1117, 1);
      g.fillRect(x, y, w, h);
      // Border
      g.lineStyle(1, 0x21262d, 1);
      g.strokeRect(x, y, w, h);
      // Inner detail
      g.fillStyle(0x161b22, 0.5);
      g.fillRect(x + 2, y + 2, w - 4, h - 4);
    });
  }

  // ── Obstacles (Tables / Cover) ────────────────────────────────────────────
  _drawObstacles() {
    const g = this.scene.add.graphics().setDepth(2);

    const tables = [
      { x: 90, y: 110 },
      { x: 210, y: 110 },
      { x: 390, y: 110 },
      { x: 570, y: 110 },
      { x: 90, y: 270 },
      { x: 290, y: 270 },
      { x: 490, y: 270 },
      { x: 650, y: 200 },
      { x: 150, y: 410 },
      { x: 350, y: 410 },
      { x: 540, y: 410 },
      { x: 680, y: 380 },
    ];

    tables.forEach((t) => {
      // Table surface with shading
      g.fillStyle(0x2a3546, 1);
      g.fillRect(t.x, t.y, 76, 42);
      
      // Surface highlight
      g.fillStyle(0x3a4556, 0.6);
      g.fillRect(t.x + 1, t.y + 1, 74, 12);

      // Border
      g.lineStyle(2, 0x3d5368, 1);
      g.strokeRect(t.x, t.y, 76, 42);

      // Legs with detail
      g.fillStyle(0x1e2d3d, 1);
      [
        [t.x + 4, t.y + 4],
        [t.x + 64, t.y + 4],
        [t.x + 4, t.y + 30],
        [t.x + 64, t.y + 30],
      ].forEach(([lx, ly]) => {
        g.fillRect(lx, ly, 7, 7);
        g.lineStyle(1, 0x1a2330, 1);
        g.strokeRect(lx, ly, 7, 7);
      });

      // Register collision zone (same as original)
      this.coverZones.push(
        new Phaser.Geom.Rectangle(t.x - 10, t.y - 10, 96, 62),
      );
    });
  }

  // ── Decorations (no collision) ────────────────────────────────────────────
  _drawDecorations() {
    const g = this.scene.add.graphics().setDepth(4);

    // Floor cracks with inner glow
    g.lineStyle(2, 0x252b3b, 0.15);
    for (let i = 0; i < 12; i++) {
      const x = this.W * Math.random();
      const y = this.H * Math.random();
      const len = 8 + Math.random() * 16;
      const angle = Math.random() * Math.PI * 2;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      g.lineBetween(x, y, ex, ey);
    }

    g.lineStyle(1, 0x3a3f4a, 0.4);
    for (let i = 0; i < 12; i++) {
      const x = this.W * Math.random();
      const y = this.H * Math.random();
      const len = 8 + Math.random() * 16;
      const angle = Math.random() * Math.PI * 2;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      g.lineBetween(x, y, ex, ey);
    }

    // Debris piles (small decorative chunks)
    g.fillStyle(0x3a3f4a, 0.7);
    for (let i = 0; i < 8; i++) {
      const x = 100 + Math.random() * (this.W - 200);
      const y = 180 + Math.random() * (this.H - 280);
      const size = 6 + Math.random() * 8;
      g.fillRect(x, y, size, size * 0.6);
      // Highlight
      g.fillStyle(0x4a5060, 0.4);
      g.fillRect(x, y, size * 0.4, size * 0.3);
      g.fillStyle(0x3a3f4a, 0.7);
    }

    // Broken furniture/rubble scattered around
    this._drawRubble(g);

    // Warning indicators
    this._drawWarningMarkers(g);
  }

  _drawRubble(g) {
    // Small broken furniture pieces (no collision, purely visual)
    const rubblePositions = [
      { x: 60, y: 180 },
      { x: 740, y: 420 },
      { x: 200, y: 500 },
      { x: 600, y: 100 },
    ];

    rubblePositions.forEach((pos) => {
      // Broken chair/furniture piece
      g.fillStyle(0x2a3546, 0.6);
      g.fillRect(pos.x, pos.y, 16, 8);
      g.lineStyle(1, 0x1e2d3d, 0.8);
      g.strokeRect(pos.x, pos.y, 16, 8);

      // Detail marks
      g.lineStyle(1, 0x1e2d3d, 0.4);
      g.lineBetween(pos.x + 4, pos.y, pos.x + 4, pos.y + 8);
      g.lineBetween(pos.x + 12, pos.y, pos.x + 12, pos.y + 8);
    });
  }

  _drawWarningMarkers(g) {
    // Simple warning zones (visual only, no collision)
    const warningZones = [
      { x: 200, y: 350 },
      { x: 600, y: 250 },
    ];

    warningZones.forEach((z) => {
      // Warning indicator box
      g.lineStyle(2, 0xf85149, 0.5);
      g.strokeRect(z.x - 20, z.y - 20, 40, 40);

      // Corner markers
      g.fillStyle(0xf85149, 0.4);
      g.fillRect(z.x - 22, z.y - 22, 4, 4);
      g.fillRect(z.x + 18, z.y - 22, 4, 4);
      g.fillRect(z.x - 22, z.y + 18, 4, 4);
      g.fillRect(z.x + 18, z.y + 18, 4, 4);
    });
  }

  // ── Evacuation Exit ──────────────────────────────────────────────────────
  _drawEvacuationExit() {
    const g = this.scene.add.graphics().setDepth(2);
    
    const exitZone = new Phaser.Geom.Rectangle(
      this.W - 104,
      this.H - 64,
      88,
      48,
    );

    // Exit area with green highlight
    g.fillStyle(0x3fb950, 0.1);
    g.fillRect(exitZone.x, exitZone.y, exitZone.width, exitZone.height);

    // Border
    g.lineStyle(2, 0x3fb950, 0.6);
    g.strokeRect(exitZone.x, exitZone.y, exitZone.width, exitZone.height);

    // Store reference for scene use
    this.scene.exitZone = exitZone;
  }

  /**
   * Get cover zones for gameplay (no modification needed)
   */
  getCoverZones() {
    return this.coverZones;
  }
}
