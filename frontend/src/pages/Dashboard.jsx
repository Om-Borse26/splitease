import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      if (res.data.success) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/groups', { name: newGroupName });
      if (res.data.success) {
        setGroups([res.data.data, ...groups]);
        setNewGroupName('');
      }
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading groups...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Groups</h2>
      
      <div className="bg-white p-4 rounded shadow mb-8">
        <h3 className="font-semibold mb-2">Create New Group</h3>
        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input 
            type="text" 
            placeholder="E.g., Weekend Trip" 
            className="flex-1 p-2 border rounded"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            disabled={creating}
          />
          <button 
            type="submit" 
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.length === 0 ? (
          <p className="text-gray-500">You don't have any groups yet.</p>
        ) : (
          groups.map(g => (
            <Link 
              key={g.id} 
              to={`/group/${g.id}`}
              className="bg-white p-4 rounded shadow hover:shadow-md transition block border border-transparent hover:border-blue-200"
            >
              <h3 className="font-bold text-lg">{g.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {g.member_count || 1} member{(g.member_count !== 1) ? 's' : ''} • Created {new Date(g.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
