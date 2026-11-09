import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

// Single source for app identity. Final name is not decided yet (SPEC §1.1) — change it here only.
export const APP_NAME = 'BarberQ';
export const APP_SLUG = 'barberq';
export const SUPPORT_CONTACT = 'support@example.com';

export const appConfig = {
  name: APP_NAME,
  slug: APP_SLUG,
  supportContact: SUPPORT_CONTACT,
} as const;

function getMetroHost(): string | null {
  try {
    const sourceCode =
      TurboModuleRegistry.get<{ getConstants(): { scriptURL?: string } }>('SourceCode') ??
      NativeModules.SourceCode;
    const scriptURL: string | undefined =
      sourceCode?.getConstants?.()?.scriptURL ?? sourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
      if (match?.[1]) return match[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveApiUrl(): string {
  // In dev, derive the host IP from the active Metro bundler so both physical devices
  // and simulators reach the machine's current LAN IP even if .env has a stale IP.
  if (__DEV__) {
    const metroHost = getMetroHost();
    if (metroHost) {
      const host =
        Platform.OS === 'android' && (metroHost === 'localhost' || metroHost === '127.0.0.1')
          ? '10.0.2.2'
          : metroHost;
      return `http://${host}:4000`;
    }
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${fallbackHost}:4000`;
}

// Not a secret. Automatically uses the Metro bundler's LAN IP in dev, or EXPO_PUBLIC_API_URL.
export const API_URL = resolveApiUrl();
