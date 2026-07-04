import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/signup', { email, username, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            className="w-full p-2 border rounded" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password" 
            className="w-full p-2 border rounded" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            minLength={6}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-center">
        Already have an account? <Link to="/login" className="text-blue-600">Login</Link>
      </p>
    </div>
  );
}
