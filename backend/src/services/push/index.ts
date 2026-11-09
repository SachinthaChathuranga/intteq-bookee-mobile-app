import { ConsolePushService } from './ConsolePushService.js';
import { ExpoPushService } from './ExpoPushService.js';
import type { PushService } from './PushService.js';

function create(): PushService {
  if (process.env.NODE_ENV === 'test') {
    return new ConsolePushService();
  }
  return new ExpoPushService();
}

export const pushService: PushService = create();
export type { PushService };
