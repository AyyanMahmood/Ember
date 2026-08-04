import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'emberflow-theme';
const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Public/marketing/auth pages are permanently dark — theme switching only exists inside the
// authenticated app (/app/*). The user's chosen theme is still persisted and reapplied the
// instant they enter /app, it's just never rendered outside it.
function isAuthedAppRoute(pathname) {
  return pathname.startsWith('/app');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const location = useLocation();
  const appliedTheme = isAuthedAppRoute(location.pathname) ? theme : 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme);
  }, [appliedTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private browsing, disabled storage) — theme still applies for this session
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme: appliedTheme, toggleTheme, setTheme }), [appliedTheme, toggleTheme]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
