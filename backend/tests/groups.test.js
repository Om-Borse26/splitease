import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

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
    req.user = { id: 'user-1', email: 'test@example.com', username: 'testuser' };
    next();
  }
}));

const db = await import('../src/db/client.js');
const groupsRoutes = (await import('../src/routes/groups.js')).default;

const app = express();
app.use(express.json());
app.use('/api/groups', groupsRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

describe('Groups Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/groups - success', async () => {
    db.query.mockResolvedValueOnce(); // BEGIN
    db.query.mockResolvedValueOnce({ rows: [{ id: 'group-1', name: 'Trip' }] }); // INSERT group
    db.query.mockResolvedValueOnce({}); // INSERT member
    db.query.mockResolvedValueOnce({}); // INSERT balance
    db.query.mockResolvedValueOnce({}); // COMMIT

    const res = await request(app).post('/api/groups').send({ name: 'Trip' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('group-1');
  });

  it('POST /api/groups - invalid input (missing name)', async () => {
    const res = await request(app).post('/api/groups').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/groups/:id - success', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // membership check
    db.query.mockResolvedValueOnce({ rows: [{ id: 'group-1', name: 'Trip' }] }); // group
    db.query.mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'testuser' }] }); // members

    const res = await request(app).get('/api/groups/group-1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members.length).toBe(1);
  });

  it('GET /api/groups/:id - not found', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] }); // membership check
    db.query.mockResolvedValueOnce({ rows: [] }); // group not found

    const res = await request(app).get('/api/groups/group-not-found');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
