import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function InstructorPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/analytics/instructor')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load instructor data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rv-loader"><div className="rv-loader-ring" /><p>Loading instructor data…</p></div>;
  if (error)   return <div className="rv-alert rv-alert-error">{error}</div>;
  if (!data)   return null;

  const { trainees, totalRuns, avgScore, successRate, gradeDistribution, recentRuns } = data;

  const GRADE_COLORS = { S:'#8e44ad', A:'#27ae60', B:'#1f6aa5', C:'#e67e22', D:'#e67e22', F:'#e74c3c' };

  return (
    <div className="fade-in">
      <div className="rv-page-header">
        <h1 className="rv-page-title">Instructor Dashboard</h1>
        <p className="rv-page-sub">Aggregate performance across all enrolled trainees</p>
      </div>

      {/* Summary stats */}
      <div className="rv-stat-grid" style={{ marginBottom: 24 }}>
        <div className="rv-stat-card"><div className="rv-stat-label">Total Trainees</div><div className="rv-stat-value blue">{trainees}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Total Runs</div><div className="rv-stat-value gold">{totalRuns}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Avg Score</div><div className="rv-stat-value green">{avgScore}</div></div>
        <div className="rv-stat-card"><div className="rv-stat-label">Success Rate</div><div className="rv-stat-value blue">{successRate}%</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>

        {/* Grade distribution */}
        <div className="rv-card">
          <div className="rv-card-title" style={{ marginBottom: 20 }}>Grade Distribution</div>
          {gradeDistribution && Object.entries(gradeDistribution).map(([grade, count]) => {
            const pct = totalRuns > 0 ? Math.round((count / totalRuns) * 100) : 0;
            return (
              <div key={grade} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.86rem' }}>
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700, color: GRADE_COLORS[grade] }}>{grade}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} run{count !== 1 ? 's' : ''} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: GRADE_COLORS[grade], borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="rv-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="rv-card-title">Recent Activity</div>
          </div>
          <table className="rv-table">
            <thead>
              <tr><th>Trainee</th><th>Scenario</th><th>Score</th><th>Grade</th><th>Date</th></tr>
            </thead>
            <tbody>
              {(recentRuns || []).map(r => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r.userId?.username ?? '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {r.scenarioId?.name ?? r.scenarioType}
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.score}</td>
                  <td>
                    <span className={`grade-${r.grade}`} style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700 }}>
                      {r.grade}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!recentRuns || recentRuns.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)', padding: 32 }}>
                    No runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
