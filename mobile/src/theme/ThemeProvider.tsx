import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors, type ColorTokens } from './colors';
import { useSettingsStore } from '../store/settingsStore';

interface ThemeContextValue {
  colors: ColorTokens;
  isDark: boolean;
  navigationTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((s) => s.theme);
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';

  const value = useMemo<ThemeContextValue>(() => {
    const tokens = isDark ? colors.dark : colors.light;
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      colors: tokens,
      isDark,
      navigationTheme: {
        ...base,
        colors: {
          ...base.colors,
          primary: tokens.primary,
          background: tokens.background,
          card: tokens.surface,
          text: tokens.text,
          border: tokens.border,
          notification: tokens.danger,
        },
      },
    };
  }, [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
