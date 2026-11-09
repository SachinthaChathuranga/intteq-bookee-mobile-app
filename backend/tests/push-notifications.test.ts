import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { saveDeviceToken, getUserDeviceTokens, deleteDeviceToken } from '../src/modules/notifications/deviceTokenRepo.js';
import { getNotificationText } from '../src/services/push/templates.js';
import { ExpoPushService } from '../src/services/push/ExpoPushService.js';
import { runAppointmentReminderCheck } from '../src/services/jobs/appointmentReminderJob.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

import { DEV_FIXED_OTP } from '../src/modules/auth/service.js';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET);
}

describe('Milestone 8: Push Notifications', () => {
  const app = createApp();

  it('1. Multi-language templates support en, si, ta for all events', () => {
    const enNext = getNotificationText('queue_next', 'en');
    const siNext = getNotificationText('queue_next', 'si');
    const taNext = getNotificationText('queue_next', 'ta');

    expect(enNext.title).toBe('You are next!');
    expect(siNext.title).toBe('ඔබ ඊළඟට!');
    expect(taNext.title).toBe('அடுத்து நீங்கள் தான்!');

    const enBarber = getNotificationText('general_queue_picked_up', 'en', { barberName: 'Amal' });
    const siBarber = getNotificationText('general_queue_picked_up', 'si', { barberName: 'Amal' });
    const taBarber = getNotificationText('general_queue_picked_up', 'ta', { barberName: 'Amal' });

    expect(enBarber.body).toContain('Amal');
    expect(siBarber.body).toContain('Amal');
    expect(taBarber.body).toContain('Amal');

    const reminder = getNotificationText('appointment_reminder', 'en', { barberName: 'Kasun', time: '2:30 PM' });
    expect(reminder.body).toContain('2:30 PM');
  });

  it('2. Device token repository saves, retrieves, and updates tokens', async () => {
    // Create test user
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name, language) 
       VALUES ('94770009999', 'Push User', 'si') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const userId = userRes.rows[0]!.id;

    const token = 'ExponentPushToken[test-unique-token-123]';
    const saved = await saveDeviceToken(userId, token, 'android');
    expect(saved.token).toBe(token);
    expect(saved.platform).toBe('android');

    const tokens = await getUserDeviceTokens(userId);
    expect(tokens.length).toBeGreaterThanOrEqual(1);
    expect(tokens.some((t) => t.token === token)).toBe(true);

    // Upsert on token conflict (different user logs into same device)
    const otherUserRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name, language) 
       VALUES ('94770009998', 'Other User', 'en') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const otherUserId = otherUserRes.rows[0]!.id;

    await saveDeviceToken(otherUserId, token, 'ios');
    const otherTokens = await getUserDeviceTokens(otherUserId);
    expect(otherTokens.some((t) => t.token === token && t.platform === 'ios')).toBe(true);

    const oldUserTokens = await getUserDeviceTokens(userId);
    expect(oldUserTokens.some((t) => t.token === token)).toBe(false);

    // Clean up
    await deleteDeviceToken(token);
  });

  it('3. POST and DELETE /notifications/device-token endpoint works with auth', async () => {
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name) 
       VALUES ('94770008888', 'Api Push User') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const userId = userRes.rows[0]!.id;
    const token = signToken(userId);

    const pushToken = 'ExponentPushToken[api-test-token-456]';

    // Register token
    const regRes = await request(app)
      .post('/notifications/device-token')
      .set('Authorization', `Bearer ${token}`)
      .send({
        token: pushToken,
        platform: 'ios',
      });
    expect(regRes.status).toBe(200);
    expect(regRes.body.ok).toBe(true);

    // Query tokens
    const getRes = await request(app)
      .get('/notifications/device-tokens')
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.tokens.some((t: any) => t.token === pushToken)).toBe(true);

    // Delete token on logout
    const delRes = await request(app)
      .delete('/notifications/device-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: pushToken });
    expect(delRes.status).toBe(200);

    const getAfter = await request(app)
      .get('/notifications/device-tokens')
      .set('Authorization', `Bearer ${token}`);
    expect(getAfter.body.tokens.some((t: any) => t.token === pushToken)).toBe(false);
  });

  it('4. ExpoPushService purges invalid tokens (DeviceNotRegistered)', async () => {
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name) 
       VALUES ('94770007777', 'Invalid Token User') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const userId = userRes.rows[0]!.id;

    const deadToken = 'ExponentPushToken[dead-token-789]';
    await saveDeviceToken(userId, deadToken, 'android');

    // Create custom ExpoPushService pointing to a mock endpoint that reports DeviceNotRegistered
    let purgedToken = '';
    const mockService = new ExpoPushService(
      'http://localhost:9999/dummy-endpoint', // unused because we test the callback logic
      async (tok) => {
        purgedToken = tok;
        await deleteDeviceToken(tok);
      },
    );

    // Simulate sending to dead token with mocked fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              status: 'error',
              message: '"dead-token" is not registered',
              details: { error: 'DeviceNotRegistered' },
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      const tickets = await mockService.send([
        { to: deadToken, title: 'Test', body: 'Test message' },
      ]);
      expect(tickets[0]?.success).toBe(false);
      expect(tickets[0]?.invalidToken).toBe(true);
      expect(purgedToken).toBe(deadToken);

      const tokensAfter = await getUserDeviceTokens(userId);
      expect(tokensAfter.some((t) => t.token === deadToken)).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('5. runAppointmentReminderCheck finds appointments ~1 hr away, sends reminder and is idempotent', async () => {
    // Create customer and barber
    const custRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name, language) 
       VALUES ('94770006666', 'Reminder Customer', 'en') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const barberRes = await pool.query<{ id: string }>(
      `INSERT INTO users (phone, name) 
       VALUES ('94770006665', 'Reminder Barber') 
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    const branchRes = await pool.query<{ id: string }>('SELECT id FROM branches LIMIT 1');

    const customerId = custRes.rows[0]!.id;
    const barberId = barberRes.rows[0]!.id;
    const branchId = branchRes.rows[0]!.id;

    // Insert appointment starting in 60 minutes
    const appRes = await pool.query<{ id: string }>(
      `INSERT INTO salon_appointments (branch_id, barber_id, customer_id, start_at, end_at, status, booking_mode)
       VALUES ($1, $2, $3, now() + interval '60 minutes', now() + interval '90 minutes', 'CONFIRMED', 'SPECIFIC')
       RETURNING id`,
      [branchId, barberId, customerId],
    );
    const appointmentId = appRes.rows[0]!.id;

    // Run check
    const sentCount = await runAppointmentReminderCheck();
    expect(sentCount).toBeGreaterThanOrEqual(1);

    // Verify reminder_sent_at is set
    const verifyRes = await pool.query<{ reminder_sent_at: Date | null }>(
      'SELECT reminder_sent_at FROM salon_appointments WHERE id = $1',
      [appointmentId],
    );
    expect(verifyRes.rows[0]?.reminder_sent_at).not.toBeNull();

    // Run again immediately - should NOT resend (idempotency)
    const secondCount = await runAppointmentReminderCheck();
    expect(secondCount).toBe(0);
  });
});
