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
let barberId: string;

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

  // Get Barber Amal
  const barberRes = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE phone = '94770000300' LIMIT 1`,
  );
  barberId = barberRes.rows[0]!.id;
});

afterAll(async () => {
  await pool.end();
});

describe('Customer Favourites API (SPEC §7)', () => {
  it('lists empty favourites initially or previously saved', async () => {
    const res = await request(app)
      .get('/salon/customer/favourites')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(Array.isArray(res.body.favourites)).toBe(true);
  });

  it('adds and persists salon and barber favourites', async () => {
    // Add Salon favourite
    await request(app)
      .post('/salon/customer/favourites')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'SALON', targetId: branchId })
      .expect(201);

    // Add Barber favourite
    await request(app)
      .post('/salon/customer/favourites')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'BARBER', targetId: barberId })
      .expect(201);

    // List and verify both are present
    const listRes = await request(app)
      .get('/salon/customer/favourites')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const salonFav = listRes.body.favourites.find(
      (f: any) => f.type === 'SALON' && f.target_id === branchId,
    );
    const barberFav = listRes.body.favourites.find(
      (f: any) => f.type === 'BARBER' && f.target_id === barberId,
    );

    expect(salonFav).toBeDefined();
    expect(barberFav).toBeDefined();
  });

  it('removes favourite when un-favorited', async () => {
    // Remove Salon favourite
    const removeRes = await request(app)
      .delete(`/salon/customer/favourites/SALON/${branchId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(removeRes.body.success).toBe(true);
    expect(removeRes.body.removed).toBe(true);

    // Check list
    const listRes = await request(app)
      .get('/salon/customer/favourites')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const salonFav = listRes.body.favourites.find(
      (f: any) => f.type === 'SALON' && f.target_id === branchId,
    );
    expect(salonFav).toBeUndefined();
  });
});
