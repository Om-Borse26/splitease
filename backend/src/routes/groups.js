import express from 'express';
import { query } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';
import expensesRouter from './expenses.js';

const router = express.Router();

// Mount expenses
router.use('/:id/expenses', expensesRouter);

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } });
    }

    // Begin transaction
    await query('BEGIN');
    const groupResult = await query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name, created_by, created_at',
      [name, req.user.id]
    );
    const group = groupResult.rows[0];

    // Auto-add creator as member
    await query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.user.id]
    );

    // Initial balance
    await query(
      'INSERT INTO balances (group_id, user_id, balance) VALUES ($1, $2, 0)',
      [group.id, req.user.id]
    );

    await query('COMMIT');
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    await query('ROLLBACK');
    next(err);
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT g.id, g.name, g.created_by, g.created_at, COUNT(gm.user_id)::int as member_count
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = $1)
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const groupResult = await query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (groupResult.rows.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });

    const membersResult = await query(`
      SELECT u.id, u.username, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1
    `, [req.params.id]);

    const group = groupResult.rows[0];
    group.members = membersResult.rows;

    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/members', authMiddleware, async (req, res, next) => {
  try {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'user_ids must be an array' } });
    }

    const added = [];
    const skipped = [];
    for (const userId of user_ids) {
      try {
        await query('BEGIN');
        await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [req.params.id, userId]);
        await query('INSERT INTO balances (group_id, user_id, balance) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING', [req.params.id, userId]);
        await query('COMMIT');
        
        const uRes = await query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = uRes.rows[0]?.username;
        
        added.push({ user_id: userId, username, joined_at: new Date() });
        
        // Broadcast
        if (req.io) {
          req.io.to(req.params.id).emit('member_joined', {
            group_id: req.params.id,
            member: { user_id: userId, username }
          });
        }
      } catch (e) {
        await query('ROLLBACK');
        skipped.push({ user_id: userId, reason: e.message });
      }
    }

    res.status(201).json({ success: true, data: { added_members: added, skipped } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/members/:userId', authMiddleware, async (req, res, next) => {
  try {
    const bRes = await query('SELECT balance FROM balances WHERE group_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    if (bRes.rows.length > 0 && parseFloat(bRes.rows[0].balance) !== 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot leave with non-zero balance' } });
    }

    await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    await query('DELETE FROM balances WHERE group_id = $1 AND user_id = $2', [req.params.id, req.params.userId]);
    
    if (req.io) {
      req.io.to(req.params.id).emit('member_left', { group_id: req.params.id, user_id: req.params.userId });
    }
    
    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
});

// Balances
router.get('/:id/balances', authMiddleware, async (req, res, next) => {
  try {
    const gRes = await query('SELECT name FROM groups WHERE id = $1', [req.params.id]);
    if (gRes.rows.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });

    const bRes = await query(`
      SELECT b.user_id, u.username, b.balance
      FROM balances b
      JOIN users u ON b.user_id = u.id
      WHERE b.group_id = $1
    `, [req.params.id]);

    // Format balances nicely
    const balances = bRes.rows.map(r => ({ ...r, balance: parseFloat(r.balance) }));

    res.json({
      success: true,
      data: {
        group_id: req.params.id,
        group_name: gRes.rows[0].name,
        balances,
        settlement_suggestions: [] // MVP placeholder
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
