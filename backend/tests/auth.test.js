import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
const mockQuery = jest.fn();
jest.unstable_mockModule('../src/db/client.js', () => ({
  query: mockQuery,
  default: {
    connect: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn(),
    }),
    query: mockQuery
  }
}));

const db = await import('../src/db/client.js');
const authRoutes = (await import('../src/routes/auth.js')).default;

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/auth/signup - success', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // No existing user
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: '1', email: 'test@test.com', username: 'tester', created_at: new Date() }] 
    }); // Insert result

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', username: 'tester', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/signup - fails on duplicate email', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: '1' }] }); // Existing user found

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', username: 'tester', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - success', async () => {
    const hash = await bcrypt.hash('password123', 10);
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: '1', email: 'test@test.com', username: 'tester', password_hash: hash }] 
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });
});
