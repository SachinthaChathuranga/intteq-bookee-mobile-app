import { config } from '../../config/index.js';
import { ConsoleSmsService } from './ConsoleSmsService.js';
import { NotifyLkSmsService } from './NotifyLkSmsService.js';
import type { SmsService } from './SmsService.js';

function create(): SmsService {
  if (config.SMS_PROVIDER === 'notify_lk') {
    const { NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID } = config;
    if (!NOTIFY_LK_USER_ID || !NOTIFY_LK_API_KEY || !NOTIFY_LK_SENDER_ID) {
      throw new Error('NOTIFY_LK_* env vars are required when SMS_PROVIDER=notify_lk');
    }
    return new NotifyLkSmsService(NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY, NOTIFY_LK_SENDER_ID);
  }
  return new ConsoleSmsService();
}

export const smsService: SmsService = create();
export type { SmsService };
