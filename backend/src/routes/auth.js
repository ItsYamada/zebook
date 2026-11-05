import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 });

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Helper: Creates a session row in MySQL and returns a signed JWT
async function issueUserToken(user) {
  const sessionId = crypto.randomUUID();
  const days = config.userSessionDays || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (id, user_id, is_guest, expires_at)
     VALUES (?, ?, 0, ?)`,
    [sessionId, user.id, expiresAt]
  );
  return signToken({ sid: sessionId, uid: user.id, role: user.role }, `${days}d`);
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check the highlighted fields', details: parsed.error.flatten().fieldErrors });
  }
  const { name, email, password } = parsed.data;

  const exists = await query('SELECT 1 FROM users WHERE email = ?', [email]);
  if (exists.rowCount > 0) return res.status(409).json({ error: 'That email is already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );

  const userId = result.insertId;
  const user = { id: userId, name, email, role: 'user' };

  const token = await issueUserToken(user);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' });
  const { email, password } = parsed.data;

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = await issueUserToken(user);
  delete user.password_hash;
  res.json({ token, user });
});

// POST /api/auth/guest
router.post('/guest', authLimiter, async (_req, res) => {
  const sessionId = crypto.randomUUID();
  const hours = config.guestSessionHours || 24;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (id, user_id, is_guest, expires_at)
     VALUES (?, NULL, 1, ?)`,
    [sessionId, expiresAt]
  );
  const token = signToken({ sid: sessionId, role: 'guest', guest: true }, `${hours}h`);
  res.status(201).json({ token, guest: true, downloadLimit: config.limits.guest });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await query('UPDATE sessions SET revoked_at = NOW() WHERE id = ?', [req.auth.sessionId]);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { sessionId, userId, isGuest } = req.auth;
  const { rows } = isGuest
    ? await query('SELECT COUNT(DISTINCT book_id) AS n FROM downloads WHERE session_id = ?', [sessionId])
    : await query('SELECT COUNT(DISTINCT book_id) AS n FROM downloads WHERE user_id = ?', [userId]);

  const used = rows[0]?.n || 0;
  res.json({
    isGuest,
    user: isGuest ? null : { id: userId, name: req.auth.name, email: req.auth.email, role: req.auth.role },
    downloads: { used, limit: isGuest ? config.limits.guest : config.limits.user },
  });
});

export default router;