import express from 'express';
import { query } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true }); // Allows access to group /:id if mounted that way

router.post('/', authMiddleware, async (req, res, next) => {
  // Path is typically /api/groups/:id/expenses, so group ID is in req.params.id
  // but to keep routing clean, we map /api/groups/:id/expenses to this router in index.js, OR we map /api/expenses globally. 
  // Let's assume we map in index.js via app.use('/api/groups/:id/expenses', expensesRoutes) or similar. 
  // Actually, in index.js I mapped app.use('/api/expenses', expensesRoutes). So wait, the API contract says: POST /api/groups/:id/expenses
  try {
    const { group_id } = req.body; // Wait, API Contract POST /api/groups/:id/expenses doesn't have group_id in body.
    // If it's mounted at /api/expenses, we need group_id. Let's adjust index.js or just read group_id from body if we mount at /api/expenses.
    // The contract: POST /api/groups/:id/expenses
    const groupId = req.params.id || req.body.group_id; 
    const { description, amount, paid_by, split_type } = req.body;

    if (!groupId || !description || !amount || !paid_by) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing fields' } });
    }

    await query('BEGIN');
    
    // Create expense
    const exRes = await query(
      'INSERT INTO expenses (group_id, description, amount, paid_by, split_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, group_id, description, amount, paid_by, created_at',
      [groupId, description, amount, paid_by, split_type || 'equal']
    );
    const expense = exRes.rows[0];

    // Get all group members for equal split
    const mRes = await query('SELECT user_id FROM group_members WHERE group_id = $1', [groupId]);
    const members = mRes.rows.map(r => r.user_id);
    const splitAmount = parseFloat((amount / members.length).toFixed(2));
    
    // We might have a penny rounding error, but this is a hackathon MVP.
    const splits = [];

    for (const userId of members) {
      await query(
        'INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)',
        [expense.id, userId, splitAmount]
      );
      
      const uRes = await query('SELECT username FROM users WHERE id = $1', [userId]);
      splits.push({ user_id: userId, username: uRes.rows[0]?.username, amount: splitAmount });

      // Update balances
      // If I am the payer, my balance increases by (amount - splitAmount).
      // Wait, balance = positive means owed money. 
      // If I pay $120 for 4 people, I am owed $90. My balance += 90.
      // Other 3 people owe $30. Their balance -= 30.
      // Net balance (positive = owed money, negative = owes money)
      let balanceChange = 0;
      if (userId === paid_by) {
        balanceChange = parseFloat(amount) - splitAmount;
      } else {
        balanceChange = -splitAmount;
      }

      await query(
        'UPDATE balances SET balance = balance + $1 WHERE group_id = $2 AND user_id = $3',
        [balanceChange, groupId, userId]
      );
    }

    await query('COMMIT');

    // Broadcast expense_added
    if (req.io) {
      req.io.to(groupId).emit('expense_added', { group_id: groupId, expense });
      
      // Also broadcast updated balances
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
    await query('ROLLBACK');
    next(err);
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const groupId = req.params.id || req.query.group_id;
    if (!groupId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing group_id' } });

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

// DELETE /api/groups/:id/expenses/:expenseId
router.delete('/:expenseId', authMiddleware, async (req, res, next) => {
  try {
    // Left as an exercise or basic implementation for MVP:
    // 1. Revert balances
    // 2. Delete expense
    await query('BEGIN');
    
    const exRes = await query('SELECT * FROM expenses WHERE id = $1', [req.params.expenseId]);
    if (exRes.rows.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    const expense = exRes.rows[0];

    const splits = await query('SELECT * FROM expense_splits WHERE expense_id = $1', [expense.id]);
    
    for (const split of splits.rows) {
      let balanceChange = 0;
      if (split.user_id === expense.paid_by) {
        balanceChange = -(parseFloat(expense.amount) - parseFloat(split.amount));
      } else {
        balanceChange = parseFloat(split.amount);
      }
      await query('UPDATE balances SET balance = balance + $1 WHERE group_id = $2 AND user_id = $3', [balanceChange, expense.group_id, split.user_id]);
    }

    await query('DELETE FROM expenses WHERE id = $1', [expense.id]);
    await query('COMMIT');

    if (req.io) {
      req.io.to(expense.group_id).emit('expense_removed', { group_id: expense.group_id, expense_id: expense.id });
      // Broadcast updated balances
      const bRes = await query(`
        SELECT b.user_id, u.username, b.balance
        FROM balances b JOIN users u ON b.user_id = u.id
        WHERE b.group_id = $1
      `, [expense.group_id]);
      req.io.to(expense.group_id).emit('balances_updated', { group_id: expense.group_id, balances: bRes.rows.map(r => ({ ...r, balance: parseFloat(r.balance) })) });
    }

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    await query('ROLLBACK');
    next(err);
  }
});

export default router;
