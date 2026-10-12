import type { ConfigContext, ExpoConfig } from 'expo/config';
// Explicit .ts extension: Expo's config loader runs in Node and can't resolve extensionless TS imports.
import { APP_NAME, APP_SLUG } from './src/config/app.ts';

// App name/slug come only from src/config/app.ts (SPEC §1.1). Everything else stays in app.json.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  userInterfaceStyle: 'automatic',
});
