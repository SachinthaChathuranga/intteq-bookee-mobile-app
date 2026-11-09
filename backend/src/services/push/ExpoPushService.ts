import { deleteDeviceToken } from '../../modules/notifications/deviceTokenRepo.js';
import type { PushNotificationMessage, PushService, PushTicketResult } from './PushService.js';

interface ExpoTicketResponse {
  data?: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
  }>;
  errors?: Array<{ message: string; code: string }>;
}

export class ExpoPushService implements PushService {
  constructor(
    private readonly pushUrl: string = 'https://exp.host/--/api/v2/push/send',
    private readonly onInvalidToken?: (token: string) => Promise<void> | void,
  ) {}

  async send(messages: PushNotificationMessage[]): Promise<PushTicketResult[]> {
    if (messages.length === 0) return [];

    const results: PushTicketResult[] = [];
    // Expo allows up to 100 messages per request
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      try {
        const payload = batch.map((m) => ({
          to: m.to,
          title: m.title,
          body: m.body,
          data: m.data,
          sound: m.sound ?? 'default',
          priority: m.priority ?? 'high',
        }));

        const res = await fetch(this.pushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error(`[ExpoPushService] HTTP ${res.status} from push endpoint`);
          for (const m of batch) {
            results.push({ token: m.to, success: false, error: `HTTP ${res.status}` });
          }
          continue;
        }

        const json = (await res.json()) as ExpoTicketResponse;
        const tickets = json.data ?? [];

        for (let j = 0; j < batch.length; j++) {
          const m = batch[j]!;
          const ticket = tickets[j];
          if (!ticket || ticket.status === 'error') {
            const errType = ticket?.details?.error;
            const isInvalid = errType === 'DeviceNotRegistered';

            if (isInvalid) {
              console.warn(`[ExpoPushService] Token unregistered, purging: ${m.to}`);
              if (this.onInvalidToken) {
                await this.onInvalidToken(m.to);
              } else {
                await deleteDeviceToken(m.to).catch((e) =>
                  console.error('[ExpoPushService] Failed to purge invalid token:', e),
                );
              }
            }

            results.push({
              token: m.to,
              success: false,
              invalidToken: isInvalid,
              error: ticket?.message || errType || 'Unknown push error',
            });
          } else {
            results.push({ token: m.to, success: true });
          }
        }
      } catch (err: any) {
        console.error('[ExpoPushService] Request error:', err);
        for (const m of batch) {
          results.push({ token: m.to, success: false, error: err?.message || 'Network error' });
        }
      }
    }

    return results;
  }
}
