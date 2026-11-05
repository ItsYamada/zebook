import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';

/**
 * Token payload: { sid, uid, role, guest }
 *  sid   = session row id (lets us revoke tokens on logout)
 *  uid   = user id (null for guests)
 *  role  = 'user' | 'admin' | 'guest'
 *  guest = true for guest tokens
 */
export function signToken({ sid, uid = null, role = 'guest', guest = false }, expiresIn) {
  return jwt.sign({ sid, uid, role, guest }, config.jwtSecret, { expiresIn });
}

/**
 * Verifies "Authorization: Bearer <token>", checks the session is still
 * active in PostgreSQL, and attaches req.auth for the route handlers.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'Missing token. Send Authorization: Bearer <token>' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired. Please log in again' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }

  const { rows } = await query(
    `SELECT s.id, s.user_id, s.is_guest, u.role, u.name, u.email
       FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
    [payload.sid]
  );
  if (!rows.length) return res.status(401).json({ error: 'Session expired or logged out' });

  const s = rows[0];
  req.auth = {
    sessionId: s.id,
    userId: s.user_id,
    isGuest: s.is_guest,
    role: s.is_guest ? 'guest' : s.role, // role always comes from the database, not the token
    name: s.name,
    email: s.email,
  };
  next();
}

// Registered (non-guest) accounts only
export function requireUser(req, res, next) {
  if (req.auth.isGuest) return res.status(403).json({ error: 'Please log in to use this feature' });
  next();
}

export function requireAdmin(req, res, next) {
  if (req.auth.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
