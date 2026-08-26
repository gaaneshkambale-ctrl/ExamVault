import { createContext } from 'react';
import type { AppTheme } from '../types/user';

export interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
