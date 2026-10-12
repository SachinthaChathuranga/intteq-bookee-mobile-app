import type { SmsService } from './SmsService.js';

/**
 * notify.lk provider. Endpoint and parameters follow the notify.lk v1 send API;
 * verify against their current docs before enabling in production.
 * A custom sender ID requires approval from notify.lk.
 */
export class NotifyLkSmsService implements SmsService {
  constructor(
    private readonly userId: string,
    private readonly apiKey: string,
    private readonly senderId: string,
  ) {}

  async sendSms(phone: string, message: string): Promise<void> {
    const params = new URLSearchParams({
      user_id: this.userId,
      api_key: this.apiKey,
      sender_id: this.senderId,
      to: phone,
      message,
    });
    const res = await fetch('https://app.notify.lk/api/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    if (!res.ok) throw new Error(`notify.lk request failed with status ${res.status}`);
    const body = (await res.json().catch(() => null)) as { status?: string; message?: string } | null;
    if (body?.status && body.status !== 'success') {
      throw new Error(`notify.lk rejected the message: ${body.message ?? body.status}`);
    }
  }
}
