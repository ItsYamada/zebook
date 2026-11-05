import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function Catalog() {
  const { me, logout, refresh } = useAuth();
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
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
      setToast({ type: 'ok', msg: d.message, url: d.fileUrl, remaining: d.downloads.remaining });
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
    } finally {
      await refresh();
      setBusyId(null);
    }
  }, [refresh]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand small">Stacks</span>
        <div className="topbar-right">
          <div className="meter" title={`${used} of ${limit} downloads used`}>
            <div className="meter-label"><span>Downloads</span><strong>{used} / {limit}</strong></div>
            <div className="meter-bar"><div className={limitReached ? 'full' : ''} style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} /></div>
          </div>
          <span className="who">{me.isGuest ? 'Guest' : me.user.name}</span>
          <button className="btn ghost sm" onClick={logout}>Log out</button>
        </div>
      </header>

      {me.isGuest && (
        <div className="banner">
          Browsing as a guest: {limit} downloads per session.{' '}
          <Link to="/register" onClick={logout}>Create an account</Link> for 10 downloads and your own library.
        </div>
      )}

      <main className="content">
        <section className="hero">
          <h2>Find your next read</h2>
          <p className="muted">{pageInfo.total ? `${pageInfo.total} books in the catalog` : 'Search the catalog'}</p>
        </section>

        <div className="filters">
          <input
            type="search"
            placeholder="Search by title, author or topic"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search books"
          />
          <select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Filter by genre">
            <option value="">All genres</option>
            {genres.map((g) => <option key={g.genre} value={g.genre}>{g.genre} ({g.count})</option>)}
          </select>
        </div>

        {status === 'error' && <div className="alert" role="alert">{error}</div>}

        {status === 'ready' && books.length === 0 && (
          <div className="empty">
            <h3>{query || genre ? 'No books match your search' : 'The catalog is empty'}</h3>
            <p className="muted">
              {query || genre ? 'Try a different title, author or genre.' : 'Seed the 200-book catalog in Phase 2 and it will appear here.'}
            </p>
          </div>
        )}

        <ul className={`books ${status === 'loading' ? 'dim' : ''}`}>
          {books.map((b) => (
            <li key={b.id} className="book">
              <div className="cover" style={{ background: coverColor(b.id) }}>
                <span className="tag">{b.genre}</span>
                <span className="cover-title">{b.title}</span>
              </div>
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
    </div>
  );
}
