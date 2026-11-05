import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  // me = response of GET /auth/me: { isGuest, user, downloads: { used, limit } }
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    try {
      setMe(await api('/auth/me'));
    } catch {
      setToken(null); // expired or revoked session
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) refresh();
    else setLoading(false);
  }, [refresh]);

  async function startSession(path, body) {
    const data = await api(path, { method: 'POST', body });
    setToken(data.token);
    await refresh();
  }

  const value = {
    me,
    loading,
    refresh,
    login: (email, password) => startSession('/auth/login', { email, password }),
    register: (name, email, password) => startSession('/auth/register', { name, email, password }),
    continueAsGuest: () => startSession('/auth/guest'),
    async logout() {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* already invalid */ }
      setToken(null);
      setMe(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
