import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const PAGES = {
  library: {
    title: 'My Library', phase: 'Phase 2', icon: '▤', needsAccount: true,
    text: 'Books you save will live here and stay in sync between the website and the Android app.',
  },
  favorites: {
    title: 'Favorites', phase: 'Phase 2', icon: '♡', needsAccount: true,
    text: 'Heart the books you love and find them again in one tap, on any device.',
  },
  assistant: {
    title: 'AI Assistant', phase: 'Phase 2', icon: '✦', needsAccount: false,
    text: 'Ask in plain language. The assistant searches the real catalog, compares books, recommends titles, and saves a book to My Library only after you confirm.',
  },
  admin: {
    title: 'Admin Dashboard', phase: 'Phase 3', icon: '▦', needsAccount: true,
    text: 'Analytics for downloads, users and popular books will appear here.',
  },
};

export default function ComingSoon({ kind }) {
  const { me } = useAuth();
  const page = PAGES[kind];

  if (kind === 'admin' && me.user?.role !== 'admin') return <Navigate to="/" replace />;

  const blocked = page.needsAccount && me.isGuest && kind !== 'admin';

  return (
    <main className="content narrow">
      <div className="soon">
        <div className="soon-icon" aria-hidden="true">{page.icon}</div>
        <h2>{page.title}</h2>
        <p className="muted">{page.text}</p>

        {blocked ? (
          <div className="notice">
            This feature is for registered users.{' '}
            <Link to="/register">Create an account</Link> to use it.
          </div>
        ) : (
          <span className="pill">Planned for {page.phase}</span>
        )}
      </div>

      {kind === 'assistant' && (
        <section className="chat-preview" aria-label="Planned assistant conversation">
          <p className="preview-label">Planned conversation (preview)</p>
          <div className="bubble user">Recommend a short classic mystery.</div>
          <div className="bubble bot">
            I found <strong>The Adventures of Sherlock Holmes</strong> by Arthur Conan Doyle in the catalog. Want me to save it to My Library?
          </div>
          <div className="bubble-actions"><span className="btn primary sm">Yes, save it</span><span className="btn ghost sm">Not now</span></div>
        </section>
      )}
    </main>
  );
}
