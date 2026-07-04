import express from 'express';
import { query } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, email, username 
      FROM users 
      WHERE username ILIKE $1 OR email ILIKE $1 
      LIMIT 10
    `, [`%${req.query.search || ''}%`]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;