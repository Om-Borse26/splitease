import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const { email, username, password } = parsed.data;

    // Check if exists
    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email or username already in use' } });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
      [email, username, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, process.env.JWT_SECRET || 'fallback-secret-for-hackathon', { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const { email, password } = parsed.data;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, process.env.JWT_SECRET || 'fallback-secret-for-hackathon', { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, username: user.username },
        token
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, username, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;