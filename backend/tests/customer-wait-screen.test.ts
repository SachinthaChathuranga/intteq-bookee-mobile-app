import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEV_FIXED_OTP } from '../src/modules/auth/service.js';

const { config } = await import('../src/config/index.js');
const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { runSeed } = await import('../src/db/seed.js');

const app = createApp();
let customerToken: string;
let branchId: string;
let serviceIds: string[];

beforeAll(async () => {
  process.env.NODE_ENV = 'development';
  (config as any).NODE_ENV = 'development';
  await runSeed();

  // Login as Customer Nimal (0770000100)
  const loginRes = await request(app)
    .post('/auth/otp/verify')
    .send({ phone: '0770000100', code: DEV_FIXED_OTP })
    .expect(200);

  customerToken = loginRes.body.accessToken;

  // Get Colombo branch
  const branchRes = await pool.query<{ id: string }>(
    `SELECT id FROM branches WHERE name = 'Colombo' LIMIT 1`,
  );
  branchId = branchRes.rows[0]!.id;

  // Get services for Colombo
  const svcRes = await pool.query<{ id: string }>(
    `SELECT id FROM services WHERE branch_id = $1 LIMIT 2`,
    [branchId],
  );
  serviceIds = svcRes.rows.map((r) => r.id);
});

afterAll(async () => {
  await pool.end();
});

describe('Customer Wait Screen API (SPEC §4.4, §6.5)', () => {
  it('returns activeQueue: null when customer is not in queue', async () => {
    // Clear any active queue for this customer first
    const userIdRes = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE phone = '94770000100'`,
    );
    const userId = userIdRes.rows[0]!.id;
    await pool.query(
      `UPDATE salon_queue_entries SET status = 'COMPLETED' WHERE customer_id = $1`,
      [userId],
    );

    const res = await request(app)
      .get('/salon/customer/active-queue')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.activeQueue).toBeNull();
  });

  it('returns active queue metrics after customer joins queue', async () => {
    // Customer joins live queue
    const joinRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/join`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ serviceIds })
      .expect(201);

    expect(joinRes.body.token).toBeDefined();

    // Query active queue
    const queueRes = await request(app)
      .get('/salon/customer/active-queue')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const active = queueRes.body.activeQueue;
    expect(active).not.toBeNull();
    expect(active.token_number).toBe(joinRes.body.token);
    expect(active.position).toBeGreaterThanOrEqual(1);
    expect(active.people_ahead).toBeGreaterThanOrEqual(0);
    expect(active.estimated_wait_minutes).toBeGreaterThanOrEqual(0);
    expect(active.branch_name).toBe('Colombo');
    expect(active.services.length).toBe(serviceIds.length);
  });

  it('allows customer to leave queue before being called', async () => {
    const leaveRes = await request(app)
      .post('/salon/customer/queue/leave')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({})
      .expect(200);

    expect(leaveRes.body.success).toBe(true);
    expect(leaveRes.body.left).toBe(true);

    // After leaving, active queue returns null
    const checkRes = await request(app)
      .get('/salon/customer/active-queue')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(checkRes.body.activeQueue).toBeNull();
  });
});
