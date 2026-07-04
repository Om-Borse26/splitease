import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function SkeletonCard() {
  return (
    <div className="glass" style={{ padding: '1.25rem' }}>
      <div className="skeleton" style={{ height: '1.25rem', width: '60%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '0.875rem', width: '40%' }} />
    </div>
  );
}

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setError(null);
    try {
      const res = await api.get('/groups');
      if (res.data.success) setGroups(res.data.data);
    } catch (err) {
      setError('Failed to load groups. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await api.post('/groups', { name: newGroupName });
      if (res.data.success) {
        setGroups([res.data.data, ...groups]);
        setNewGroupName('');
      }
    } catch (err) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  // Color palette for group avatars
  const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', color: '#f1f5f9' }}>
          Your Groups
        </h2>
        <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.9rem', margin: 0 }}>
          Create a group and start splitting expenses instantly.
        </p>
      </div>

      {/* Create Group Card */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '1rem', marginTop: 0 }}>
          ➕ New Group
        </h3>
        {createError && (
          <div className="toast-error" role="alert">
            <span>⚠️</span> {createError}
          </div>
        )}
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="group-name" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              placeholder="E.g., Weekend Trip, House Expenses…"
              className="input-field"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              disabled={creating}
              aria-label="New group name"
            />
          </div>
          <button type="submit" disabled={creating} className="btn-primary" id="create-group-btn">
            {creating ? <><span className="spinner"></span> Creating…</> : 'Create'}
          </button>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="toast-error" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span> {error}
          <button
            onClick={fetchGroups}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Groups Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : groups.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
            <p style={{ color: 'rgba(241,245,249,0.5)', margin: 0 }}>No groups yet — create one above!</p>
          </div>
        ) : (
          groups.map((g, i) => {
            const color = avatarColors[i % avatarColors.length];
            return (
              <Link
                key={g.id}
                to={`/group/${g.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="glass"
                  style={{
                    padding: '1.25rem',
                    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 12px 40px ${color}33`;
                    e.currentTarget.style.borderColor = `${color}55`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
                    background: `${color}22`, border: `1px solid ${color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem', marginBottom: '0.875rem',
                  }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.3rem' }}>
                    {g.name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(241,245,249,0.4)', margin: 0 }}>
                    {g.member_count || 1} member{(g.member_count !== 1) ? 's' : ''} · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                  <div style={{
                    marginTop: '1rem', paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: color, fontWeight: 600 }}>View Group →</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
