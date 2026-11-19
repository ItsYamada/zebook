import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Cover from '../components/Cover.jsx';

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
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
      setToast({ type: 'ok', msg: d.message, readId: book.id });
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
                <Link to={`/read/${b.id}`} className="btn read sm">📖 Read</Link>
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
          {toast.readId && <Link to={`/read/${toast.readId}`}>Read now</Link>}
          <button aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </>
  );
}
