import { query } from './db.js';

// Where book text comes from. Default is Project Gutenberg; override for tests with TEXT_SOURCE_BASE.
const BASE = process.env.TEXT_SOURCE_BASE || 'https://www.gutenberg.org';
const MIRROR = process.env.TEXT_MIRROR_BASE || 'https://gutenberg.pglaf.org';
const PAGE_CHARS = 2800; // roughly one phone screen of reading
const CACHE_LIMIT = 6;   // books kept in memory
const memory = new Map(); // bookId -> pages[]

export const gutenbergId = (fileUrl) => /gutenberg\.org\/ebooks\/(\d+)/.exec(fileUrl || '')?.[1] ?? null;

function candidateUrls(id) {
  const dirs = id.length > 1 ? id.slice(0, -1).split('').join('/') : '0'; // mirror layout: 1342 -> 1/3/4/1342
  return [
    `${BASE}/cache/epub/${id}/pg${id}.txt`,
    `${BASE}/ebooks/${id}.txt.utf-8`,
    `${BASE}/files/${id}/${id}-0.txt`,
    `${MIRROR}/${dirs}/${id}/${id}-0.txt`,
    `${MIRROR}/${dirs}/${id}/${id}.txt`,
  ];
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'ZeBook-student-project (IPT102)' } });
    if (!res.ok) { console.warn(`book text: ${res.status} for ${url}`); return null; }
    const text = await res.text();
    if (text.length < 2000 || /^\s*<(!doctype|html)/i.test(text)) { console.warn(`book text: not a book at ${url}`); return null; }
    return text;
  } catch (err) {
    console.warn(`book text: ${err.name || 'error'} for ${url}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Removes the Project Gutenberg licence header/footer and tidies the text.
export function cleanGutenberg(raw) {
  let t = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const start = t.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*/i);
  if (start !== -1) t = t.slice(t.indexOf('\n', start) + 1);
  const end = t.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i);
  if (end !== -1) t = t.slice(0, end);
  return t.replace(/\[Illustration[^\]]*\]/gi, '').replace(/_([^_\n]+)_/g, '$1').trim();
}

// Joins hard-wrapped lines into flowing paragraphs, but keeps short lines (poetry) as they are.
function normalizeParagraph(p) {
  const lines = p.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  if (!lines.length) return '';
  const avg = lines.reduce((n, l) => n + l.length, 0) / lines.length;
  return lines.length > 1 && avg < 45 ? lines.join('\n') : lines.map((l) => l.trim()).join(' ');
}

export function paginate(text, size = PAGE_CHARS) {
  const paras = text.split(/\n{2,}/).map(normalizeParagraph).filter(Boolean);
  const pages = [];
  let cur = '';
  const flush = () => { if (cur.trim()) pages.push(cur.trim()); cur = ''; };
  for (let p of paras) {
    while (p.length > size * 1.5) {
      let cut = p.lastIndexOf(' ', size);
      if (cut < size * 0.5) cut = size;
      flush();
      pages.push(p.slice(0, cut).trim());
      p = p.slice(cut).trim();
    }
    if (cur && cur.length + p.length + 2 > size) flush();
    cur += (cur ? '\n\n' : '') + p;
  }
  flush();
  return pages;
}

function remember(bookId, pages) {
  memory.delete(bookId);
  memory.set(bookId, pages);
  while (memory.size > CACHE_LIMIT) memory.delete(memory.keys().next().value);
}

/**
 * Returns the book as an array of pages, or null if the text cannot be loaded right now.
 * Order: memory -> database cache (book_texts) -> the online source. A successful download is
 * saved in the database, so a book that was read once keeps working even if the source is down.
 */
export async function loadPages(book) {
  const hit = memory.get(book.id);
  if (hit) { remember(book.id, hit); return hit; }

  let text = null;
  try {
    const { rows } = await query('SELECT content FROM book_texts WHERE book_id = ?', [book.id]);
    text = rows[0]?.content ?? null;
  } catch { /* cache table missing: continue without it */ }

  if (!text) {
    const id = gutenbergId(book.file_url);
    if (!id) return null;
    for (const url of candidateUrls(id)) {
      const raw = await fetchText(url);
      if (raw) { text = cleanGutenberg(raw); break; }
    }
    if (!text) return null;
    try {
      await query('INSERT INTO book_texts (book_id, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content), fetched_at = NOW()', [book.id, text]);
    } catch (err) {
      console.warn('book text: could not cache in database:', err.code || err.message);
    }
  }
  const pages = paginate(text);
  if (!pages.length) return null;
  remember(book.id, pages);
  return pages;
}
