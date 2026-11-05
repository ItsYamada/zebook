import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Meter } from '../components/Layout.jsx';

export default function Account() {
  const { me, logout } = useAuth();
  const { used, limit } = me.downloads;

  return (
    <main className="content narrow">
      <h2 className="page-title">Account</h2>

      <section className="card">
        <dl className="details">
          <div><dt>Name</dt><dd>{me.isGuest ? 'Guest visitor' : me.user.name}</dd></div>
          <div><dt>Email</dt><dd>{me.isGuest ? 'Not signed in' : me.user.email}</dd></div>
          <div><dt>Access level</dt><dd><span className="pill">{me.isGuest ? 'Guest' : me.user.role === 'admin' ? 'Administrator' : 'Registered user'}</span></dd></div>
        </dl>
      </section>

      <section className="card">
        <h3>Download allowance</h3>
        <p className="muted">
          {me.isGuest ? 'Guests can download up to 5 books per session.' : 'Registered users can download up to 10 books.'}
          {' '}The limit is enforced by the server, so it is the same on web and Android.
        </p>
        <Meter used={used} limit={limit} />
        <p className="muted small">{limit - used} download{limit - used === 1 ? '' : 's'} remaining</p>
      </section>

      <div className="row">
        {me.isGuest && <Link to="/register" onClick={logout} className="btn primary">Create an account</Link>}
        <button className="btn ghost" onClick={logout}>Log out</button>
      </div>
    </main>
  );
}
