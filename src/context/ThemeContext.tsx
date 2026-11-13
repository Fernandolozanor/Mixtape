import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_SCHEMES, type ThemeScheme } from '../types/theme';

interface ThemeContextType {
  currentTheme: ThemeScheme;
  setThemeById: (id: string) => void;
  themes: ThemeScheme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeScheme>(() => {
    const saved = localStorage.getItem('pulse_theme');
    const found = THEME_SCHEMES.find((t) => t.id === saved);
    // If user has not explicitly set retro-rock-80s yet, default to retro-rock-80s for the new 80s aesthetic
    return found && saved !== 'ocean-blue' ? found : THEME_SCHEMES[0];
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', currentTheme.primary);
    root.style.setProperty('--theme-rgb', currentTheme.rgb);
    root.style.setProperty('--theme-secondary', currentTheme.secondary);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-gradient', currentTheme.gradient);
    root.style.setProperty('--theme-badge-bg', currentTheme.badgeBg);
    root.style.setProperty('--theme-badge-text', currentTheme.badgeText);
    root.style.setProperty('--theme-badge-border', currentTheme.badgeBorder);
    root.style.setProperty('--theme-glow', `rgba(${currentTheme.rgb}, 0.35)`);

    localStorage.setItem('pulse_theme', currentTheme.id);
  }, [currentTheme]);

  const setThemeById = (id: string) => {
    const found = THEME_SCHEMES.find((t) => t.id === id);
    if (found) {
      setCurrentTheme(found);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setThemeById,
        themes: THEME_SCHEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
