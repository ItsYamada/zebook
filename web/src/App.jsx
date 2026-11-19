import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Layout from './components/Layout.jsx';
import Discover from './pages/Discover.jsx';
import Account from './pages/Account.jsx';
import Reader from './pages/Reader.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

function Protected({ children }) {
  const { me, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  return me ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { me, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  return me ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Discover />} />
        <Route path="library" element={<ComingSoon kind="library" />} />
        <Route path="favorites" element={<ComingSoon kind="favorites" />} />
        <Route path="assistant" element={<ComingSoon kind="assistant" />} />
        <Route path="admin" element={<ComingSoon kind="admin" />} />
        <Route path="account" element={<Account />} />
        <Route path="read/:id" element={<Reader />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
