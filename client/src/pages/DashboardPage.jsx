import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyResults, getPersonalAnalytics } from '../services/results';

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPersonalAnalytics().then(r => setAnalytics(r.data.analytics)),
      getMyResults().then(r => setRecent(r.data.results.slice(0, 5))),
    ]).finally(() => setLoading(false));
  }, []);

  const lastGrade = recent[0]?.grade ?? null;

  if (loading) return <div className="rv-loader"><div className="rv-loader-ring" /><p>Loading your dashboard…</p></div>;

  return (
    <div className="fade-in">
      <div className="rv-page-header">
        <h1 className="rv-page-title">Welcome back, {user?.username} 👋</h1>
        <p className="rv-page-sub">Track your disaster response training progress.</p>
      </div>

      {/* Stats */}
      <div className="rv-stat-grid">
        <div className="rv-stat-card"><div className="rv-stat-label">Total Score</div><div className="rv-stat-value blue">{(user?.totalScore ?? 0).toLocaleString()}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Simulations</div><div className="rv-stat-value blue">{user?.totalSimulations ?? 0}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Success Rate</div><div className="rv-stat-value green">{analytics?.successRate ?? '—'}%</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Avg Score</div><div className="rv-stat-value gold">{analytics?.avgScore ?? '—'}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Survivors Helped</div><div className="rv-stat-value green">{analytics?.totalSurvivors ?? 0}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Last Grade</div><div className={`rv-stat-value grade-${lastGrade}`} style={{ fontFamily: 'Playfair Display, serif' }}>{lastGrade ?? '—'}</div></div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Advisory */}
        <div className="rv-card">
          <div className="rv-card-title">Performance Advisory</div>
          <div className="rv-card-sub" style={{ marginBottom: 14 }}>Based on your latest simulation</div>
          {analytics?.topMistake ? (
            <div style={{ padding: '12px 16px', background: '#fff8e1', border: '1px solid #f9e4a0', borderRadius: 'var(--radius)', fontSize: '0.86rem' }}>
              <strong style={{ color: '#e67e22' }}>Top recurring error: </strong>
              <span style={{ color: 'var(--text-muted)' }}>{analytics.topMistake.action.replace(/_/g, ' ')} ({analytics.topMistake.count}×)</span>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Complete a simulation to get personalised feedback.</p>
          )}
        </div>

        {/* Quick links */}
        <div className="rv-card">
          <div className="rv-card-title">Quick Actions</div>
          <div className="rv-card-sub" style={{ marginBottom: 16 }}>Jump into training</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/scenarios" className="btn-rv-primary" style={{ borderRadius: 12, padding: '12px 20px', fontSize: '0.92rem' }}>▶ Select Scenario</Link>
            <Link to="/history"   className="btn-rv-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px 20px', borderRadius: 12, fontSize: '0.88rem' }}>◷ Training History</Link>
            <Link to="/leaderboard" className="btn-rv-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '11px 20px', borderRadius: 12, fontSize: '0.88rem' }}>◉ Leaderboard</Link>
          </div>
        </div>
      </div>

      {/* Recent sims */}
      <div className="rv-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="rv-card-title">Recent Simulations</div>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No simulations yet. <Link to="/scenarios" style={{ color: 'var(--blue)', fontWeight: 600 }}>Start your first training run.</Link>
          </div>
        ) : (
          <table className="rv-table">
            <thead><tr><th>Scenario</th><th>Score</th><th>Grade</th><th>Survivors</th><th>Evacuated</th><th>Date</th></tr></thead>
            <tbody>
              {recent.map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 500 }}>{r.scenarioId?.name ?? r.scenarioType}</td>
                  <td>{r.score}</td>
                  <td><span className={`grade-${r.grade}`} style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700 }}>{r.grade}</span></td>
                  <td>{r.survivorsHelped}</td>
                  <td>{r.evacuated ? <span className="rv-badge rv-badge-green">Yes</span> : <span className="rv-badge rv-badge-red">No</span>}</td>
                  <td style={{ color: 'var(--text-light)', fontSize: '0.82rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
