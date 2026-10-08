import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <>
      <footer className="rv-footer">
        <div>
          <div className="rv-footer-logo">
            <img src="/logo.png" alt="RescueVerse" />
            <span>Rescue<span className="gold">Verse</span></span>
          </div>
          <p className="rv-footer-desc">
            Training individuals and teams to respond effectively during disasters through
            immersive, science-backed simulations.
          </p>
        </div>
        <div className="rv-footer-col">
          <h4>Quick Links</h4>
          <Link to="/scenarios">Scenarios</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/login">Login</Link>
        </div>
        <div className="rv-footer-col">
          <h4>Contact</h4>
          <a href="mailto:support@rescueverse.com">support@rescueverse.com</a>
          <a href="#">+91 98000 00001</a>
        </div>
      </footer>
      <div className="rv-footer-bottom">
        © 2026 RescueVerse. Training for a safer tomorrow.
      </div>
    </>
  );
}
