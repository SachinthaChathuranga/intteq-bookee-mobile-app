export interface PushNotificationMessage {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'normal' | 'high';
}

export interface PushTicketResult {
  token: string;
  success: boolean;
  invalidToken?: boolean; // DeviceNotRegistered
  error?: string;
}

export interface PushService {
  send(messages: PushNotificationMessage[]): Promise<PushTicketResult[]>;
}
