import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
import type { User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  loginDemo: () => Promise<User>;
  logout: () => void;
  updateProfile: (patch: { name?: string; currency?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user: fetched }) => {
        if (active) setUser(fetched);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('spendwise:unauthorized', handler);
    return () => window.removeEventListener('spendwise:unauthorized', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const loginDemo = useCallback(async () => login('demo@spendwise.app', 'demo1234'), [login]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: { name?: string; currency?: string }) => {
    const response = await api.updateProfile(patch);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, loginDemo, logout, updateProfile }),
    [user, loading, login, register, loginDemo, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
