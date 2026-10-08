import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/results';
import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getLeaderboard().then(r => setBoard(r.data.leaderboard)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="rv-loader"><div className="rv-loader-ring" /><p>Loading leaderboard…</p></div>;

  return (
    <div className="fade-in">
      <div className="rv-page-header">
        <h1 className="rv-page-title">Leaderboard</h1>
        <p className="rv-page-sub">Global rankings by cumulative score across all simulations</p>
      </div>
      <div className="rv-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="rv-table">
          <thead><tr><th>Rank</th><th>Trainee</th><th>Total Score</th><th>Simulations</th><th>Avg Score</th></tr></thead>
          <tbody>
            {board.map((entry, i) => {
              const isMe = entry.username === user?.username;
              const avg = entry.totalSimulations > 0 ? Math.round(entry.totalScore / entry.totalSimulations) : 0;
              return (
                <tr key={entry._id} style={isMe ? { background: '#e8f4fd', outline: '1.5px solid var(--blue)' } : {}}>
                  <td style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', width: 60 }}>
                    {i < 3 ? MEDALS[i] : <span style={{ color: 'var(--text-light)' }}>#{i + 1}</span>}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: isMe ? 'var(--blue)' : 'var(--text)' }}>
                      {entry.username} {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--blue)' }}>(you)</span>}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem' }}>{entry.totalScore.toLocaleString()}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{entry.totalSimulations}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{avg}</td>
                </tr>
              );
            })}
            {board.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>No entries yet. Be the first!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
