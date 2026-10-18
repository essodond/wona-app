import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Role, User } from '../types/api';
import { authApi } from '../services/api';
import { tokenStorage } from '../services/storage';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  requestOtp: (telephone: string, role: Role) => Promise<string | undefined>;
  verifyOtp: (telephone: string, role: Role, code: string) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await authApi.me();
      setUser(current);
      return current;
    } catch {
      await tokenStorage.clear();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    tokenStorage
      .get()
      .then(({ refresh }) => (refresh ? refreshUser() : null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const requestOtp = useCallback(async (telephone: string, role: Role) => {
    const response = await authApi.requestOtp(telephone, role);
    return response.code_developpement;
  }, []);

  const verifyOtp = useCallback(async (telephone: string, role: Role, code: string) => {
    const response = await authApi.verifyOtp(telephone, role, code);
    await tokenStorage.set(response.access, response.refresh);
    setUser(response.utilisateur);
    return response.utilisateur;
  }, []);

  const logout = useCallback(async () => {
    const { refresh } = await tokenStorage.get();
    try {
      if (refresh) await authApi.logout(refresh);
    } finally {
      await tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, requestOtp, verifyOtp, refreshUser, logout }),
    [user, loading, requestOtp, verifyOtp, refreshUser, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return value;
}

