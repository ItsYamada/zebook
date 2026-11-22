import { query } from './db.js';

// Fills the catalog with free, public-domain books from Project Gutenberg, using the Gutendex catalog API.
// Turn it on with BOOK_TARGET=260 (the catalog is topped up to that many books). It is safe to run again:
// books already in the catalog are skipped, so nothing is duplicated.
const API = (process.env.CATALOG_API_BASE || 'https://gutendex.com').replace(/\/$/, '');
const USER_AGENT = 'ZeBook-student-project (IPT102 school project)';
const MAX_PAGES = 45; // 45 pages x 32 books is far more than needed

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

// ---------- cleaning helpers (exported so they can be tested) ----------
export function flipName(name) {
  const clean = String(name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const parts = clean.split(',').map((p) => p.trim()).filter((p) => p && !/^(baron|jr\.?|sr\.?|lord|sir)$/i.test(p));
  return parts.length >= 2 ? `${parts.slice(1).join(' ')} ${parts[0]}`.replace(/\s+/g, ' ').trim() : clean;
}
export function tidyAuthor(authors = []) {
  const names = authors.map((a) => a && a.name).filter(Boolean).slice(0, 2).map(flipName);
  return names.length ? names.join(' & ').slice(0, 190) : 'Unknown author';
}
export function tidyTitle(title = '') {
  return String(title).replace(/\s+/g, ' ').trim().split(/;\s*|\s+or,\s+/i)[0].trim().slice(0, 280); // "Moby Dick; Or, The Whale" -> "Moby Dick"
}
// duplicates are recognised by title + the first author's surname (a second credited name must not hide a duplicate)
const surnameOf = (displayName) => norm(String(displayName).split(' & ')[0].split(/\s+/).filter(Boolean).pop());
const identity = (title, authorDisplay) => `${norm(title)}|${surnameOf(authorDisplay)}`;

const SKIP_TITLE = /complete works|collected works|^the works of|dictionary|encyclop|bible|koran|qur.?an|catalogue?|almanac|hymn|cookbook|cook book|gutenberg|\bvolume \d|\bvol\.? ?\d|\bpart \d/i;
const SKIP_SUBJECT = /erotic|sexual|pornograph/i;

export function genreFor(book) {
  const text = [...(book.bookshelves || []), ...(book.subjects || [])].join(' | ').toLowerCase();
  const fiction = /fiction|novel|stories|romance|tales/.test(text);
  const rules = [
    ['Science Fiction', /science fiction|sci-fi/, true],
    ['Horror & Gothic', /horror|gothic|ghost|vampire|supernatural|monster/, true],
    ['Mystery', /detective|mystery|crime|thriller|murder|spy|espionage/, true],
    ["Fantasy & Children's", /fantasy|fairy|children|juvenile|nursery|folk ?tale|legend|myth/, true],
    ['Adventure', /adventure|sea stories|western|pirate|voyage|explor|war stories|historical fiction/, true],
    ['Poetry & Drama', /poetry|poems|verse|drama|plays|tragedies|comedies|sonnet/, false],
    ['Humor & Satire', /humou?r|satire/, true],
    ['Philosophy', /philosoph|ethics|metaphysic|stoic|religion|theology|conduct of life|psycholog/, false],
    ['History & Biography', /histor(y|ies)|biograph|memoir|autobiograph|diaries|letters|\bwar\b/, false],
    ['Science & Essays', /essays|science|natural history|economic|politic|nature|evolution|sociolog|education|mathemat|astronom/, false],
  ];
  for (const [name, re, allowForFiction] of rules) {
    if (re.test(text) && (allowForFiction || !fiction)) return name;
  }
  return 'Classics';
}

export function describe(book, genre, title, author) {
  let s = String((book.summaries || [])[0] || '').replace(/\(this is an automatically generated summary\.?\)/gi, '').replace(/\s+/g, ' ').trim();
  if (s.length > 700) {
    s = s.slice(0, 700);
    const cut = Math.max(s.lastIndexOf('. '), s.lastIndexOf('! '), s.lastIndexOf('? '));
    s = cut > 200 ? s.slice(0, cut + 1) : `${s.trim()}…`;
  }
  if (s.length >= 40) return s;
  const subjects = [...new Set((book.subjects || []).map((x) => x.split(' -- ')[0]))].slice(0, 2);
  return `${title} by ${author}. A free public-domain ${genre.toLowerCase()} from Project Gutenberg${subjects.length ? ` (${subjects.join('; ')})` : ''}.`;
}

// Only real, readable, public-domain English books are accepted.
export function usable(book) {
  if (!book || !Number.isInteger(book.id)) return false;
  if (book.copyright !== false) return false;                         // definitely public domain only
  if (book.media_type && book.media_type !== 'Text') return false;     // no audio, images, etc.
  if (!(book.languages || []).includes('en')) return false;
  if (!Object.keys(book.formats || {}).some((k) => k.startsWith('text/plain'))) return false; // the reader needs plain text
  const title = tidyTitle(book.title);
  if (!title || SKIP_TITLE.test(book.title) || SKIP_TITLE.test(title)) return false;
  if ((book.subjects || []).concat(book.bookshelves || []).some((x) => SKIP_SUBJECT.test(x))) return false;
  return true;
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
      if (res.ok) return await res.json();
      console.warn(`book import: HTTP ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.warn(`book import: ${err.name || 'error'} (attempt ${attempt})`);
    } finally {
      clearTimeout(timer);
    }
    await sleep(1500 * attempt);
  }
  return null;
}

export async function importBooks(target) {
  const { rows: existing } = await query('SELECT title, author, file_url FROM books');
  const urls = new Set(existing.map((r) => r.file_url));
  const identities = new Set(existing.map((r) => identity(r.title, r.author)));
  const start = existing.length;
  if (start >= target) { console.log(`Book import: catalog already has ${start} books (target ${target})`); return; }

  let total = start;
  let next = `${API}/books/?languages=en&copyright=false&sort=popular`;
  for (let page = 1; next && total < target && page <= MAX_PAGES; page += 1) {
    const data = await fetchJson(next);
    if (!data || !Array.isArray(data.results)) { console.warn('book import: stopped early (catalog service unreachable); it will continue next start'); break; }

    for (const book of data.results) {
      if (total >= target) break;
      if (!usable(book)) continue;
      const fileUrl = `https://www.gutenberg.org/ebooks/${book.id}`;
      const title = tidyTitle(book.title);
      const author = tidyAuthor(book.authors);
      const key = identity(title, author);
      if (urls.has(fileUrl) || identities.has(key)) continue; // already in the catalog (or another edition of the same book)

      const genre = genreFor(book);
      const cover = book.formats['image/jpeg'] || `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`;
      try {
        const r = await query(
          "INSERT IGNORE INTO books (title, author, genre, description, language, `year`, cover_url, file_url) VALUES (?, ?, ?, ?, 'English', NULL, ?, ?)",
          [title, author, genre, describe(book, genre, title, author), cover, fileUrl]
        );
        if (r.rowCount > 0) { total += 1; urls.add(fileUrl); identities.add(key); }
      } catch (err) {
        console.warn(`book import: could not add "${title}": ${err.code || err.message}`);
      }
    }
    next = data.next ? (API.startsWith('https:') ? data.next.replace(/^http:/, 'https:') : data.next) : null;
    await sleep(300); // be polite to the free service
  }
  console.log(`Book import: added ${total - start} books, the catalog now has ${total}`);
}
