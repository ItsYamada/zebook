import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } },
};

export default function Reader() {
  const { id } = useParams();
  const [page, setPage] = useState(() => parseInt(store.get(`zebook_page_${id}`, '1'), 10) || 1);
  const [size, setSize] = useState(() => parseInt(store.get('zebook_font', '19'), 10) || 19);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api(`/books/${id}/read?page=${page}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setStatus('ready');
        store.set(`zebook_page_${id}`, d.page);
        if (d.page !== page) setPage(d.page);
        window.scrollTo(0, 0);
      })
      .catch((e) => { if (!cancelled) { setError(e); setStatus('error'); } });
    return () => { cancelled = true; };
  }, [id, page, retry]);

  useEffect(() => {
    const onKey = (e) => {
      if (!data) return;
      if (e.key === 'ArrowRight' && page < data.totalPages) setPage(page + 1);
      if (e.key === 'ArrowLeft' && page > 1) setPage(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, page]);

  const changeSize = (delta) => {
    const next = Math.min(28, Math.max(14, size + delta));
    setSize(next);
    store.set('zebook_font', next);
  };

  if (status === 'error' && !data) {
    return (
      <main className="content narrow">
        <div className="soon">
          <h2>{error?.status === 403 ? 'Download this book first' : 'Cannot open the book right now'}</h2>
          <p className="muted">{error?.message}</p>
          <div className="row">
            {error?.status !== 403 && <button className="btn primary" onClick={() => setRetry(retry + 1)}>Try again</button>}
            <Link to="/" className="btn ghost">Back to library</Link>
          </div>
        </div>
      </main>
    );
  }

  const progress = data ? (data.page / data.totalPages) * 100 : 0;

  return (
    <div className="reader">
      <div className="reader-bar">
        <Link to="/" className="btn ghost sm">← Library</Link>
        <div className="reader-title">
          <strong>{data?.book.title ?? 'Loading…'}</strong>
          <span>{data?.book.author}</span>
        </div>
        <div className="font-ctl" role="group" aria-label="Text size">
          <button onClick={() => changeSize(-2)} aria-label="Smaller text">A−</button>
          <button onClick={() => changeSize(2)} aria-label="Larger text">A+</button>
        </div>
      </div>
      <div className="reader-progress"><div style={{ width: `${progress}%` }} /></div>

      <article className={`reader-text ${status === 'loading' ? 'dim' : ''}`} style={{ fontSize: `${size}px` }}>
        {data ? data.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Opening the book…</p>}
      </article>

      {data && (
        <nav className="reader-nav" aria-label="Pages">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span>Page {data.page} of {data.totalPages}</span>
          <button className="btn primary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}
      {status === 'error' && data && <div className="alert" role="alert">{error?.message}</div>}
    </div>
  );
}
