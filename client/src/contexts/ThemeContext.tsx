import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setThemePreference: (theme: Theme) => void;
}

const STORAGE_KEY = 'fc_theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getStoredTheme = (): Theme | null => {
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  } catch (error) {
    console.error('Failed to read the saved theme preference.', error);
  }
  return null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (
    getStoredTheme() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  ));
  const [hasUserPreference, setHasUserPreference] = useState(() => getStoredTheme() !== null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#142219' : '#263D2B'
    );
  }, [theme]);

  useEffect(() => {
    if (hasUserPreference) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateFromSystem = (event: MediaQueryListEvent) => setTheme(event.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', updateFromSystem);
    return () => mediaQuery.removeEventListener('change', updateFromSystem);
  }, [hasUserPreference]);

  useEffect(() => {
    const syncThemeAcrossTabs = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue);
        setHasUserPreference(true);
      } else if (event.key === STORAGE_KEY && event.newValue === null) {
        setHasUserPreference(false);
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
    };
    window.addEventListener('storage', syncThemeAcrossTabs);
    return () => window.removeEventListener('storage', syncThemeAcrossTabs);
  }, []);

  const setThemePreference = useCallback((nextTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error('Failed to save the theme preference.', error);
    }
    setTheme(nextTheme);
    setHasUserPreference(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference(theme === 'light' ? 'dark' : 'light');
  }, [setThemePreference, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
