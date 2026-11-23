import { query } from './db.js';
import { BOOK_GROUPS } from './bookList.js';

// Fills the catalog with free, public-domain books. The list of wanted books is in bookList.js; each one is looked up
// in Project Gutenberg's own catalog file (the same site the reader uses) to find its book number.
// It is safe to run again: books already in the catalog are skipped, so nothing is duplicated.
const CSV_URL = process.env.CATALOG_CSV_URL || 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';
const USER_AGENT = 'ZeBook-student-project (IPT102 school project)';

// Shown on /api/health/db so you can see what the importer is doing (and why it stopped).
export const importStatus = { state: 'not started', target: null, added: 0, total: null, note: 'The importer has not run yet', lastError: null, updatedAt: null };
function setStatus(patch) { Object.assign(importStatus, patch, { updatedAt: new Date().toISOString() }); }

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
const dropArticle = (s) => String(s || '').replace(/^\s*(the|a|an)\s+/i, '');
const NOUN = {
  Classics: 'classic', Adventure: 'adventure story', 'Science Fiction': 'science fiction story', 'Horror & Gothic': 'gothic tale',
  Mystery: 'mystery', "Fantasy & Children's": 'story for young readers', Philosophy: 'work of philosophy',
  'Poetry & Drama': 'work of poetry or drama', 'History & Biography': 'work of history or biography',
  'Science & Essays': 'work of science or essays', 'Humor & Satire': 'humorous or satirical work',
};

// ---------- the wanted books (parsed from bookList.js) ----------
export function wantedBooks() {
  const all = [];
  for (const [authorSpec, defaultCategory, titles] of BOOK_GROUPS) {
    const [display, matchSpec] = authorSpec.split('|');
    const matchNames = (matchSpec || display.trim().split(/\s+/).pop()).split('/').map(norm).filter(Boolean);
    for (const spec of titles) {
      const [title, category] = spec.split('@');
      all.push({ title, author: display, category: category || defaultCategory, n: norm(dropArticle(title)), matchNames });
    }
  }
  return all;
}
// duplicates are recognised by title + the first author's surname
const surname = (display) => norm(String(display).split(' & ')[0].split(/\s+/).filter(Boolean).pop());
const identity = (title, author) => `${norm(dropArticle(title))}|${surname(author)}`;

// Takes turns between categories, so the catalog is mixed even if the target is reached early.
function interleave(list) {
  const byCat = new Map();
  for (const b of list) { if (!byCat.has(b.category)) byCat.set(b.category, []); byCat.get(b.category).push(b); }
  const out = [];
  for (let i = 0; out.length < list.length; i += 1) {
    for (const items of byCat.values()) if (i < items.length) out.push(items[i]);
  }
  return out;
}

// ---------- CSV streaming (handles quoted fields with commas, quotes and line breaks) ----------
function csvParser(onRow) {
  let field = '', row = [], inQuotes = false, pendingQuote = false;
  return {
    push(chunk) {
      for (let i = 0; i < chunk.length; i += 1) {
        const c = chunk[i];
        if (pendingQuote) { pendingQuote = false; if (c === '"') { field += '"'; continue; } inQuotes = false; }
        if (inQuotes) { if (c === '"') pendingQuote = true; else field += c; continue; }
        if (c === '"') { inQuotes = true; continue; }
        if (c === ',') { row.push(field); field = ''; continue; }
        if (c === '\n') { row.push(field); field = ''; onRow(row); row = []; continue; }
        if (c !== '\r') field += c;
      }
    },
    end() { pendingQuote = false; if (field || row.length) { row.push(field); onRow(row); } },
  };
}

