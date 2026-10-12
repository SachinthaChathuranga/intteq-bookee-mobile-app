import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  language: 'si' | 'ta' | 'en';
  theme: 'light' | 'dark' | 'system';
}

const REFRESH_KEY = 'refreshToken';

interface AuthState {
  /** 'loading' until the stored refresh token has been checked. */
  status: 'loading' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setSession: (s: { accessToken: string; refreshToken: string; user: User }) => Promise<void>;
  setTokens: (t: { accessToken: string; refreshToken: string }) => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
  markSignedOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: async ({ accessToken, refreshToken, user }) => {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ status: 'signedIn', accessToken, refreshToken, user });
  },
  setTokens: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },
  setUser: (user) => set({ user }),
  signOut: async () => {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ status: 'signedOut', accessToken: null, refreshToken: null, user: null });
  },
  markSignedOut: () => set({ status: 'signedOut', accessToken: null, refreshToken: null, user: null }),
}));

export const readStoredRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);
