import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('titanium_theme', theme);
  } catch {
    /* storage may be blocked */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until we know whether a session cookie exists
  const [settings, setSettings] = useState({ appName: 'Titanium', allowRegistration: true, systemAlert: '' });

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/public');
      setSettings(data.settings);
    } catch {
      /* keep defaults */
    }
  }, []);

  // Session persistence: on first load ask the server who we are (the cookie is sent automatically).
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        applyTheme(data.user.theme);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    loadSettings();
  }, [loadSettings]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    applyTheme(data.user.theme);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const setTheme = async (theme) => {
    applyTheme(theme);
    if (user) {
      setUser((u) => ({ ...u, theme }));
      try {
        await api.patch('/profile', { theme });
      } catch {
        /* theme still applied locally */
      }
    }
  };

  const can = useCallback((permission) => !!user && (user.role === 'admin' || user.effectivePermissions?.includes(permission)), [user]);

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, logout, setTheme, can, settings, setSettings, loadSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, settings, can]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
