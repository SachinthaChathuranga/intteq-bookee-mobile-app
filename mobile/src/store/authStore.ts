import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  language: 'si' | 'ta' | 'en';
  theme: 'light' | 'dark' | 'system';
}

export type StaffRole = 'SUPER_ADMIN' | 'OWNER' | 'RECEPTIONIST' | 'BARBER';

export interface UserRole {
  id: string;
  role: StaffRole;
  business_id: string | null;
  business_name: string | null;
  business_type: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
}

const REFRESH_KEY = 'refreshToken';

interface AuthState {
  /** 'loading' until the stored refresh token has been checked. */
  status: 'loading' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  roles: UserRole[];
  setSession: (s: { accessToken: string; refreshToken: string; user: User; roles?: UserRole[] }) => Promise<void>;
  setTokens: (t: { accessToken: string; refreshToken: string }) => Promise<void>;
  setUser: (user: User) => void;
  setRoles: (roles: UserRole[]) => void;
  signOut: () => Promise<void>;
  markSignedOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,
  user: null,
  roles: [],
  setSession: async ({ accessToken, refreshToken, user, roles = [] }) => {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ status: 'signedIn', accessToken, refreshToken, user, roles });
  },
  setTokens: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },
  setUser: (user) => set({ user }),
  setRoles: (roles) => set({ roles }),
  signOut: async () => {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ status: 'signedOut', accessToken: null, refreshToken: null, user: null, roles: [] });
  },
  markSignedOut: () => set({ status: 'signedOut', accessToken: null, refreshToken: null, user: null, roles: [] }),
}));

export const readStoredRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);
