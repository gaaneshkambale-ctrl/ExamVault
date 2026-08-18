import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getRefreshToken,
  setAccessToken as setAxiosAccessToken,
  setAuthFailureHandler,
  setRefreshToken,
} from '../api/axiosClient';
import { getMyProfile, loginUser, logoutUser, refreshAccessToken } from '../api/userApi';
import type { UserProfile } from '../types/user';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existingRefreshToken = getRefreshToken();
    if (!existingRefreshToken) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const tokens = await refreshAccessToken(existingRefreshToken);
        setAxiosAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        setUser(await getMyProfile());
      } catch {
        setAxiosAccessToken(null);
        setRefreshToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setAuthFailureHandler(() => setUser(null));
    return () => setAuthFailureHandler(null);
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    const response = await loginUser({ email, password });
    setAxiosAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken, rememberMe);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    const existingRefreshToken = getRefreshToken();
    if (existingRefreshToken) {
      try {
        await logoutUser(existingRefreshToken);
      } catch {
        // best-effort server-side revoke; clear local state regardless
      }
    }
    setAxiosAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const clearMustChangePassword = () => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  };

  const refreshUser = async () => {
    setUser(await getMyProfile());
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, logout, clearMustChangePassword, refreshUser }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
