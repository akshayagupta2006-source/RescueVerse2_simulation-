import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleDisabled = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      const msg =
        err.response?.data?.message ||
        (err.code ? `Firebase: ${err.code}` : null) ||
        err.message ||
        'Google sign-in is unavailable right now. Please use email and password instead.';
      setError(msg);
    }
  };

  return (
    <div className="rv-auth-page">
      <div className="rv-auth-box">
        <div className="rv-auth-logo">
          <img src="/logo.png" alt="RescueVerse" />
          <h2>Rescue<span className="gold">Verse</span></h2>
        </div>
        <p className="rv-auth-sub">Welcome back. Sign in to continue your training.</p>

        {error && <div className="rv-alert rv-alert-error">{error}</div>}

        <form className="rv-auth-form" onSubmit={handleSubmit}>
          <div>
            <label className="rv-form-label">Email Address</label>
            <input className="rv-form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="rv-form-label">Password</label>
            <input className="rv-form-input" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button
            type="submit"
            className="btn-rv-primary btn-rv-full"
            style={{ marginTop: 8, padding: '13px', borderRadius: 14, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="rv-auth-divider" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: '#888', fontSize: '0.8rem' }}>
          <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} /> OR <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleDisabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '12px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.2)',
            background: googleDisabled ? 'rgba(255,255,255,0.15)' : '#fff',
            color: googleDisabled ? '#cbd5e1' : '#333',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: googleDisabled ? 'not-allowed' : 'pointer',
            opacity: googleDisabled ? 0.7 : 1,
          }}
          title={googleDisabled ? 'Google sign-in is unavailable in this local setup.' : 'Continue with Google'}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" height="18" />
          {googleDisabled ? 'Google sign-in unavailable' : 'Continue with Google'}
        </button>

        <p className="rv-auth-footer" style={{ marginTop: 20 }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
