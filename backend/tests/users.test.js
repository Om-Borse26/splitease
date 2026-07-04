import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

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
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  }
}));

const db = await import('../src/db/client.js');
const usersRoutes = (await import('../src/routes/users.js')).default;

const app = express();
app.use(express.json());
app.use('/api/users', usersRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/users?search=xxx - success', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'user-2', username: 'bob', email: 'bob@example.com' }] });

    const res = await request(app).get('/api/users?search=bob');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].username).toBe('bob');
  });

  it('GET /api/users - empty search returns 200 with data', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
