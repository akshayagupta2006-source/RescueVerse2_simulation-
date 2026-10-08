import React, { useEffect, useState } from 'react';
import { getMyResults } from '../services/results';

export default function HistoryPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyResults()
      .then(r => setResults(r.data.results))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rv-loader"><div className="rv-loader-ring" /><p>Loading history…</p></div>;

  return (
    <div className="fade-in">
      <div className="rv-page-header">
        <h1 className="rv-page-title">Training History</h1>
        <p className="rv-page-sub">{results.length} simulation{results.length !== 1 ? 's' : ''} on record</p>
      </div>

      <div className="rv-card" style={{ padding: 0, overflow: 'hidden' }}>
        {results.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No training history yet. Complete a scenario to see your results here.
          </div>
        ) : (
          <table className="rv-table">
            <thead>
              <tr>
                <th>#</th><th>Scenario</th><th>Score</th><th>Grade</th>
                <th>Health</th><th>Survivors</th><th>Evacuated</th>
                <th>Duration</th><th>Result</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r._id}>
                  <td style={{ color: 'var(--text-light)', fontSize: '0.82rem' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.scenarioId?.name ?? r.scenarioType}
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.score}</td>
                  <td>
                    <span className={`grade-${r.grade}`} style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700 }}>
                      {r.grade}
                    </span>
                  </td>
                  <td style={{ color: r.healthRemaining > 50 ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                    {r.healthRemaining}%
                  </td>
                  <td>{r.survivorsHelped}</td>
                  <td>
                    {r.evacuated
                      ? <span className="rv-badge rv-badge-green">Yes</span>
                      : <span className="rv-badge rv-badge-red">No</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {Math.floor(r.durationSeconds / 60)}m {r.durationSeconds % 60}s
                  </td>
                  <td>
                    {r.passed
                      ? <span className="rv-badge rv-badge-green">Pass</span>
                      : <span className="rv-badge rv-badge-red">Fail</span>}
                  </td>
                  <td style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Decision log for most recent */}
      {results[0]?.decisions?.length > 0 && (
        <div className="rv-card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="rv-card-title">Latest Decision Log</div>
            <div className="rv-card-sub">Every decision made in your most recent simulation</div>
          </div>
          <table className="rv-table">
            <thead>
              <tr><th>Time</th><th>Phase</th><th>Action</th><th>Score Impact</th></tr>
            </thead>
            <tbody>
              {results[0].decisions.map((d, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{d.timestamp}s</td>
                  <td><span className="rv-badge rv-badge-blue">{d.phase.replace(/_/g, ' ').toUpperCase()}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{d.action.replace(/_/g, ' ')}</td>
                  <td style={{ fontWeight: 700, color: d.scoreImpact >= 0 ? '#27ae60' : '#e74c3c' }}>
                    {d.scoreImpact >= 0 ? '+' : ''}{d.scoreImpact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
