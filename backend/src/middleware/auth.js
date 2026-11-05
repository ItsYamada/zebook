import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';

export const signToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const { sid, uid, role, guest } = decoded;

    const { rows } = await query(
      'SELECT id, user_id, is_guest, expires_at, revoked_at FROM sessions WHERE id = ?',
      [sid]
    );

    const session = rows[0];
    if (!session || session.revoked_at || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    let userDetails = null;
    if (uid && !guest) {
      const userRes = await query('SELECT id, name, email, role FROM users WHERE id = ?', [uid]);
      userDetails = userRes.rows[0] || null;
    }

    req.auth = {
      sessionId: sid,
      userId: uid || null,
      role: role || (guest ? 'guest' : 'user'),
      isGuest: Boolean(guest || session.is_guest),
      name: userDetails?.name,
      email: userDetails?.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};