import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard',   icon: '⊞', label: 'Dashboard' },
  { to: '/scenarios',   icon: '◈', label: 'Scenarios' },
  { to: '/history',     icon: '◷', label: 'Training History' },
  { to: '/leaderboard', icon: '◉', label: 'Leaderboard' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isInstructor = user && ['instructor', 'admin'].includes(user.role);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="rv-shell">
      {/* Topbar */}
      <header className="rv-topbar">
        <div className="rv-topbar-logo">
          <img src="/logo.png" alt="RescueVerse" />
          <span>Rescue<span className="gold">Verse</span></span>
        </div>
        <div className="rv-topbar-spacer" />
        <div className="rv-topbar-user">
          {isInstructor && <span className="rv-badge rv-badge-amber">{user.role.toUpperCase()}</span>}
          <span>Welcome, <strong>{user?.username}</strong></span>
          <span className="rv-topbar-score">⭐ {(user?.totalScore ?? 0).toLocaleString()} pts</span>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '999px', padding: '6px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.target.style.borderColor = 'var(--blue)'}
            onMouseOut={e => e.target.style.borderColor = 'var(--border)'}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className="rv-sidebar">
        <div className="rv-sidebar-section">Navigation</div>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `rv-sidebar-item${isActive ? ' active' : ''}`}
          >
            <span className="rv-sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {isInstructor && (
          <>
            <div className="rv-sidebar-section">Instructor</div>
            <NavLink to="/instructor" className={({ isActive }) => `rv-sidebar-item${isActive ? ' active' : ''}`}>
              <span className="rv-sidebar-icon">◧</span>
              Instructor View
            </NavLink>
          </>
        )}

        <div style={{ flex: 1 }} />
        <div className="rv-sidebar-section">My Stats</div>
        <div className="rv-sidebar-stat">
          <span className="rv-sidebar-stat-label">Total Score</span>
          <span className="rv-sidebar-stat-val" style={{ color: 'var(--blue)' }}>
            {(user?.totalScore ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="rv-sidebar-stat">
          <span className="rv-sidebar-stat-label">Simulations</span>
          <span className="rv-sidebar-stat-val" style={{ color: 'var(--text-muted)', fontSize: '1.3rem' }}>
            {user?.totalSimulations ?? 0}
          </span>
        </div>
      </nav>

      {/* Main */}
      <main className="rv-main">
        <Outlet />
      </main>
    </div>
  );
}
