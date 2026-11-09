import { pool } from '../../db/pool.js';
import { pushService } from '../../services/push/index.js';
import type { PushNotificationMessage } from '../../services/push/PushService.js';
import type { NotificationEventKey, NotificationParams } from '../../services/push/templates.js';
import { getNotificationText } from '../../services/push/templates.js';
import { getUserDeviceTokens, getUsersDeviceTokens } from './deviceTokenRepo.js';

export async function sendPushToUser(
  userId: string,
  event: NotificationEventKey,
  params: NotificationParams = {},
  data: Record<string, unknown> = {},
): Promise<void> {
  const tokens = await getUserDeviceTokens(userId);
  if (tokens.length === 0) return;

  const userRes = await pool.query<{ language: string | null }>(
    'SELECT language FROM users WHERE id = $1',
    [userId],
  );
  const lang = userRes.rows[0]?.language ?? 'en';
  const { title, body } = getNotificationText(event, lang, params);

  const messages: PushNotificationMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
  }));

  await pushService.send(messages);
}

export async function sendPushToUsers(
  userIds: string[],
  event: NotificationEventKey,
  params: NotificationParams = {},
  data: Record<string, unknown> = {},
): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await getUsersDeviceTokens(userIds);
  if (tokens.length === 0) return;

  const usersRes = await pool.query<{ id: string; language: string | null }>(
    'SELECT id, language FROM users WHERE id = ANY($1)',
    [userIds],
  );
  const langMap = new Map<string, string>();
  for (const u of usersRes.rows) {
    langMap.set(u.id, u.language ?? 'en');
  }

  const messages: PushNotificationMessage[] = tokens.map((t) => {
    const lang = langMap.get(t.user_id) ?? 'en';
    const { title, body } = getNotificationText(event, lang, params);
    return {
      to: t.token,
      title,
      body,
      data,
    };
  });

  await pushService.send(messages);
}

/**
 * Dispatches push notification in the background without blocking the caller.
 */
export function dispatchPushInBackground(
  userId: string,
  event: NotificationEventKey,
  params: NotificationParams = {},
  data: Record<string, unknown> = {},
): void {
  void sendPushToUser(userId, event, params, data).catch((err) => {
    console.error(`[PushDispatcher] Failed to send push ${event} to user ${userId}:`, err);
  });
}

/**
 * Dispatches push notifications to multiple users in the background.
 */
export function dispatchPushToUsersInBackground(
  userIds: string[],
  event: NotificationEventKey,
  params: NotificationParams = {},
  data: Record<string, unknown> = {},
): void {
  void sendPushToUsers(userIds, event, params, data).catch((err) => {
    console.error(`[PushDispatcher] Failed to send push ${event} to users:`, err);
  });
}
