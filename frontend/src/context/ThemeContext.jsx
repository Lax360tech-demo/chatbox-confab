import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'night', name: 'Night Mode', color: '#0b0f17', accent: '#6366f1' },
  { id: 'light', name: 'Premium Light', color: '#ffffff', accent: '#4f46e5' },
  { id: 'ocean', name: 'Ocean Blue', color: '#081220', accent: '#0284c7' },
  { id: 'lavender', name: 'Lavender', color: '#130e1e', accent: '#9333ea' },
  { id: 'forest', name: 'Forest Green', color: '#0a1510', accent: '#059669' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('confab_theme') || 'night';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('confab_theme', theme);
  }, [theme]);

  const switchTheme = async (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('confab_theme', newTheme);
    try {
      if (localStorage.getItem('confab_access_token')) {
        await api.put('/users/theme', { theme: newTheme });
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, switchTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
