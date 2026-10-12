import type { TranslationKey } from '../i18n/en';
import { ApiError } from './client';

/** Maps an API/network error to a translation key for display. */
export function errorKey(err: unknown): TranslationKey {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK_ERROR') return 'common.error.network';
    if (err.code === 'OTP_INVALID') return 'otp.invalid';
    if (err.code === 'OTP_COOLDOWN') return 'otp.cooldown';
  }
  return 'common.error.generic';
}
