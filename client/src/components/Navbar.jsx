import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ minimal = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className={`rv-navbar${scrolled ? ' scrolled' : ''}`}>
      <Link to={user ? '/dashboard' : '/'} className="rv-logo">
        <img src="/logo.png" alt="RescueVerse" />
        <span>Rescue<span className="gold">Verse</span></span>
      </Link>

      {!minimal && !user && (
        <nav className="rv-nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      )}

      <div className="rv-nav-actions">
        {user ? (
          <>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Welcome, <strong style={{ color: 'var(--text)' }}>{user.username}</strong>
            </span>
            <button className="btn-rv-outline" onClick={handleLogout} style={{ padding: '8px 18px', fontSize: '0.86rem' }}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-rv-ghost">Sign in</Link>
            <Link to="/register" className="btn-rv-primary">Get Started</Link>
          </>
        )}
      </div>
    </header>
  );
}
