import React, { createContext, useContext, useEffect, useCallback } from 'react';

export interface ThemeColors {
  'color-primary': string;
  'color-primary-hover': string;
  'color-bg': string;
  'color-surface': string;
  'color-text': string;
  'color-text-muted': string;
  'color-border': string;
  'color-bg-secondary': string;
  'color-primary-light': string;
  'scrollbar-thumb': string;
  'scrollbar-thumb-hover': string;
  'comment-text': string;
  'comment-text-hover': string;
  'comment-bg': string;
  'comment-bg-hover': string;
  'event-text': string;
  'event-text-hover': string;
  'event-bg': string;
  'event-bg-hover': string;
  // Extensible: Add new color types here
  'romantic-text'?: string;
  'romantic-text-hover'?: string;
  'romantic-bg'?: string;
  'romantic-bg-hover'?: string;
}

export const lightTheme: ThemeColors = {
  'color-primary': '#4f46e5',
  'color-primary-hover': '#4338ca',
  'color-bg': '#f3f4f6',
  'color-surface': '#ffffff',
  'color-text': '#1f2937',
  'color-text-muted': '#6b7280',
  'color-border': '#e5e7eb',
  'color-bg-secondary': '#f9fafb',
  'color-primary-light': '#e0e7ff',
  'scrollbar-thumb': '#d1d5db',
  'scrollbar-thumb-hover': '#9ca3af',
  'comment-text': '#7c3aed',
  'comment-text-hover': '#6d28d9',
  'comment-bg': '#f3e8ff',
  'comment-bg-hover': '#f3e8ff',
  'event-text': '#059669',
  'event-text-hover': '#047857',
  'event-bg': '#ecfdf5',
  'event-bg-hover': '#ecfdf5',
  // Example: Romantic scene colors (optional)
  'romantic-text': '#ec4899',
  'romantic-text-hover': '#db2777',
  'romantic-bg': '#fce7f3',
  'romantic-bg-hover': '#fbcfe8',
};

export const darkTheme: ThemeColors = {
  'color-primary': '#6366f1',
  'color-primary-hover': '#818cf8',
  'color-bg': '#0f172a',
  'color-surface': '#1e293b',
  'color-text': '#f1f5f9',
  'color-text-muted': '#cbd5e1',
  'color-border': '#334155',
  'color-bg-secondary': '#334155',
  'color-primary-light': '#312e81',
  'scrollbar-thumb': '#475569',
  'scrollbar-thumb-hover': '#64748b',
  'comment-text': '#a78bfa',
  'comment-text-hover': '#c4b5fd',
  'comment-bg': '#4c1d95',
  'comment-bg-hover': '#5b21b6',
  'event-text': '#6ee7b7',
  'event-text-hover': '#5eead4',
  'event-bg': '#042f2e',
  'event-bg-hover': '#134e4a',
  // Example: Romantic scene colors (optional)
  'romantic-text': '#f9a8d4',
  'romantic-text-hover': '#fbcfe8',
  'romantic-bg': '#831843',
  'romantic-bg-hover': '#9f1239',
};

interface ThemeContextType {
  isDark: boolean;
  themeMode: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  setTheme: (mode: 'light' | 'dark' | 'system') => void;
  applyCustomColors: (colors: Partial<ThemeColors>) => void;
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getStoredThemeMode = (): 'light' | 'dark' | 'system' => {
  if (typeof window === 'undefined') return 'light';

  const saved = localStorage.getItem('maria_theme_mode');
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }

  return 'light';
};

const getStoredCustomColors = (): Partial<ThemeColors> => {
  if (typeof window === 'undefined') return {};

  const savedColors = localStorage.getItem('maria_custom_colors');
  if (!savedColors) return {};

  try {
    return JSON.parse(savedColors);
  } catch (e) {
    console.error('Failed to load custom colors', e);
    return {};
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>(getStoredThemeMode);
  const [customColors, setCustomColors] = React.useState<Partial<ThemeColors>>(getStoredCustomColors);

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }, []);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && getSystemTheme() === 'dark');
  const baseColors = isDark ? darkTheme : lightTheme;
  const colors = { ...baseColors, ...customColors };

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;

    // Set data-theme attribute for CSS media queries
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply custom CSS variables only if they exist
    if (Object.keys(customColors).length > 0) {
      Object.entries(customColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
    } else {
      // Remove custom overrides to let CSS defaults take over
      Object.keys(lightTheme).forEach((key) => {
        root.style.removeProperty(`--${key}`);
      });
    }

    // Save preferences
    localStorage.setItem('maria_theme_mode', themeMode);
    if (Object.keys(customColors).length > 0) {
      localStorage.setItem('maria_custom_colors', JSON.stringify(customColors));
    } else {
      localStorage.removeItem('maria_custom_colors');
    }
  }, [isDark, themeMode, customColors]);

  // Listen for system theme changes
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Trigger re-render by updating a dummy state
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const setTheme = useCallback((mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  }, []);

  const applyCustomColors = useCallback((newColors: Partial<ThemeColors>) => {
    setCustomColors(newColors);
  }, []);

  const resetToDefault = useCallback(() => {
    setCustomColors({});
    setThemeMode('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, colors, setTheme, applyCustomColors, resetToDefault }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
