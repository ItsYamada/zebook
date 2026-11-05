import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const COLORS = ['#3d5a80', '#1f6f78', '#a8452f', '#5b4a8a', '#7a5f12', '#2f4858'];
const coverColor = (id) => COLORS[id % COLORS.length];

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Cover({ book }) {
  const [failed, setFailed] = useState(false);
  const showImage = book.cover_url && !failed;
  return (
    <div className="cover" style={{ background: coverColor(book.id) }}>
      {showImage ? (
        <img src={book.cover_url} alt={`Cover of ${book.title}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="cover-title">{book.title}</span>
      )}
      <span className="tag">{book.genre}</span>
    </div>
  );
}

export default function Discover() {
  const { me, refresh } = useAuth();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const query = useDebounced(search.trim());
  const { used, limit } = me.downloads;
  const limitReached = used >= limit;

  useEffect(() => {
    api('/books/genres').then((d) => setGenres(d.genres)).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [query, genre]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    const qs = new URLSearchParams({ search: query, genre, page, limit: 24 });
    api(`/books?${qs}`)
      .then((d) => {
        if (cancelled) return;
        setBooks(d.books);
        setPageInfo({ total: d.total, totalPages: d.totalPages });
        setStatus('ready');
      })
      .catch((e) => { if (!cancelled) { setError(e.message); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [query, genre, page]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const download = useCallback(async (book) => {
    setBusyId(book.id);
    try {
      const d = await api(`/books/${book.id}/download`, { method: 'POST' });
      setBooks((list) => list.map((b) => (b.id === book.id ? { ...b, downloaded: true } : b)));
      setToast({ type: 'ok', msg: d.message, url: d.fileUrl });
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
    } finally {
      await refresh();
      setBusyId(null);
    }
  }, [refresh]);

  return (
    <>
      <section className="hero">
        <h1>Find your next read</h1>
        <p>Search the ZeBook library by title, author or topic.</p>
        <div className="searchbox">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search books, authors, topics…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search books"
          />
        </div>
        <div className="chips" role="group" aria-label="Filter by category">
          <button className={`chip-btn ${genre === '' ? 'on' : ''}`} onClick={() => setGenre('')}>All</button>
          {genres.map((g) => (
            <button key={g.genre} className={`chip-btn ${genre === g.genre ? 'on' : ''}`} onClick={() => setGenre(g.genre)}>
              {g.genre} <small>{g.count}</small>
            </button>
          ))}
        </div>
      </section>

      <main className="content">
        <div className="results-head">
          <h2>{genre || 'All books'}</h2>
          <span className="muted">{status === 'ready' ? `${pageInfo.total} ${pageInfo.total === 1 ? 'book' : 'books'}` : ' '}</span>
        </div>

        {status === 'error' && <div className="alert" role="alert">{error}</div>}

        {status === 'ready' && books.length === 0 && (
          <div className="empty">
            <h3>{query || genre ? 'No books match your search' : 'The library is empty'}</h3>
            <p className="muted">{query || genre ? 'Try a different title, author or category.' : 'Add books to the database and they will appear here.'}</p>
          </div>
        )}

        <ul className={`books ${status === 'loading' ? 'dim' : ''}`}>
          {books.map((b) => (
            <li key={b.id} className="book">
              <Cover book={b} />
              <div className="meta">
                <strong title={b.title}>{b.title}</strong>
                <span>{b.author}{b.year ? ` · ${b.year}` : ''}</span>
              </div>
              {b.downloaded ? (
                <button className="btn done sm" onClick={() => download(b)} disabled={busyId === b.id}>✓ Downloaded</button>
              ) : (
                <button className="btn primary sm" onClick={() => download(b)} disabled={busyId === b.id || limitReached}>
                  {busyId === b.id ? 'Preparing…' : limitReached ? 'Limit reached' : 'Download'}
                </button>
              )}
            </li>
          ))}
        </ul>

        {pageInfo.totalPages > 1 && (
          <nav className="pager" aria-label="Pagination">
            <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
            <span>Page {page} of {pageInfo.totalPages}</span>
            <button className="btn ghost sm" disabled={page >= pageInfo.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
          </nav>
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          <span>{toast.msg}</span>
          {toast.url && <a href={toast.url} target="_blank" rel="noopener noreferrer">Open file</a>}
          <button aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </>
  );
}
