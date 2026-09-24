import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Settings } from '../types';

interface AuthContextType {
  user: User | null;
  settings: Settings | null;
  login: (user: User) => void;
  logout: () => void;
  updateSettings: (settings: Settings) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  settings: null,
  login: () => {},
  logout: () => {},
  updateSettings: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Load settings first (public, needed for the login screen branding).
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch (e) {
        console.error('Could not load settings', e);
      }

      // The actual session is the httpOnly cookie set by the server on
      // login, not anything in localStorage. We keep a cached copy of the
      // user in localStorage purely so the UI can render instantly without
      // a flash of the login screen, but we always re-validate it against
      // the server — a stale/forged localStorage value can no longer grant
      // access on its own.
      const cached = localStorage.getItem('cmms_user');
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch { /* ignore corrupt cache */ }
      }

      try {
        const meRes = await fetch('/api/me');
        if (meRes.ok) {
          const freshUser = await meRes.json();
          setUser(freshUser);
          localStorage.setItem('cmms_user', JSON.stringify(freshUser));
        } else {
          setUser(null);
          localStorage.removeItem('cmms_user');
        }
      } catch (e) {
        // Network error: keep whatever we had cached rather than forcing a
        // logout, so a brief connectivity blip doesn't kick people out.
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('cmms_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cmms_user');
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
  };

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, settings, login, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
