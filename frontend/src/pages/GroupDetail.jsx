import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { socket } from '../services/socket';

function Toast({ message, type = 'error', onDismiss }) {
  const className = type === 'error' ? 'toast-error' : 'toast-success';
  return (
    <div className={className} role="alert" aria-live="polite" style={{ position: 'relative' }}>
      <span>{type === 'error' ? '⚠️' : '✅'}</span>
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Forms
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmt, setNewExpenseAmt] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState(null);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchGroupData();
    socket.emit('join_group', { group_id: id });

    socket.on('expense_added', (data) => {
      if (data.group_id === id) fetchExpenses();
    });
    socket.on('balances_updated', (data) => {
      if (data.group_id === id) setBalances(data.balances);
    });
    socket.on('member_joined', (data) => {
      if (data.group_id === id) fetchGroupData();
    });

    return () => {
      socket.emit('leave_group', { group_id: id });
      socket.off('expense_added');
      socket.off('balances_updated');
      socket.off('member_joined');
    };
  }, [id]);

  const fetchGroupData = async () => {
    setLoadError(null);
    try {
      const [gRes, eRes, bRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
      ]);
      if (gRes.data.success) setGroup(gRes.data.data);
      if (eRes.data.success) setExpenses(eRes.data.data);
      if (bRes.data.success) setBalances(bRes.data.data.balances);
    } catch (err) {
      setLoadError('Failed to load group data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const eRes = await api.get(`/groups/${id}/expenses`);
      if (eRes.data.success) setExpenses(eRes.data.data);
    } catch (err) {}
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpenseDesc || !newExpenseAmt) return;
    setAddingExpense(true);
    setExpenseError(null);
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpenseDesc,
        amount: parseFloat(newExpenseAmt),
        paid_by: currentUser.id,
        split_type: 'equal',
      });
      setNewExpenseDesc('');
      setNewExpenseAmt('');
      // WebSockets will broadcast the update
    } catch (err) {
      setExpenseError(err.response?.data?.error?.message || 'Failed to add expense.');
    } finally {
      setAddingExpense(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername) return;
    setInviting(true);
    setInviteMessage(null);
    try {
      const searchRes = await api.get(`/users?search=${encodeURIComponent(inviteUsername)}`);
      const users = searchRes.data.data;
      if (users.length > 0) {
        await api.post(`/groups/${id}/members`, { user_ids: [users[0].id] });
        setInviteUsername('');
        setInviteMessage({ type: 'success', text: `${users[0].username} added to the group!` });
        setTimeout(() => setInviteMessage(null), 3000);
      } else {
        setInviteMessage({ type: 'error', text: 'No user found with that username.' });
      }
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to add member.' });
    } finally {
      setInviting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '4rem', borderRadius: '0.75rem' }} />
          <div className="skeleton" style={{ height: '8rem', borderRadius: '0.75rem' }} />
          <div className="skeleton" style={{ height: '12rem', borderRadius: '0.75rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '10rem', borderRadius: '0.75rem' }} />
          <div className="skeleton" style={{ height: '10rem', borderRadius: '0.75rem' }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#f87171', marginBottom: '1rem' }}>{loadError}</p>
        <button onClick={fetchGroupData} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Group not found.</p>
        <Link to="/" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
      {/* ─── Left Column ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

        {/* Group Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/" aria-label="Back to Dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '1.25rem' }}>
            ←
          </Link>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: '0 0 0.125rem' }}>
              {group.name}
            </h2>
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.8rem', margin: 0 }}>
              Created {new Date(group.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Add Expense Form */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 1rem' }}>
            💳 Add an Expense
          </h3>
          {expenseError && (
            <Toast message={expenseError} type="error" onDismiss={() => setExpenseError(null)} />
          )}
          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="expense-desc" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Description
              </label>
              <input
                id="expense-desc"
                type="text"
                placeholder="e.g. Dinner, Taxi…"
                className="input-field"
                value={newExpenseDesc}
                onChange={e => setNewExpenseDesc(e.target.value)}
                required
              />
            </div>
            <div style={{ width: '8rem' }}>
              <label htmlFor="expense-amount" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount ($)
              </label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="input-field"
                value={newExpenseAmt}
                onChange={e => setNewExpenseAmt(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              id="add-expense-btn"
              disabled={addingExpense}
              className="btn-success"
              style={{ height: '2.5rem', whiteSpace: 'nowrap' }}
            >
              {addingExpense ? <><span className="spinner"></span> Adding…</> : '+ Add'}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            📋 Expenses
          </h3>
          {expenses.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(241,245,249,0.4)', margin: 0, fontSize: '0.9rem' }}>
                No expenses yet. Add the first one above!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {expenses.map((ex, i) => (
                <div
                  key={ex.id}
                  className="glass-light expense-item"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    animationDelay: `${i * 0.04}s`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: '#f1f5f9', margin: '0 0 0.2rem', fontSize: '0.95rem' }}>
                      {ex.description}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(241,245,249,0.4)', margin: 0 }}>
                      Paid by{' '}
                      <span style={{ color: '#a5b4fc', fontWeight: 600 }}>
                        {ex.paid_by_username === currentUser.username ? 'You' : ex.paid_by_username}
                      </span>
                      {' · '}{new Date(ex.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f1f5f9', margin: 0 }}>
                      ${parseFloat(ex.amount).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(241,245,249,0.35)', margin: 0, fontWeight: 500 }}>
                      EQUAL SPLIT
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Column ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Balances */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            ⚖️ Balances
          </h3>
          {balances.length === 0 ? (
            <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: '0.85rem', margin: 0 }}>No balances yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {balances.map(b => {
                const isMe = b.username === currentUser.username;
                const bal = parseFloat(b.balance);
                const balClass = bal > 0 ? 'balance-positive' : bal < 0 ? 'balance-negative' : 'balance-zero';
                return (
                  <li key={b.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                        background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#818cf8',
                        textTransform: 'uppercase',
                      }}>
                        {b.username.charAt(0)}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: isMe ? '#c4b5fd' : '#cbd5e1', fontWeight: isMe ? 600 : 400 }}>
                        {isMe ? 'You' : b.username}
                      </span>
                    </div>
                    <span className={balClass} style={{ fontSize: '0.9rem' }}>
                      {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Members */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            👥 Members
          </h3>
          <ul style={{ listStyle: 'none', margin: '0 0 1rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {group.members?.map(m => (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                  background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase',
                }}>
                  {m.username.charAt(0)}
                </div>
                <span style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>{m.username}</span>
              </li>
            ))}
          </ul>

          {inviteMessage && (
            <Toast
              message={inviteMessage.text}
              type={inviteMessage.type}
              onDismiss={() => setInviteMessage(null)}
            />
          )}

          <form onSubmit={handleInvite} aria-label="Invite member form" style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="invite-username" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                Username to invite
              </label>
              <input
                id="invite-username"
                type="text"
                placeholder="Add by username…"
                className="input-field"
                value={inviteUsername}
                onChange={e => setInviteUsername(e.target.value)}
                required
                disabled={inviting}
                aria-label="Username to invite"
              />
            </div>
            <button
              type="submit"
              id="invite-btn"
              disabled={inviting}
              className="btn-primary"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.8rem' }}
              aria-label="Add member"
            >
              {inviting ? <span className="spinner"></span> : 'Add'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
