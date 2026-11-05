import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Catalog from './pages/Catalog.jsx';

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
      <Route path="/" element={<Protected><Catalog /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
