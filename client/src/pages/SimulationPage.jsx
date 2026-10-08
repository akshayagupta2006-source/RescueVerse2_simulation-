import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../hooks/useSimulation';
import GameEngine from '../game/GameEngine';
import Navbar from '../components/Navbar';

const SCENARIO_IMAGES = {
  earthquake: '/earthquake1.png',
  flood:      '/flood.png',
  stampede:   '/stampede.png',
  fire:       '/earthquake.png',
};

const GRADE_COLOR = { S:'#8e44ad', A:'#27ae60', B:'#1f6aa5', C:'#e67e22', D:'#e67e22', F:'#e74c3c' };

const DIFF_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function SimulationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const scenario = state?.scenario;
  const [gameStarted, setGameStarted] = useState(false);

  const { simResult, saving, saveError, saved, grade, passed, handleEnd, startSimulation } = useSimulation(user, setUser);

  useEffect(() => { startSimulation(); }, []); // eslint-disable-line

  if (!scenario) return (
    <>
      <Navbar />
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 16 }}>No scenario selected</h2>
        <Link to="/scenarios" className="btn-rv-primary">← Back to Scenarios</Link>
      </div>
    </>
  );

  const heroImg = SCENARIO_IMAGES[scenario.type] || '/earthquake1.png';

  return (
    <>
      <Navbar minimal />

      {/* ── Scenario Detail (before game starts) ────────────── */}
      {!gameStarted && !simResult && (
        <>
          {/* Hero banner */}
          <div className="rv-scenario-hero">
            <img src={heroImg} alt={scenario.name} />
            <div className="rv-scenario-hero-overlay">
              <div className="rv-scenario-hero-text">
                <Link to="/scenarios" className="rv-back-link">← Back to Scenarios</Link>
                <h1>{scenario.type.charAt(0).toUpperCase() + scenario.type.slice(1)}</h1>
                <p>{scenario.name}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="rv-scenario-details">
            <div className="rv-details-left">
              <h2>About This Scenario</h2>
              <p>{scenario.description}</p>

              {scenario.objectives?.length > 0 && (
                <>
                  <div className="rv-objectives-title">
                    <span>🎯</span> Objectives
                  </div>
                  <ul className="rv-objectives-list">
                    {scenario.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                  </ul>
                </>
              )}

              <div style={{ marginTop: 28, padding: '14px 18px', background: 'var(--blue-light)', borderRadius: 'var(--radius)', fontSize: '0.86rem', color: 'var(--blue)' }}>
                <strong>Controls:</strong> WASD to move · SPACE to take cover · E to help NPCs
              </div>
            </div>

            <div>
              <div className="rv-info-box">
                <div className="rv-info-row">
                  <span className="rv-info-icon">⏱</span>
                  <div>
                    <div className="rv-info-label">Duration</div>
                    <div className="rv-info-value">{Math.round((scenario.durationSeconds || 60) / 60)} min</div>
                  </div>
                </div>
                <div className="rv-info-row">
                  <span className="rv-info-icon">📊</span>
                  <div>
                    <div className="rv-info-label">Difficulty</div>
                    <div className="rv-info-value">{DIFF_LABELS[scenario.difficulty] || 'Medium'}</div>
                  </div>
                </div>
                <div className="rv-info-row">
                  <span className="rv-info-icon">🏆</span>
                  <div>
                    <div className="rv-info-label">Passing Score</div>
                    <div className="rv-info-value">450+ points</div>
                  </div>
                </div>
              </div>

              <button
                className="btn-rv-primary btn-rv-full btn-rv-large"
                style={{ borderRadius: 14, fontSize: '1rem', justifyContent: 'center' }}
                onClick={() => setGameStarted(true)}
              >
                ▶ Start Scenario
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Active Game ──────────────────────────────────────── */}
      {gameStarted && !simResult && (
        <div style={{ padding: '24px 32px', background: 'var(--bg)', minHeight: '80vh' }}>
         <div style={{ width: 'min(1200px, 100%, calc((100vh - 230px) * 800 / 560))', margin: '0 auto' }}>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700 }}>
              {scenario.type.charAt(0).toUpperCase() + scenario.type.slice(1)}
            </span>
            <span className={`rv-badge rv-badge-${scenario.difficulty === 'beginner' ? 'green' : scenario.difficulty === 'intermediate' ? 'amber' : 'red'}`}>
              {DIFF_LABELS[scenario.difficulty]}
            </span>
          </div>
          <div style={{ border: '2px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'block', boxShadow: 'var(--shadow-lg)' }}>
            <GameEngine scenario={scenario} onSimulationEnd={handleEnd} />
          </div>
         </div>
        </div>
      )}

      {/* ── Results overlay ──────────────────────────────────── */}
      {simResult && (
        <div className="rv-results-overlay">
          <div className="rv-results-box">
            <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.72rem', color: 'var(--text-light)', letterSpacing: 2, textTransform: 'uppercase' }}>
              Simulation Complete
            </div>
            <div className="rv-results-grade" style={{ color: GRADE_COLOR[grade] }}>{grade}</div>
            <div className="rv-results-score">
              Final Score: <span>{simResult.score}</span>
            </div>

            <div className="rv-results-grid">
              {[
                { label: 'Health',    val: `${simResult.healthRemaining}%`, color: simResult.healthRemaining > 50 ? '#27ae60' : '#e74c3c' },
                { label: 'Survivors', val: simResult.survivorsHelped,       color: '#27ae60' },
                { label: 'Evacuated', val: simResult.evacuated ? 'YES':'NO', color: simResult.evacuated ? '#27ae60' : '#e74c3c' },
                { label: 'Lost',      val: simResult.survivorsLost,          color: simResult.survivorsLost > 0 ? '#e74c3c' : 'var(--text-muted)' },
                { label: 'Duration',  val: `${Math.floor(simResult.durationSeconds/60)}m ${simResult.durationSeconds%60}s`, color: 'var(--text-muted)' },
                { label: 'Decisions', val: simResult.decisions?.length || 0, color: 'var(--blue)' },
              ].map(item => (
                <div className="rv-result-cell" key={item.label}>
                  <div className="rv-result-cell-label">{item.label}</div>
                  <div className="rv-result-cell-val" style={{ color: item.color }}>{item.val}</div>
                </div>
              ))}
            </div>

            <div className={`rv-pass-banner ${passed ? 'pass' : 'fail'}`}>
              {passed ? '✓ Training Passed' : '✗ Training Failed'}
            </div>

            {saving  && <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: 12 }}>Saving result…</p>}
            {saveError && <div className="rv-alert rv-alert-error">{saveError}</div>}
            {saved  && <div className="rv-alert rv-alert-success">Result saved to your training record.</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-rv-primary" onClick={() => window.location.reload()}>↺ Retry</button>
              <button className="btn-rv-outline" onClick={() => navigate('/scenarios')}>← Scenarios</button>
              <button className="btn-rv-outline" onClick={() => navigate('/history')}>My History</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
