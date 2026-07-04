import express from 'express';
import pool, { query } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

const checkMembership = async (groupId, userId) => {
  const result = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  return result.rows.length > 0;
};

router.post('/', authMiddleware, async (req, res, next) => {
  let client;
  try {
    const groupId = req.params.id || req.body.group_id; 
    const { description, amount, paid_by, split_type } = req.body;

    if (!groupId || !description || !amount || !paid_by) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing fields' } });
    }

    if (!await checkMembership(groupId, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this group' } });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    
    // Create expense
    const exRes = await client.query(
      'INSERT INTO expenses (group_id, description, amount, paid_by, split_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, group_id, description, amount, paid_by, created_at',
      [groupId, description, amount, paid_by, split_type || 'equal']
    );
    const expense = exRes.rows[0];

    // Get all group members for equal split
    const mRes = await client.query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
    const members = mRes.rows.map(r => r.user_id);
    const splitAmount = parseFloat((amount / members.length).toFixed(2));
    
    const splits = [];
    for (const userId of members) {
      await client.query(
        'INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)',
        [expense.id, userId, splitAmount]
      );
      
      const uRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
      splits.push({ user_id: userId, username: uRes.rows[0]?.username, amount: splitAmount });

      let balanceChange = 0;
      if (userId === paid_by) {
        balanceChange = parseFloat(amount) - splitAmount;
      } else {
        balanceChange = -splitAmount;
      }

      await client.query(
        'UPDATE balances SET balance = balance + $1 WHERE group_id = $2 AND user_id = $3',
        [balanceChange, groupId, userId]
      );
    }

    await client.query('COMMIT');

    if (req.io) {
      req.io.to(groupId).emit('expense_added', { group_id: groupId, expense });
      
      const bRes = await query(`
        SELECT b.user_id, u.username, b.balance
        FROM balances b JOIN users u ON b.user_id = u.id
        WHERE b.group_id = $1
      `, [groupId]);
      const balances = bRes.rows.map(r => ({ ...r, balance: parseFloat(r.balance) }));
      req.io.to(groupId).emit('balances_updated', { group_id: groupId, balances });
    }

    res.status(201).json({ success: true, data: { expense, splits } });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const groupId = req.params.id || req.query.group_id;
    if (!groupId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing group_id' } });

    if (!await checkMembership(groupId, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this group' } });
    }

    const exRes = await query(`
      SELECT e.*, u.username as paid_by_username
      FROM expenses e
      JOIN users u ON e.paid_by = u.id
      WHERE e.group_id = $1
      ORDER BY e.created_at DESC
    `, [groupId]);

    const expenses = [];
    for (const row of exRes.rows) {
      const spRes = await query(`
        SELECT es.user_id, u.username, es.amount
        FROM expense_splits es
        JOIN users u ON es.user_id = u.id
        WHERE es.expense_id = $1
      `, [row.id]);
      
      expenses.push({
        ...row,
        amount: parseFloat(row.amount),
        splits: spRes.rows.map(s => ({ ...s, amount: parseFloat(s.amount) }))
      });
    }

    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
});

router.delete('/:expenseId', authMiddleware, async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    
    const exRes = await client.query('SELECT * FROM expenses WHERE id = $1', [req.params.expenseId]);
    if (exRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }
    const expense = exRes.rows[0];

    // Check IDOR
    if (!await checkMembership(expense.group_id, req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not a member of this group' } });
    }

    const splits = await client.query('SELECT * FROM expense_splits WHERE expense_id = $1', [expense.id]);
    
    for (const split of splits.rows) {
      let balanceChange = 0;
      if (split.user_id === expense.paid_by) {
        balanceChange = -(parseFloat(expense.amount) - parseFloat(split.amount));
      } else {
        balanceChange = parseFloat(split.amount);
      }
      await client.query('UPDATE balances SET balance = balance + $1 WHERE group_id = $2 AND user_id = $3', [balanceChange, expense.group_id, split.user_id]);
    }

    await client.query('DELETE FROM expenses WHERE id = $1', [expense.id]);
    await client.query('COMMIT');

    if (req.io) {
      req.io.to(expense.group_id).emit('expense_removed', { group_id: expense.group_id, expense_id: expense.id });
      const bRes = await query(`
        SELECT b.user_id, u.username, b.balance
        FROM balances b JOIN users u ON b.user_id = u.id
        WHERE b.group_id = $1
      `, [expense.group_id]);
      req.io.to(expense.group_id).emit('balances_updated', { group_id: expense.group_id, balances: bRes.rows.map(r => ({ ...r, balance: parseFloat(r.balance) })) });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    if (client) client.release();
  }
});

export default router;
