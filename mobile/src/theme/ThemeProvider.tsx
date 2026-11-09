import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore, type ThemePreference } from '../store/settingsStore';
import { darkColors, lightColors, type ThemeColors } from './colors';

interface ThemeContextValue {
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  colors: ThemeColors;
  navigationTheme: NavigationTheme;
  setPreference: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.theme);
  const setPreference = useSettingsStore((s) => s.setTheme);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const colors = scheme === 'dark' ? darkColors : lightColors;
    const baseNav = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const navigationTheme: NavigationTheme = {
      ...baseNav,
      colors: {
        ...baseNav.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.navigationBackground,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
    return { scheme, preference, colors, navigationTheme, setPreference };
  }, [scheme, preference, setPreference]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} animated />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
