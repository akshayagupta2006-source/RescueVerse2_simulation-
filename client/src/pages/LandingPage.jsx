import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="rv-hero">
        <div className="rv-hero-overlay" />
        <div className="rv-hero-content">
          <h1>Interactive Disaster<br /><span className="blue">Response Training Simulator</span></h1>
          <p>
            Train. Respond. Rescue. Survive. Master earthquake, flood, and other disaster
            protocols in a safe, engaging, and highly realistic environment.
          </p>
          <div className="rv-hero-buttons">
            <Link to="/register" className="btn-rv-primary btn-rv-large">
              Start Training Free →
            </Link>
            <Link to="/scenarios" className="btn-rv-outline btn-rv-large">
              View Scenarios
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="rv-features" id="features">
        <h2 className="rv-section-title">Why Choose RescueVerse?</h2>
        <p className="rv-section-sub">
          Our platform combines cutting-edge simulation with proven emergency response methodologies.
        </p>
        <div className="rv-feature-cards">
          {[
            { icon: '🛡️', title: 'Safe Learning Environment', desc: 'Practice emergency responses without real-world risks' },
            { icon: '⚡', title: 'Interactive Scenarios',     desc: 'Engage with realistic disaster simulations' },
            { icon: '👥', title: 'Team Training',             desc: 'Build coordination skills with group exercises' },
          ].map(f => (
            <div className="rv-feature-card" key={f.title}>
              <div className="rv-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
