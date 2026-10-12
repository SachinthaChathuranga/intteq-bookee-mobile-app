import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'si' | 'ta' | 'en';
export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  /** null until the user picks one on first launch. */
  language: Language | null;
  theme: ThemePreference;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      theme: 'system',
      hydrated: false,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ language: s.language, theme: s.theme }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    },
  ),
);
