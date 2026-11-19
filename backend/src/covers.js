import { query } from './db.js';

// Cover images come from Open Library (free; they ask for a User-Agent and modest traffic).
// The result of each lookup is saved in the database, so every book is looked up only once.
const SEARCH_BASE = process.env.COVER_SEARCH_BASE || 'https://openlibrary.org';
const IMAGE_BASE = process.env.COVER_IMAGE_BASE || 'https://covers.openlibrary.org';
const USER_AGENT = 'ZeBook-student-project (IPT102 school project)';
const MAX_PARALLEL = 3;          // Open Library allows about 3 requests per second with a User-Agent
const NEGATIVE_DAYS = 7;         // how long "no cover found" is remembered

const inflight = new Map();      // bookId -> Promise, so a burst of requests looks the book up once
let active = 0;
const waiting = [];
async function limited(fn) {
  if (active >= MAX_PARALLEL) await new Promise((resolve) => waiting.push(resolve));
  active += 1;
  try { return await fn(); } finally { active -= 1; waiting.shift()?.(); }
}

// Returns { ok: true, id } (id may be null = no cover) or { ok: false } if Open Library could not be reached.
async function searchCoverId(params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const qs = new URLSearchParams({ ...params, limit: '8', fields: 'cover_i' });
    const res = await fetch(`${SEARCH_BASE}/search.json?${qs}`, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    const hit = (data.docs || []).find((d) => Number.isInteger(d.cover_i) && d.cover_i > 0);
    return { ok: true, id: hit ? hit.cover_i : null };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

async function lookup(book) {
  const withAuthor = await searchCoverId({ title: book.title, author: book.author });
  if (withAuthor.ok && withAuthor.id) return { ok: true, id: withAuthor.id };
  const titleOnly = await searchCoverId({ title: book.title });
  if (titleOnly.ok && titleOnly.id) return { ok: true, id: titleOnly.id };
  return { ok: withAuthor.ok && titleOnly.ok, id: null }; // ok only if both searches answered
}

/** Returns the image URL for a book, or null when there is no cover (or it cannot be checked right now). */
export async function resolveCover(book) {
  try {
    const { rows } = await query(
      'SELECT url, (checked_at > DATE_SUB(NOW(), INTERVAL ? DAY)) AS fresh FROM book_covers WHERE book_id = ?',
      [NEGATIVE_DAYS, book.id]
    );
    if (rows[0]?.url) return rows[0].url;
    if (rows[0] && Number(rows[0].fresh) === 1) return null; // recently checked: no cover exists
  } catch { /* cache table missing: look up without it */ }

  if (inflight.has(book.id)) return inflight.get(book.id);
  const job = limited(async () => {
    const found = await lookup(book);
    if (!found.ok) return null; // Open Library unreachable: do not remember, try again next time
    const url = found.id ? `${IMAGE_BASE}/b/id/${found.id}-L.jpg` : null;
    try {
      await query('INSERT INTO book_covers (book_id, url) VALUES (?, ?) ON DUPLICATE KEY UPDATE url = VALUES(url), checked_at = NOW()', [book.id, url]);
    } catch (err) {
      console.warn('cover: could not cache:', err.code || err.message);
    }
    return url;
  }).finally(() => inflight.delete(book.id));
  inflight.set(book.id, job);
  return job;
}
