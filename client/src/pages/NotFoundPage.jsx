import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function NotFoundPage() {
  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 40,
        background: 'var(--bg)',
      }}>
        <div style={{ fontSize: '6rem', marginBottom: 8 }}>🛡️</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '3rem', color: 'var(--text)', marginBottom: 12 }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '1rem' }}>
          This sector doesn't exist. Return to base.
        </p>
        <Link to="/" className="btn-rv-primary btn-rv-large">← Return to Home</Link>
      </div>
    </>
  );
}
