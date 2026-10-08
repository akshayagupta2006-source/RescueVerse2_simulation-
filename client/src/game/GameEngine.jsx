import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import PreloadScene from "./scenes/PreloadScene";
import EarthquakeScene from "./scenes/EarthquakeScene";
import FloodScene from "./scenes/FloodScene";
import { getSceneConfig, getSceneKey } from "./SceneConfig";

const PHASE_LABELS = {
  calm: "Calm — Monitoring",
  shaking_strong: "⚡ Strong Shaking",
  shaking_weak: "⚡ Weak Shaking",
  rising_water: "🌊 Water Rising",
  flash_flood: "🌊 Flash Flood!",
  evacuation: "→ Evacuate Now!",
  end: "Simulation Ended",
};

const PHASE_COLORS = {
  calm: "#27ae60",
  shaking_strong: "#ef4444",
  shaking_weak: "#ea580c",
  rising_water: "#3b82f6",
  flash_flood: "#2563eb",
  evacuation: "#1f6aa5",
  end: "#8a9bb0",
};

const OBJECTIVE_MESSAGES = {
  calm: "Monitor the situation and prepare for emergencies.",
  shaking_strong: "Take cover immediately! Drop, Cover, Hold on.",
  shaking_weak: "Stay away from windows. Wait for shaking to stop.",
  rising_water: "Water is rising. Move to higher ground quickly.",
  flash_flood: "Flash flood! Avoid debris and deep water.",
  evacuation: "Evacuate to the Safe Zone!",
  end: "Simulation over."
};

export default function GameEngine({ scenario, onSimulationEnd }) {
  const mountRef = useRef(null);
  const gameRef = useRef(null);

  const [phase, setPhase] = useState("calm");
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);

  const difficulty = scenario?.difficulty || "beginner";
  const cfg = getSceneConfig(difficulty);
  
  // Decide which duration map to use based on scenario type
  const isFlood = scenario?.type === "flood";
  const durationsObj = isFlood ? (cfg.floodDurations || cfg.durations) : cfg.durations;
  const totalTime = Object.values(durationsObj).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return;

    const targetScene = getSceneKey(scenario?.type || "earthquake");

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 560,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      parent: mountRef.current,
      backgroundColor: "#1a1f2e",
      scene: [PreloadScene, EarthquakeScene, FloodScene],
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
    });
    gameRef.current = game;

    game.events.once("ready", () => {
      game.registry.set("difficulty", difficulty);
      game.registry.set("targetScene", targetScene);
      game.registry.set("scenarioId", scenario?._id);
      game.registry.set("scenarioType", scenario?.type || "earthquake");

      const attachSceneListeners = () => {
        const scene = game.scene.getScene(targetScene);
        if (!scene || !scene.sys.isActive()) {
          setTimeout(attachSceneListeners, 300);
          return;
        }

        scene.events.on("phaseChange", (p) => setPhase(p));
        scene.events.on("scoreUpdate", (s) => setScore(s));
        scene.events.on("simulationEnd", (result) => {
          onSimulationEnd({
            ...result,
            scenarioId: scenario?._id,
            scenarioType: scenario?.type || "earthquake",
          });
        });
        setReady(true);

        const poll = setInterval(() => {
          if (!game.isRunning) {
            clearInterval(poll);
            return;
          }
          try {
            const h = scene.registry.get("health");
            const e = scene.registry.get("elapsed");
            const s = scene.registry.get("score");
            if (h != null) setHealth(h);
            if (e != null) setElapsed(e);
            if (s != null) setScore(s);
          } catch {
            clearInterval(poll);
          }
        }, 400);
      };

      game.scene
        .getScene("PreloadScene")
        ?.events.on("shutdown", () => setTimeout(attachSceneListeners, 200));
      setTimeout(attachSceneListeners, 200);
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // eslint-disable-line

  const healthColor =
    health > 60 ? "#27ae60" : health > 30 ? "#e67e22" : "#e74c3c";
  const phaseColor = PHASE_COLORS[phase] || "#1a1a2e";
  const progressPct = Math.min(100, (elapsed / Math.max(totalTime, 1)) * 100);
  const timeLeft = Math.max(0, totalTime - elapsed);
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");

  return (
    <div
      className="rv-game-wrapper"
      style={{ display: "block", position: "relative", width: "100%", aspectRatio: "800 / 560", borderRadius: "12px", overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,0.5)" }}
    >
      {/* Phaser canvas */}
      <div
        ref={mountRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* ── Modern Floating HUD ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "16px 20px",
          pointerEvents: "none",
          zIndex: 10
        }}
      >
        {/* Left Side: Objective Panel */}
        <div 
          className="rv-hud-panel fade-down"
          style={{ 
            display: "flex", flexDirection: "column", gap: "6px",
            background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)",
            padding: "12px 18px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: "220px", maxWidth: "260px"
          }}
        >
          <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>
            Current Objective
          </div>
          <div style={{ color: "#f8fafc", fontSize: "0.95rem", lineHeight: "1.4", fontWeight: "500" }}>
            {OBJECTIVE_MESSAGES[phase] || "Stay safe!"}
          </div>
          {/* Phase Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: phaseColor, boxShadow: `0 0 8px ${phaseColor}` }} />
            <span style={{ fontSize: "0.8rem", color: phaseColor, fontWeight: "600" }}>{PHASE_LABELS[phase] || phase}</span>
          </div>
        </div>

        {/* Right Side: Stats Panel */}
        <div 
          className="rv-hud-panel fade-down"
          style={{ 
            display: "flex", gap: "24px",
            background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)",
            padding: "12px 24px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
          }}
        >
          {/* Score */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" }}>Score</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 700, color: "#ea580c", lineHeight: 1, marginTop: "4px" }}>
              {score}
            </div>
          </div>

          {/* Health */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" }}>Health</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 700, color: healthColor, lineHeight: 1, marginTop: "4px" }}>
              {health}%
            </div>
          </div>

          {/* Time */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" }}>Time Left</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc", lineHeight: 1, fontVariantNumeric: "tabular-nums", marginTop: "8px" }}>
              {mins}:{secs}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar (Bottom) */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(0,0,0,0.5)", zIndex: 10 }}>
        <div
          style={{
            height: "100%", width: `${progressPct}%`, background: phaseColor,
            transition: "width 1s linear, background 0.5s ease",
            boxShadow: `0 0 10px ${phaseColor}`
          }}
        />
      </div>

      {/* Controls hint (Floating at bottom center) */}
      <div
        style={{
          position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
          padding: "6px 16px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.05)",
          fontSize: "0.75rem", color: "#cbd5e1", textAlign: "center", zIndex: 10, pointerEvents: "none"
        }}
      >
        {isFlood
          ? <>WASD / Arrows: Move &nbsp;·&nbsp; SPACE: Climb to Safety &nbsp;·&nbsp; E: Rescue / Carry</>
          : <>WASD / Arrows: Move &nbsp;·&nbsp; SPACE: Take Cover &nbsp;·&nbsp; E: Help NPC</>}
      </div>

      {/* Loading overlay */}
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.96)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <img src="/logo.png" alt="" style={{ height: 56, opacity: 0.8 }} />
          <div
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "1.4rem",
              color: "var(--blue)",
            }}
          >
            Rescue<span style={{ color: "var(--gold)" }}>Verse</span>
          </div>
          <div className="rv-loader-ring" />
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Loading simulation…
          </div>
        </div>
      )}
    </div>
  );
}
