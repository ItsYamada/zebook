import { Router } from 'express';
import { pool, query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const ownerOf = (auth) =>
  auth.isGuest
    ? { column: 'session_id', value: auth.sessionId, limit: config.limits.guest }
    : { column: 'user_id', value: auth.userId, limit: config.limits.user };

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/books?search=&genre=&page=1&limit=24
router.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 100);
  const genre = String(req.query.genre || '').trim();
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 50);
  const offset = (page - 1) * limit;
  const owner = ownerOf(req.auth);

  const searchPattern = `%${escapeLike(search)}%`;

  const booksSql = `
    SELECT b.id, b.title, b.author, b.genre, b.year, b.cover_url, b.description,
           EXISTS (SELECT 1 FROM downloads d WHERE d.book_id = b.id AND d.${owner.column} = ?) AS downloaded
      FROM books b
     WHERE (? = '' OR b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)
       AND (? = '' OR b.genre = ?)
     ORDER BY b.title
     LIMIT ? OFFSET ?
  `;

  const { rows: books } = await query(booksSql, [
    owner.value,
    search, searchPattern, searchPattern, searchPattern,
    genre, genre,
    limit, offset,
  ]);

  const countSql = `
    SELECT COUNT(*) AS total
      FROM books b
     WHERE (? = '' OR b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)
       AND (? = '' OR b.genre = ?)
  `;

  const { rows: countRows } = await query(countSql, [
    search, searchPattern, searchPattern, searchPattern,
    genre, genre,
  ]);

  const total = countRows[0]?.total || 0;

  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    books: books.map((b) => ({ ...b, downloaded: Boolean(b.downloaded) })),
  });
});

// GET /api/books/genres
router.get('/genres', requireAuth, async (_req, res) => {
  const { rows } = await query('SELECT genre, COUNT(*) AS count FROM books GROUP BY genre ORDER BY genre');
  res.json({ genres: rows });
});

// POST /api/books/:id/download -> Enforces server-side limit (5 guest / 10 registered user)
router.post('/:id/download', requireAuth, async (req, res) => {
  const bookId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(bookId) || bookId < 1) return res.status(400).json({ error: 'Invalid book id' });

  const owner = ownerOf(req.auth);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [bookRows] = await connection.query('SELECT id, title, file_url FROM books WHERE id = ?', [bookId]);
    if (bookRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Book not found' });
    }
    const book = bookRows[0];

    const [already] = await connection.query(
      `SELECT 1 FROM downloads WHERE ${owner.column} = ? AND book_id = ? LIMIT 1`,
      [owner.value, bookId]
    );

    const [usedRows] = await connection.query(
      `SELECT COUNT(DISTINCT book_id) AS n FROM downloads WHERE ${owner.column} = ?`,
      [owner.value]
    );
    let used = usedRows[0]?.n || 0;

    if (already.length === 0) {
      if (used >= owner.limit) {
        await connection.rollback();
        return res.status(403).json({
          error: req.auth.isGuest
            ? `Guest limit reached (${owner.limit} downloads). Create an account to download up to ${config.limits.user} books.`
            : `Download limit reached (${owner.limit} books).`,
          code: 'DOWNLOAD_LIMIT',
          used,
          limit: owner.limit,
        });
      }

      await connection.query(
        'INSERT INTO downloads (user_id, session_id, book_id) VALUES (?, ?, ?)',
        [req.auth.userId || null, req.auth.sessionId, bookId]
      );
      used += 1;
    }

    await connection.commit();
    res.json({
      message: `“${book.title}” is ready`,
      fileUrl: book.file_url,
      downloads: { used, limit: owner.limit, remaining: owner.limit - used },
    });
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
});

export default router;