import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@raftar_theme_mode';

// Accent is reserved for the single primary action per screen.
const SHARED_COLORS = {
  accent: '#FFC107',
  accentText: '#111111',
  pickup: '#4ECDC4',
  success: '#4ECDC4',
  dropoff: '#FF6B6B',
  danger: '#FF6B6B',
  stop: '#FF9F43',
  warning: '#FF9F43'
};

export const DARK_COLORS = {
  ...SHARED_COLORS,
  background: '#0F0F0F',
  card: '#1A1A1A',
  cardElevated: '#242424',
  text: '#FFFFFF',
  textSecondary: '#8A8A8A',
  border: '#2A2A2A',
  switchTrackOff: '#333333',
  switchThumbOff: '#666666',
  statusBarStyle: 'light-content'
};

export const LIGHT_COLORS = {
  ...SHARED_COLORS,
  background: '#FFFFFF',
  card: '#F5F5F5',
  cardElevated: '#EDEDED',
  text: '#111111',
  textSecondary: '#6A6A6A',
  border: '#E5E5E5',
  switchTrackOff: '#CCCCCC',
  switchThumbOff: '#999999',
  statusBarStyle: 'dark-content'
};

const ThemeContext = createContext({
  mode: 'dark',
  isDark: true,
  colors: DARK_COLORS,
  setMode: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark') {
          setModeState(saved);
        }
      })
      .catch(error => console.error('Error loading theme:', error));
  }, []);

  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode)
      .catch(error => console.error('Error saving theme:', error));
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next)
        .catch(error => console.error('Error saving theme:', error));
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    mode,
    isDark: mode === 'dark',
    colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    setMode,
    toggleTheme
  }), [mode, setMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
