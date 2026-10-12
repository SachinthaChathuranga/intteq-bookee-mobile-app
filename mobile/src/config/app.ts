// Single source for app identity. Final name is not decided yet (SPEC §1.1) — change it here only.
export const APP_NAME = 'BarberQ';
export const APP_SLUG = 'barberq';
export const SUPPORT_CONTACT = 'support@example.com';

// Not a secret. Use your computer's LAN IP when testing on a physical device.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
