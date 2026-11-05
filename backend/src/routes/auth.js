import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
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

// Creates a session row in PostgreSQL and returns a signed JWT (user id + role inside)
async function issueUserToken(user) {
  const { rows } = await query(
    `INSERT INTO sessions (user_id, is_guest, expires_at)
     VALUES ($1, false, now() + ($2 || ' days')::interval) RETURNING id`,
    [user.id, String(config.userSessionDays)]
  );
  return signToken({ sid: rows[0].id, uid: user.id, role: user.role }, `${config.userSessionDays}d`);
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check the highlighted fields', details: parsed.error.flatten().fieldErrors });
  }
  const { name, email, password } = parsed.data;

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (exists.rowCount) return res.status(409).json({ error: 'That email is already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, name, email, role`,
    [name, email, passwordHash]
  );
  const token = await issueUserToken(rows[0]);
  res.status(201).json({ token, user: rows[0] });
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password' });
  const { email, password } = parsed.data;

  const { rows } = await query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = await issueUserToken(user);
  delete user.password_hash;
  res.json({ token, user });
});

// POST /api/auth/guest  -> guest JWT (role "guest", limited to 5 downloads)
router.post('/guest', authLimiter, async (_req, res) => {
  const { rows } = await query(
    `INSERT INTO sessions (user_id, is_guest, expires_at)
     VALUES (NULL, true, now() + ($1 || ' hours')::interval) RETURNING id`,
    [String(config.guestSessionHours)]
  );
  const token = signToken({ sid: rows[0].id, role: 'guest', guest: true }, `${config.guestSessionHours}h`);
  res.status(201).json({ token, guest: true, downloadLimit: config.limits.guest });
});

// POST /api/auth/logout  -> revokes the session, so the token stops working immediately
router.post('/logout', requireAuth, async (req, res) => {
  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [req.auth.sessionId]);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me  -> who am I + download usage
router.get('/me', requireAuth, async (req, res) => {
  const { sessionId, userId, isGuest } = req.auth;
  const { rows } = isGuest
    ? await query('SELECT count(DISTINCT book_id)::int AS n FROM downloads WHERE session_id = $1', [sessionId])
    : await query('SELECT count(DISTINCT book_id)::int AS n FROM downloads WHERE user_id = $1', [userId]);

  res.json({
    isGuest,
    user: isGuest ? null : { id: userId, name: req.auth.name, email: req.auth.email, role: req.auth.role },
    downloads: { used: rows[0].n, limit: isGuest ? config.limits.guest : config.limits.user },
  });
});

export default router;
