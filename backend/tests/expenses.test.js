import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.unstable_mockModule('../src/db/client.js', () => ({
  query: jest.fn(),
}));
jest.unstable_mockModule('../src/middleware/auth.js', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'user-1', username: 'testuser' };
    next();
  }
}));

const db = await import('../src/db/client.js');
const expensesRoutes = (await import('../src/routes/expenses.js')).default;

const app = express();
app.use(express.json());
// Simulate the mount path from groups.js
app.use('/api/groups/:id/expenses', expensesRoutes);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, error: err.message });
});

describe('Expenses Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/groups/:id/expenses - success', async () => {
    db.query.mockResolvedValueOnce({}); // BEGIN
    db.query.mockResolvedValueOnce({ rows: [{ id: 'ex-1', amount: 100 }] }); // INSERT expense
    db.query.mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }); // GET members
    
    // For 2 members, it will loop twice doing INSERT split, SELECT username, UPDATE balance
    for(let i=0; i<2; i++) {
      db.query.mockResolvedValueOnce({}); // split
      db.query.mockResolvedValueOnce({ rows: [{ username: `user-${i}` }] }); // username
      db.query.mockResolvedValueOnce({}); // balance
    }
    
    db.query.mockResolvedValueOnce({}); // COMMIT

    const res = await request(app)
      .post('/api/groups/group-1/expenses')
      .send({ description: 'Dinner', amount: 100, paid_by: 'user-1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/groups/:id/expenses - invalid input (missing amount)', async () => {
    const res = await request(app)
      .post('/api/groups/group-1/expenses')
      .send({ description: 'Dinner', paid_by: 'user-1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/groups/:id/expenses - success', async () => {
    db.query.mockResolvedValueOnce({ 
      rows: [{ id: 'ex-1', description: 'Dinner', amount: 100, paid_by_username: 'testuser' }] 
    }); // Expenses
    
    db.query.mockResolvedValueOnce({ 
      rows: [{ user_id: 'user-1', amount: 50 }, { user_id: 'user-2', amount: 50 }] 
    }); // Splits

    const res = await request(app).get('/api/groups/group-1/expenses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].splits.length).toBe(2);
  });
});
