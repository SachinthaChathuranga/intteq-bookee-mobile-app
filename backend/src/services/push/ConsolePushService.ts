import type { PushNotificationMessage, PushService, PushTicketResult } from './PushService.js';

export class ConsolePushService implements PushService {
  async send(messages: PushNotificationMessage[]): Promise<PushTicketResult[]> {
    for (const msg of messages) {
      console.log(`[PUSH -> ${msg.to}] ${msg.title}: ${msg.body}`, msg.data ?? {});
    }
    return messages.map((m) => ({ token: m.to, success: true }));
  }
}
