import { Router } from 'express';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Guests are tracked per session, registered users per account.
const ownerOf = (auth) =>
  auth.isGuest
    ? { column: 'session_id', value: auth.sessionId, limit: config.limits.guest, lockSql: 'SELECT id FROM sessions WHERE id = ? FOR UPDATE' }
    : { column: 'user_id', value: auth.userId, limit: config.limits.user, lockSql: 'SELECT id FROM users WHERE id = ? FOR UPDATE' };

// Escape LIKE wildcards so "100%" searches literally
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/books?search=&genre=&page=1&limit=24
router.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 100);
  const genre = String(req.query.genre || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
  const owner = ownerOf(req.auth);

  const like = `%${escapeLike(search)}%`;
  const where = `(? = '' OR b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)
                 AND (? = '' OR b.genre = ?)`;
  const whereParams = [search, like, like, like, genre, genre];

  const count = await query(`SELECT COUNT(*) AS total FROM books b WHERE ${where}`, whereParams);
  const total = Number(count.rows[0].total);

  const { rows } = await query(
    `SELECT b.id, b.title, b.author, b.genre, b.\`year\` AS \`year\`, b.cover_url,
            EXISTS (SELECT 1 FROM downloads d WHERE d.book_id = b.id AND d.${owner.column} = ?) AS downloaded
       FROM books b
      WHERE ${where}
      ORDER BY b.title
      LIMIT ? OFFSET ?`,
    [owner.value, ...whereParams, limit, (page - 1) * limit]
  );

  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    books: rows.map((r) => ({ ...r, downloaded: Boolean(r.downloaded) })),
  });
});

// GET /api/books/genres  -> for the category chips
router.get('/genres', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT genre, COUNT(*) AS `count` FROM books GROUP BY genre ORDER BY genre');
  res.json({ genres: rows.map((r) => ({ genre: r.genre, count: Number(r.count) })) });
});

// POST /api/books/:id/download  -> enforces 5 (guest) / 10 (user) downloads on the server
router.post('/:id/download', requireAuth, async (req, res) => {
  const bookId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(bookId) || bookId < 1) return res.status(400).json({ error: 'Invalid book id' });

  const owner = ownerOf(req.auth);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the owner's row so two simultaneous requests cannot slip past the limit
    await conn.query(owner.lockSql, [owner.value]);

    const [books] = await conn.query('SELECT id, title, file_url FROM books WHERE id = ?', [bookId]);
    if (!books.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Book not found' });
    }

    const [already] = await conn.query(
      `SELECT 1 FROM downloads WHERE ${owner.column} = ? AND book_id = ? LIMIT 1`,
      [owner.value, bookId]
    );
    const [usedRows] = await conn.query(
      `SELECT COUNT(DISTINCT book_id) AS n FROM downloads WHERE ${owner.column} = ?`,
      [owner.value]
    );
    let used = Number(usedRows[0].n);

    // Re-downloading a book you already have does not use up your quota
    if (!already.length) {
      if (used >= owner.limit) {
        await conn.rollback();
        return res.status(403).json({
          error: req.auth.isGuest
            ? `Guest limit reached (${owner.limit} downloads). Create an account to download up to ${config.limits.user} books.`
            : `Download limit reached (${owner.limit} books).`,
          code: 'DOWNLOAD_LIMIT',
          used,
          limit: owner.limit,
        });
      }
      await conn.query(
        'INSERT INTO downloads (user_id, session_id, book_id) VALUES (?, ?, ?)',
        [req.auth.userId, req.auth.sessionId, bookId]
      );
      used += 1;
    }

    await conn.commit();
    res.json({
      message: `“${books[0].title}” is ready`,
      fileUrl: books[0].file_url,
      downloads: { used, limit: owner.limit, remaining: owner.limit - used },
    });
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
