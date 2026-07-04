import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://017be23053c1ce377c984c29d5653593@o4511678046601216.ingest.us.sentry.io/4511678128586752",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const isLoggedIn = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Glassmorphic Header */}
        <header style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 1.5rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💸</span>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>SplitEase</h1>
          </div>

          {isLoggedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(241,245,249,0.5)' }}>
                {user.username}
              </span>
              <button
                id="logout-btn"
                onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.375rem',
                  padding: '0.3rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.target.style.color = '#f1f5f9'}
                onMouseLeave={e => e.target.style.color = '#94a3b8'}
              >
                Logout
              </button>
            </div>
          )}
        </header>

        <main style={{ padding: '2rem 1.5rem', maxWidth: '960px', margin: '0 auto' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/group/:id" element={<PrivateRoute><GroupDetail /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
