import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, hasToken, loadToken, setToken } from './api';

const FLAG = 'zebook_returning'; // set once someone has used the app on this phone

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  // me = GET /auth/me: { isGuest, user, downloads: { used, limit } }
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // which tab the auth screen opens on
  const [returning, setReturning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setMe(await api('/auth/me'));
    } catch (e) {
      if (e.status === 401) { await setToken(null); setMe(null); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try { setReturning((await SecureStore.getItemAsync(FLAG)) === '1'); } catch { /* ignore */ }
      await loadToken();
      if (hasToken()) await refresh();
      else setLoading(false);
    })();
  }, [refresh]);

  async function startSession(path, body) {
    const data = await api(path, { method: 'POST', body });
    await setToken(data.token);
    setReturning(true);
    try { await SecureStore.setItemAsync(FLAG, '1'); } catch { /* ignore */ }
    await refresh();
  }

  const value = {
    me, loading, refresh, authMode, setAuthMode, returning,
    login: (email, password) => startSession('/auth/login', { email, password }),
    register: (name, email, password) => startSession('/auth/register', { name, email, password }),
    continueAsGuest: () => startSession('/auth/guest'),
    async logout() {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* already invalid */ }
      await setToken(null);
      setMe(null);
    },
    async goRegister() { // guest -> create account
      setAuthMode('register');
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      await setToken(null);
      setMe(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
