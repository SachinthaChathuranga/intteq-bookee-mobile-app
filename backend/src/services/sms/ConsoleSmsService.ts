import type { SmsService } from './SmsService.js';

export class ConsoleSmsService implements SmsService {
  async sendSms(phone: string, message: string): Promise<void> {
    console.log(`[SMS -> ${phone}] ${message}`);
  }
}
