import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        navigate('/');
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💸</div>
          <h2 style={{
            fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem',
            background: 'linear-gradient(135deg, #818cf8, #c084fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Welcome back</h2>
          <p style={{ color: 'rgba(241,245,249,0.5)', fontSize: '0.875rem', margin: 0 }}>
            Sign in to your SplitEase account
          </p>
        </div>

        {error && (
          <div className="toast-error" role="alert" aria-live="polite">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alice@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            {loading ? <><span className="spinner"></span> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'rgba(241,245,249,0.45)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}
