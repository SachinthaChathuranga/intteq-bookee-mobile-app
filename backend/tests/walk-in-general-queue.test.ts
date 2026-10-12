import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import { pool } from '../src/db/pool.js';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET);
}

describe('Milestone 5: General Queue, Walk-ins & Receptionist Live Floor', () => {
  const app = createApp();
  const PHONES = ['94771110001', '94771110002', '94771110003', '94774441111'];

  let receptionistToken: string;
  let receptionistId: string;
  let barberToken: string;
  let barberId: string;
  let branchId: string;
  let haircutId: string;
  let beardId: string;

  beforeAll(async () => {
    await pool.query('DELETE FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE phone = ANY($1))', [PHONES]);
    await pool.query('DELETE FROM users WHERE phone = ANY($1)', [PHONES]);

    // 1. Create receptionist user
    const recRes = await pool.query(
      "INSERT INTO users (phone, name) VALUES ('94771110001', 'Receptionist Maya') RETURNING id",
    );
    receptionistId = recRes.rows[0].id;
    receptionistToken = signToken(receptionistId);

    // 2. Create barber user
    const barRes = await pool.query(
      "INSERT INTO users (phone, name) VALUES ('94771110002', 'Barber Nuwan') RETURNING id",
    );
    barberId = barRes.rows[0].id;
    barberToken = signToken(barberId);

    // 3. Create business & branch
    const bizRes = await pool.query(
      "INSERT INTO businesses (owner_id, name, type) VALUES ($1, 'Maya Salon', 'SALON') RETURNING id",
      [receptionistId],
    );
    const businessId = bizRes.rows[0].id;

    const branchRes = await pool.query(
      "INSERT INTO branches (business_id, name, address, phone) VALUES ($1, 'Negombo Branch', 'Main St', '0312223344') RETURNING id",
      [businessId],
    );
    branchId = branchRes.rows[0].id;

    // 4. Create services
    const s1 = await pool.query(
      "INSERT INTO services (branch_id, name, price, duration_minutes) VALUES ($1, 'Haircut', 1200, 30) RETURNING id",
      [branchId],
    );
    haircutId = s1.rows[0].id;

    const s2 = await pool.query(
      "INSERT INTO services (branch_id, name, price, duration_minutes) VALUES ($1, 'Shave', 600, 15) RETURNING id",
      [branchId],
    );
    beardId = s2.rows[0].id;

    // 5. Assign barber & start shift
    await pool.query(
      "INSERT INTO barber_branches (barber_id, branch_id, commission_type, commission_value) VALUES ($1, $2, 'PERCENT', 40)",
      [barberId, branchId],
    );

    await pool.query(
      "INSERT INTO salon_shifts (barber_id, branch_id, status) VALUES ($1, $2, 'ACTIVE')",
      [barberId, branchId],
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM businesses WHERE owner_id IN (SELECT id FROM users WHERE phone = ANY($1))', [PHONES]);
    await pool.query('DELETE FROM users WHERE phone = ANY($1)', [PHONES]);
  });

  it('creates anonymous walk-in with daily token W-01 into general queue', async () => {
    const res = await request(app)
      .post(`/salon/branches/${branchId}/walk-ins`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        mode: 'ANONYMOUS',
        customerName: 'Anonymous Walk-in 1',
        serviceIds: [haircutId],
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('W-01');
    expect(res.body.entry.token_number).toBe('W-01');
    expect(res.body.entry.queue_type).toBe('GENERAL');
    expect(res.body.entry.source).toBe('WALK_IN_ANON');
    expect(res.body.entry.customer_id).toBeNull();
    expect(res.body.estimated_wait_minutes).toBeGreaterThan(0);
  });

  it('creates verified walk-in with phone, creating lightweight user profile and incrementing token W-02', async () => {
    const res = await request(app)
      .post(`/salon/branches/${branchId}/walk-ins`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        mode: 'VERIFIED',
        customerName: 'Verified Sunil',
        phone: '0774441111',
        serviceIds: [haircutId, beardId],
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('W-02');
    expect(res.body.entry.token_number).toBe('W-02');
    expect(res.body.entry.queue_type).toBe('GENERAL');
    expect(res.body.entry.source).toBe('WALK_IN_VERIFIED');
    expect(res.body.entry.customer_id).not.toBeNull();

    // Verify lightweight profile exists with is_app_user = false
    const userRes = await pool.query(
      'SELECT phone, name, is_app_user FROM users WHERE id = $1',
      [res.body.entry.customer_id],
    );
    expect(userRes.rows[0].phone).toBe('94774441111');
    expect(userRes.rows[0].is_app_user).toBe(false);
  });

  it('creates specific barber walk-in directly into barber queue', async () => {
    const res = await request(app)
      .post(`/salon/branches/${branchId}/walk-ins`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        mode: 'ANONYMOUS',
        customerName: 'Specific Barber Walkin',
        serviceIds: [haircutId],
        barberId,
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('W-03');
    expect(res.body.entry.token_number).toBe('W-03');
    expect(res.body.entry.queue_type).toBe('BARBER');
    expect(res.body.entry.barber_id).toBe(barberId);
  });

  it('fetches live floor overview with general queue and barber queues', async () => {
    const res = await request(app)
      .get(`/salon/branches/${branchId}/live-floor`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.branch_id).toBe(branchId);
    expect(res.body.general_queue.length).toBe(2); // W-01 and W-02
    expect(res.body.barbers.length).toBe(1); // Nuwan
    expect(res.body.barbers[0].shift_status).toBe('ACTIVE');
    expect(res.body.barbers[0].waiting.length).toBe(1); // W-03
    expect(res.body.total_waiting_count).toBe(3);
    expect(res.body.active_barbers_count).toBe(1);
    expect(res.body.wait_times.general_wait_minutes).toBeGreaterThan(0);
  });

  it('manually assigns general queue entry to a specific barber', async () => {
    const floorBefore = await request(app)
      .get(`/salon/branches/${branchId}/live-floor`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    const generalEntry = floorBefore.body.general_queue[0];
    expect(generalEntry).toBeDefined();

    const assignRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/${generalEntry.id}/assign`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ target_barber_id: barberId });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.entry.barber_id).toBe(barberId);
    expect(assignRes.body.entry.queue_type).toBe('BARBER');

    // General queue count should now be 1
    const floorAfter = await request(app)
      .get(`/salon/branches/${branchId}/live-floor`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(floorAfter.body.general_queue.length).toBe(1);
    expect(floorAfter.body.barbers[0].waiting.length).toBe(2);
  });
});
