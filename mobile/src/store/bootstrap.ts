import { fetchMe } from '../api/auth';
import { useAuthStore, readStoredRefreshToken } from './authStore';
import { useSettingsStore } from './settingsStore';

/**
 * Restores a previous session on launch. A stored refresh token is exchanged
 * by the API client's 401 → refresh flow on the first authenticated call.
 */
export async function bootstrapAuth(): Promise<void> {
  const { markSignedOut } = useAuthStore.getState();
  const refreshToken = await readStoredRefreshToken();
  if (!refreshToken) return markSignedOut();

  useAuthStore.setState({ refreshToken });
  try {
    const { user } = await fetchMe();
    // The refresh flow may have signed us out if the token was rejected.
    if (useAuthStore.getState().status === 'signedOut') return;
    useAuthStore.setState({ status: 'signedIn', user });
    useSettingsStore.setState({ language: user.language, theme: user.theme });
  } catch {
    markSignedOut();
  }
}
