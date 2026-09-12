import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import type { AppTheme } from '../types/user';

const THEME_STORAGE_KEY = 'examvault.theme';

function loadStoredTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'Light' || stored === 'Dark' || stored === 'System' ? stored : 'Light';
}

function resolveBsTheme(theme: AppTheme): 'light' | 'dark' {
  if (theme === 'System') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme === 'Dark' ? 'dark' : 'light';
}

// Real, app-wide theme switching using Bootstrap 5.3's native data-bs-theme
// attribute - every react-bootstrap component genuinely restyles. Custom
// hardcoded-hex-color elements (the sidebar, brand accents) don't respond
// since they're not Bootstrap CSS-variable-driven - an honest limit, not
// hidden from the plan.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(loadStoredTheme);

  const setTheme = (next: AppTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeState(next);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

// Actually applies the theme to the DOM - split out from ThemeProvider so it
// can be auth-aware. Dark mode is a per-user preference for the
// authenticated console only; the public marketing site (landing page,
// Login/Register modal, Pricing, etc.) must always render light regardless
// of what a Super Admin/Admin last saved, since data-bs-theme is a single
// global <html> attribute shared by every route. Needs to live inside both
// ThemeProvider and AuthProvider - mounted in App.tsx accordingly.
export function ThemeSync() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const apply = () =>
      document.documentElement.setAttribute('data-bs-theme', isAuthenticated ? resolveBsTheme(theme) : 'light');
    apply();

    if (!isAuthenticated || theme !== 'System') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, isAuthenticated]);

  return null;
}
