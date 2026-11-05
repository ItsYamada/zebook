import { Router } from 'express';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Guests are tracked per session, registered users per account.
const ownerOf = (auth) =>
  auth.isGuest
    ? { column: 'session_id', value: auth.sessionId, limit: config.limits.guest }
    : { column: 'user_id', value: auth.userId, limit: config.limits.user };

// Escape LIKE wildcards so "100%" searches literally
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/books?search=&genre=&page=1&limit=24
router.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 100);
  const genre = String(req.query.genre || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
  const owner = ownerOf(req.auth);

  const { rows } = await query(
    `SELECT b.id, b.title, b.author, b.genre, b.year, b.cover_url,
            EXISTS (SELECT 1 FROM downloads d
                     WHERE d.book_id = b.id AND d.${owner.column} = $5) AS downloaded,
            count(*) OVER()::int AS total
       FROM books b
      WHERE ($1 = '' OR b.title  ILIKE '%' || $6 || '%'
                     OR b.author ILIKE '%' || $6 || '%'
                     OR to_tsvector('english', b.title || ' ' || b.author || ' ' || coalesce(b.description, ''))
                        @@ plainto_tsquery('english', $1))
        AND ($2 = '' OR b.genre = $2)
      ORDER BY b.title
      LIMIT $3 OFFSET $4`,
    [search, genre, limit, (page - 1) * limit, owner.value, escapeLike(search)]
  );

  const total = rows[0]?.total ?? 0;
  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    books: rows.map(({ total: _t, ...book }) => book),
  });
});

// GET /api/books/genres  -> for the filter dropdown
router.get('/genres', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT genre, count(*)::int AS count FROM books GROUP BY genre ORDER BY genre');
  res.json({ genres: rows });
});

// POST /api/books/:id/download  -> enforces 5 (guest) / 10 (user) downloads on the server
router.post('/:id/download', requireAuth, async (req, res) => {
  const bookId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(bookId) || bookId < 1) return res.status(400).json({ error: 'Invalid book id' });

  const owner = ownerOf(req.auth);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Lock per owner so two simultaneous requests cannot slip past the limit
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${owner.column}:${owner.value}`]);

    const book = await client.query('SELECT id, title, file_url FROM books WHERE id = $1', [bookId]);
    if (!book.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Book not found' });
    }

    const already = await client.query(
      `SELECT 1 FROM downloads WHERE ${owner.column} = $1 AND book_id = $2 LIMIT 1`,
      [owner.value, bookId]
    );
    const usedRes = await client.query(
      `SELECT count(DISTINCT book_id)::int AS n FROM downloads WHERE ${owner.column} = $1`,
      [owner.value]
    );
    let used = usedRes.rows[0].n;

    // Re-downloading a book you already have does not use up your quota
    if (!already.rowCount) {
      if (used >= owner.limit) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: req.auth.isGuest
            ? `Guest limit reached (${owner.limit} downloads). Create an account to download up to ${config.limits.user} books.`
            : `Download limit reached (${owner.limit} books).`,
          code: 'DOWNLOAD_LIMIT',
          used,
          limit: owner.limit,
        });
      }
      await client.query(
        'INSERT INTO downloads (user_id, session_id, book_id) VALUES ($1, $2, $3)',
        [req.auth.userId, req.auth.sessionId, bookId]
      );
      used += 1;
    }

    await client.query('COMMIT');
    res.json({
      message: `“${book.rows[0].title}” is ready`,
      fileUrl: book.rows[0].file_url,
      downloads: { used, limit: owner.limit, remaining: owner.limit - used },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
});

export default router;
