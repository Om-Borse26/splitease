import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { socket } from '../services/socket';

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmt, setNewExpenseAmt] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchGroupData();
    
    // WebSockets setup
    socket.emit('join_group', { group_id: id });
    
    socket.on('expense_added', (data) => {
      if (data.group_id === id) fetchExpenses(); // or append directly
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
    try {
      const [gRes, eRes, bRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`)
      ]);
      if (gRes.data.success) setGroup(gRes.data.data);
      if (eRes.data.success) setExpenses(eRes.data.data);
      if (bRes.data.success) setBalances(bRes.data.data.balances);
    } catch (err) {
      console.error(err);
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
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpenseDesc,
        amount: parseFloat(newExpenseAmt),
        paid_by: currentUser.id,
        split_type: 'equal'
      });
      setNewExpenseDesc('');
      setNewExpenseAmt('');
      // WebSockets will trigger fetchExpenses and balance updates
    } catch (err) {
      console.error('Failed to add expense', err);
    } finally {
      setAddingExpense(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      // search user
      const searchRes = await api.get(`/users?search=${encodeURIComponent(inviteEmail)}`);
      const users = searchRes.data.data;
      if (users.length > 0) {
        const userId = users[0].id;
        await api.post(`/groups/${id}/members`, { user_ids: [userId] });
        setInviteEmail('');
      } else {
        alert('User not found!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading group...</div>;
  if (!group) return <div className="text-center mt-10">Group not found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Column: Expenses & Add Form */}
      <div className="md:col-span-2 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{group.name}</h2>
          <p className="text-sm text-gray-500">Created {new Date(group.created_at).toLocaleDateString()}</p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-4 text-lg">Add an Expense</h3>
          <form onSubmit={handleAddExpense} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Description</label>
              <input 
                type="text" placeholder="e.g. Dinner" className="w-full p-2 border rounded"
                value={newExpenseDesc} onChange={e => setNewExpenseDesc(e.target.value)} required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <input 
                type="number" step="0.01" min="0" placeholder="0.00" className="w-full p-2 border rounded"
                value={newExpenseAmt} onChange={e => setNewExpenseAmt(e.target.value)} required
              />
            </div>
            <button 
              type="submit" disabled={addingExpense}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 h-10"
            >
              Add
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-lg border-b pb-2">Expenses</h3>
          {expenses.length === 0 ? (
            <p className="text-gray-500 text-sm">No expenses yet.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map(ex => (
                <div key={ex.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{ex.description}</p>
                    <p className="text-xs text-gray-500">
                      Paid by {ex.paid_by_username === currentUser.username ? 'You' : ex.paid_by_username} on {new Date(ex.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${ex.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Balances & Members */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 border-b pb-2">Group Balances</h3>
          {balances.length === 0 ? (
            <p className="text-sm text-gray-500">No balances yet.</p>
          ) : (
            <ul className="space-y-2">
              {balances.map(b => (
                <li key={b.user_id} className="flex justify-between items-center text-sm">
                  <span>{b.username === currentUser.username ? 'You' : b.username}</span>
                  <span className={`font-semibold ${b.balance > 0 ? 'text-green-600' : b.balance < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {b.balance > 0 ? '+' : ''}{b.balance.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 border-b pb-2">Members</h3>
          <ul className="space-y-2 mb-4">
            {group.members?.map(m => (
              <li key={m.id} className="text-sm text-gray-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                  {m.username.charAt(0)}
                </div>
                {m.username}
              </li>
            ))}
          </ul>

          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="text" placeholder="Invite by username" className="flex-1 p-2 text-sm border rounded"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
            />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Add</button>
          </form>
        </div>
      </div>
    </div>
  );
}
