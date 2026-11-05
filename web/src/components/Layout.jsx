import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export function Logo() {
  return <span className="logo">Ze<b>Book</b></span>;
}

export function Meter({ used, limit }) {
  return (
    <div className="meter" title={`${used} of ${limit} downloads used`}>
      <div className="meter-label"><span>Downloads</span><strong>{used} / {limit}</strong></div>
      <div className="meter-bar">
        <div className={used >= limit ? 'full' : ''} style={{ width: `${Math.min((used / limit) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

const NAV = [
  ['/', 'Discover', '⌕'],
  ['/library', 'My Library', '▤'],
  ['/favorites', 'Favorites', '♡'],
  ['/assistant', 'AI Assistant', '✦'],
];

export default function Layout() {
  const { me, logout } = useAuth();
  const isAdmin = me.user?.role === 'admin';
  const items = isAdmin ? [...NAV, ['/admin', 'Admin', '▦']] : NAV;

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="logo-link" aria-label="ZeBook home"><Logo /></Link>

        <nav className="nav" aria-label="Main">
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="topbar-right">
          <Meter used={me.downloads.used} limit={me.downloads.limit} />
          <Link to="/account" className="who">{me.isGuest ? 'Guest' : me.user.name}</Link>
          <button className="btn ghost sm" onClick={logout}>Log out</button>
        </div>
      </header>

      {me.isGuest && (
        <div className="banner">
          Browsing as a guest: {me.downloads.limit} downloads per session.{' '}
          <Link to="/register" onClick={logout}>Create an account</Link> for 10 downloads, My Library and favorites.
        </div>
      )}

      <Outlet />

      <footer className="footer">ZeBook · IPT102 Final Practical Examination · Only legally free books are offered for download</footer>
    </div>
  );
}
