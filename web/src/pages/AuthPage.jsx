import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

// Decorative shelf: each spine is [width, height, color]
const SPINES = [
  [34, 62, '#e0a526'], [22, 78, '#f2efe6'], [40, 54, '#2a9d8f'], [28, 86, '#c8553d'],
  [36, 70, '#f2efe6'], [24, 58, '#e0a526'], [44, 80, '#3d5a80'], [26, 66, '#f2efe6'],
  [38, 90, '#2a9d8f'], [30, 60, '#c8553d'], [22, 74, '#e0a526'], [42, 68, '#f2efe6'],
];

function Shelf() {
  return (
    <div className="shelf" aria-hidden="true">
      {SPINES.map(([w, h, c], i) => (
        <span key={i} className="spine" style={{ width: w, height: `${h}%`, background: c }} />
      ))}
    </div>
  );
}

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { login, register, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function run(action) {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await action();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.details || {});
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    run(() => (isRegister
      ? register(form.name, form.email, form.password)
      : login(form.email, form.password)));
  }

  const fieldError = (k) => fieldErrors[k]?.[0];

  return (
    <main className="auth">
      <section className="auth-art">
        <h1 className="brand">Ze<span>Book</span></h1>
        <p className="tagline">Your digital library on the web and on your phone, with an AI assistant that helps you find what to read next.</p>
        <Shelf />
      </section>

      <section className="auth-panel">
        <form onSubmit={onSubmit} noValidate className="auth-form">
          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            {isRegister ? 'Registered readers can download up to 10 books.' : 'Log in to open your library.'}
          </p>

          {error && <div className="alert" role="alert">{error}</div>}

          {isRegister && (
            <label>
              Full name
              <input value={form.name} onChange={set('name')} autoComplete="name" required />
              {fieldError('name') && <span className="field-error">{fieldError('name')}</span>}
            </label>
          )}

          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            {fieldError('email') && <span className="field-error">{fieldError('email')}</span>}
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
            {isRegister && !fieldError('password') && <span className="hint">At least 8 characters.</span>}
            {fieldError('password') && <span className="field-error">{fieldError('password')}</span>}
          </label>

          <button className="btn primary" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>

          <div className="divider"><span>or</span></div>

          <button type="button" className="btn ghost" disabled={busy} onClick={() => run(continueAsGuest)}>
            Continue as guest (5 downloads)
          </button>

          <p className="switch">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