async function scanCatalog(wanted) {
  const buckets = new Map(); // first 3 letters of the wanted title -> entries
  wanted.forEach((w, index) => { const k = w.n.slice(0, 3); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push({ ...w, index }); });
  const found = new Map(); // index -> { exact, prefix } (lowest book number of each kind)

  const onRow = (row) => {
    if (row.length < 6 || row[1] !== 'Text' || !/^\d+$/.test(row[0])) return;
    if (!String(row[4]).split(';').map((x) => x.trim()).includes('en')) return;
    const id = Number(row[0]);
    const full = norm(dropArticle(row[3].replace(/\s+/g, ' ')));
    const candidates = buckets.get(full.slice(0, 3));
    if (!candidates) return;
    const head = norm(dropArticle(row[3].split(/[;:\n]|\s+or,\s+/i)[0]));
    const authors = norm(row[5]);
    for (const w of candidates) {
      if (!w.matchNames.some((m) => authors.includes(m))) continue;
      const exact = w.n === head || w.n === full;
      const prefix = !exact && w.n.length >= 8 && full.startsWith(w.n);
      if (!exact && !prefix) continue;
      const rec = found.get(w.index) || { exact: null, prefix: null };
      const key = exact ? 'exact' : 'prefix';
      if (!rec[key] || id < rec[key].id) rec[key] = { id, subjects: row[6] || '' };
      found.set(w.index, rec);
    }
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180000);
  try {
    const res = await fetch(CSV_URL, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) { setStatus({ lastError: `Gutenberg catalog answered HTTP ${res.status}` }); return null; }
    const parser = csvParser(onRow);
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.push(decoder.decode());
    } else {
      parser.push(await res.text());
    }
    parser.end();
    return found;
  } catch (err) {
    setStatus({ lastError: `Could not read the Gutenberg catalog: ${err.name || 'error'}${err.cause && err.cause.code ? ` (${err.cause.code})` : ''}` });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function describe(w, subjectsText) {
  const topics = [...new Set(String(subjectsText).split(';').map((s) => s.split(' -- ')[0].trim()).filter(Boolean))].slice(0, 3);
  return `${w.title} by ${w.author}: a free public-domain ${NOUN[w.category] || 'book'} from Project Gutenberg.${topics.length ? ` Topics: ${topics.join('; ')}.` : ''}`.slice(0, 900);
}

export async function importBooks(target) {
  setStatus({ state: 'running', target, note: 'Reading the Project Gutenberg catalog…' });
  try {
    await runImport(target);
  } catch (err) {
    setStatus({ state: 'failed', note: 'The importer crashed', lastError: err.message });
    throw err;
  }
}

async function runImport(target) {
  const { rows: existing } = await query('SELECT title, author, file_url FROM books');
  const urls = new Set(existing.map((r) => r.file_url));
  const identities = new Set(existing.map((r) => identity(r.title, r.author)));
  const start = existing.length;
  if (start >= target) {
    console.log(`Book import: catalog already has ${start} books (target ${target})`);
    setStatus({ state: 'done', added: 0, total: start, note: `The catalog already has ${start} books (target ${target})` });
    return;
  }

  const wanted = wantedBooks().filter((w) => !identities.has(identity(w.title, w.author)));
  const found = await scanCatalog(wanted);
  if (!found) {
    console.warn('book import: stopped early (could not read the Gutenberg catalog); it will try again next start');
    setStatus({ state: 'stopped', added: 0, total: start, note: 'Stopped early: the Gutenberg catalog could not be read. It will try again the next time the server starts.' });
    return;
  }

  let total = start;
  const ordered = interleave(wanted.map((w, index) => ({ ...w, index })).filter((w) => found.has(w.index)));
  for (const w of ordered) {
    if (total >= target) break;
    const pick = found.get(w.index);
    const match = pick.exact || pick.prefix;
    const fileUrl = `https://www.gutenberg.org/ebooks/${match.id}`;
    const key = identity(w.title, w.author);
    if (urls.has(fileUrl) || identities.has(key)) continue; // already in the catalog
    try {
      const r = await query(
        "INSERT IGNORE INTO books (title, author, genre, description, language, `year`, cover_url, file_url) VALUES (?, ?, ?, ?, 'English', NULL, ?, ?)",
        [w.title.slice(0, 300), w.author.slice(0, 200), w.category, describe(w, match.subjects), `https://www.gutenberg.org/cache/epub/${match.id}/pg${match.id}.cover.medium.jpg`, fileUrl]
      );
      if (r.rowCount > 0) { total += 1; urls.add(fileUrl); identities.add(key); setStatus({ added: total - start, total }); }
    } catch (err) {
      console.warn(`book import: could not add "${w.title}": ${err.code || err.message}`);
    }
  }
  console.log(`Book import: added ${total - start} books (${found.size} of ${wanted.length} wanted titles found), the catalog now has ${total}`);
  setStatus({
    state: total >= target ? 'done' : 'stopped', added: total - start, total,
    note: total >= target ? `Reached the target of ${target} books` : `Only ${total} books could be matched (target ${target}); ${found.size} of ${wanted.length} wanted titles were found in the catalog`,
  });
}
