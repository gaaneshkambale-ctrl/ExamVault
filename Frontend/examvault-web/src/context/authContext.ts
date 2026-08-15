import { createContext } from 'react';
import type { UserProfile } from '../types/user';

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserProfile>;
  logout: () => Promise<void>;
  clearMustChangePassword: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
