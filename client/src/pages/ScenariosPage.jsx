import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getActiveScenarios } from '../services/results';

const SCENARIO_VISUALS = {
  earthquake: { img: '/earthquake.png',  subtitle: 'Survive the tremors',    color: '#e67e22' },
  flood:      { img: '/flood.png',       subtitle: 'Navigate rising waters',  color: '#1f6aa5' },
  cyclone:    { img: '/earthquake1.png', subtitle: 'Survive extreme winds',     color: '#e74c3c' },
};

const DIFF_BADGE = {
  beginner:     { label: 'Beginner',     cls: 'rv-badge-green' },
  intermediate: { label: 'Intermediate', cls: 'rv-badge-amber' },
  advanced:     { label: 'Advanced',     cls: 'rv-badge-red'   },
};

export default function ScenariosPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    // Fetch scenarios — works logged in or out (auth interceptor adds token if present)
    getActiveScenarios()
      .then(r => setScenarios(r.data.scenarios))
      .catch(() => setScenarios([]))
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (scenario) => {
    if (!scenario.active || scenario.durationSeconds === 0) return;
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/simulate/${scenario._id}`, { state: { scenario } });
  };

  // Static fallback cards shown when DB returns nothing
  const FALLBACK = [
    { _id: 'eq', type: 'earthquake', name: 'Urban Earthquake — Level 1', difficulty: 'beginner',     active: true,  durationSeconds: 180 },
    { _id: 'fl', type: 'flood',      name: 'Flash Flood Response',        difficulty: 'intermediate', active: true,  durationSeconds: 180 },
    { _id: 'fi', type: 'fire',       name: 'Building Fire Evacuation',    difficulty: 'advanced',     active: false, durationSeconds: 0   },
    { _id: 'cy', type: 'cyclone',    name: 'Coastal Cyclone Alert',       difficulty: 'intermediate', active: false, durationSeconds: 0   },
  ];

  const displayScenarios = scenarios.length > 0 ? scenarios : FALLBACK;

  return (
    <>
      <Navbar />

      <section className="rv-scenarios-section">
        <h1 className="rv-section-title">Choose Your Scenario</h1>
        <p className="rv-section-sub">
          Select a disaster scenario to begin your training experience.
          {!user && (
            <span style={{ display: 'block', marginTop: 8, color: 'var(--blue)', fontSize: '0.88rem' }}>
              <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign in</Link> to start training.
            </span>
          )}
        </p>

        {loading ? (
          <div className="rv-loader" style={{ marginTop: 60 }}>
            <div className="rv-loader-ring" />
            <p>Loading scenarios…</p>
          </div>
        ) : (
          <div className="rv-scenario-grid">
            {displayScenarios.map((s, i) => {
              const visual  = SCENARIO_VISUALS[s.type] || SCENARIO_VISUALS.earthquake;
              const diff    = DIFF_BADGE[s.difficulty] || DIFF_BADGE.beginner;
              const isLocked = !s.active || s.durationSeconds === 0;

              return (
                <div
                  key={s._id}
                  className={`rv-scenario-card${isLocked ? ' locked' : ''}`}
                  style={{ animationDelay: `${i * 0.12}s` }}
                  onClick={() => handleClick(s)}
                  title={isLocked ? 'Coming soon' : `Start ${s.type} scenario`}
                >
                  <img src={visual.img} alt={s.name} />

                  {/* Difficulty badge */}
                  <span className={`rv-scenario-badge ${isLocked ? 'coming-soon' : 'active'}`}>
                    {isLocked ? 'Coming Soon' : diff.label}
                  </span>

                  <div className="rv-scenario-info">
                    <h3>{s.type.charAt(0).toUpperCase() + s.type.slice(1)}</h3>
                    <p>{visual.subtitle}</p>
                    {!isLocked && (
                      <span className="rv-explore-btn">
                        {user ? 'Start Training →' : 'Sign in to Train →'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}
