import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="rv-auth-page">
      <div className="rv-auth-box">
        <div className="rv-auth-logo">
          <img src="/logo.png" alt="RescueVerse" />
          <h2>Rescue<span className="gold">Verse</span></h2>
        </div>
        <p className="rv-auth-sub">Create your account to begin training.</p>

        {error && <div className="rv-alert rv-alert-error">{error}</div>}

        <form className="rv-auth-form" onSubmit={handleSubmit}>
          {[
            { label: 'Username',         key: 'username', type: 'text',     placeholder: 'your_callsign' },
            { label: 'Email Address',    key: 'email',    type: 'email',    placeholder: 'you@example.com' },
            { label: 'Password',         key: 'password', type: 'password', placeholder: 'min. 6 characters' },
            { label: 'Confirm Password', key: 'confirm',  type: 'password', placeholder: 'repeat password' },
          ].map(f => (
            <div key={f.key}>
              <label className="rv-form-label">{f.label}</label>
              <input className="rv-form-input" type={f.type} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required />
            </div>
          ))}
          <button
            type="submit"
            className="btn-rv-primary btn-rv-full"
            style={{ marginTop: 8, padding: '13px', borderRadius: 14, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Get Started'}
          </button>
        </form>

        <p className="rv-auth-footer" style={{ marginTop: 20 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
