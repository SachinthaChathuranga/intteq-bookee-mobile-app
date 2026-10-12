import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import { pool } from '../src/db/pool.js';

function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET);
}

describe('Milestone 4: Barber Shifts & Queue System', () => {
  const app = createApp();
  const PHONES = ['94770000001', '94770000002', '94770000003'];

  let ownerToken: string;
  let ownerId: string;
  let barber1Token: string;
  let barber1Id: string;
  let barber2Token: string;
  let barber2Id: string;

  let branchId: string;
  let haircutServiceId: string;
  let beardServiceId: string;

  beforeAll(async () => {
    // Clean up previous runs
    await pool.query('DELETE FROM users WHERE phone = ANY($1)', [PHONES]);

    // 1. Create owner user
    const ownerRes = await pool.query(
      "INSERT INTO users (phone, name) VALUES ('94770000001', 'Test Owner') RETURNING id",
    );
    ownerId = ownerRes.rows[0].id;
    ownerToken = signToken(ownerId);

    // 2. Create barber 1 & barber 2
    const b1Res = await pool.query(
      "INSERT INTO users (phone, name) VALUES ('94770000002', 'Barber Amal') RETURNING id",
    );
    barber1Id = b1Res.rows[0].id;
    barber1Token = signToken(barber1Id);

    const b2Res = await pool.query(
      "INSERT INTO users (phone, name) VALUES ('94770000003', 'Barber Kasun') RETURNING id",
    );
    barber2Id = b2Res.rows[0].id;
    barber2Token = signToken(barber2Id);

    // 3. Create business
    const bizRes = await pool.query(
      "INSERT INTO businesses (owner_id, name, type) VALUES ($1, 'Amal Salon', 'SALON') RETURNING id",
      [ownerId],
    );
    const businessId = bizRes.rows[0].id;

    // 4. Create branch
    const branchRes = await pool.query(
      "INSERT INTO branches (business_id, name, address, phone) VALUES ($1, 'Kandy Branch', '12 Lake Rd', '0812345678') RETURNING id",
      [businessId],
    );
    branchId = branchRes.rows[0].id;

    // 5. Add services
    const s1Res = await pool.query(
      "INSERT INTO services (branch_id, name, price, duration_minutes) VALUES ($1, 'Haircut', 1000.00, 30) RETURNING id",
      [branchId],
    );
    haircutServiceId = s1Res.rows[0].id;

    const s2Res = await pool.query(
      "INSERT INTO services (branch_id, name, price, duration_minutes) VALUES ($1, 'Beard Trim', 500.00, 15) RETURNING id",
      [branchId],
    );
    beardServiceId = s2Res.rows[0].id;

    // 6. Assign barbers to branch with commissions (Amal: 40% percent, Kasun: Rs. 200 fixed)
    await pool.query(
      `INSERT INTO barber_branches (barber_id, branch_id, commission_type, commission_value)
       VALUES ($1, $2, 'PERCENT', 40), ($3, $2, 'FIXED', 200)`,
      [barber1Id, branchId, barber2Id],
    );
  });

  it('handles shift lifecycle: start, pause, resume, and prevented end when queue not empty', async () => {
    // Start shift for Barber Amal
    const startRes = await request(app)
      .post(`/salon/branches/${branchId}/shifts/start`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(startRes.status).toBe(200);
    expect(startRes.body.shift.status).toBe('ACTIVE');

    // Also start shift for Barber Kasun
    await request(app)
      .post(`/salon/branches/${branchId}/shifts/start`)
      .set('Authorization', `Bearer ${barber2Token}`);

    // Check current shift
    const curRes = await request(app)
      .get(`/salon/branches/${branchId}/shifts/current`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(curRes.status).toBe(200);
    expect(curRes.body.shift.status).toBe('ACTIVE');
    expect(curRes.body.on_shift_barbers.length).toBe(2);

    // Pause shift
    const pauseRes = await request(app)
      .post(`/salon/branches/${branchId}/shifts/pause`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.shift.status).toBe('PAUSED');

    // Resume shift
    const resumeRes = await request(app)
      .post(`/salon/branches/${branchId}/shifts/resume`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.shift.status).toBe('ACTIVE');
  });

  it('manages queue operations: enqueue, reorder, call next, complete service with commission', async () => {
    // 1. Enqueue two customers for Barber Amal
    const enq1 = await request(app)
      .post(`/salon/branches/${branchId}/queue/dev-enqueue`)
      .set('Authorization', `Bearer ${barber1Token}`)
      .send({
        customerName: 'Customer John',
        tokenNumber: 'W-01',
        barberId: barber1Id,
        serviceIds: [haircutServiceId],
      });

    expect(enq1.status).toBe(201);
    const entry1Id = enq1.body.entry.id;

    const enq2 = await request(app)
      .post(`/salon/branches/${branchId}/queue/dev-enqueue`)
      .set('Authorization', `Bearer ${barber1Token}`)
      .send({
        customerName: 'Customer Peter',
        tokenNumber: 'W-02',
        barberId: barber1Id,
        serviceIds: [haircutServiceId, beardServiceId],
      });

    expect(enq2.status).toBe(201);
    const entry2Id = enq2.body.entry.id;

    // 2. Barber views queue
    const qRes = await request(app)
      .get(`/salon/branches/${branchId}/queue/barber`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(qRes.status).toBe(200);
    expect(qRes.body.waiting.length).toBe(2);
    expect(qRes.body.serving).toBeNull();

    // 3. Reorder queue (put Peter first)
    const reorderRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/reorder`)
      .set('Authorization', `Bearer ${barber1Token}`)
      .send({ entry_ids: [entry2Id, entry1Id] });

    expect(reorderRes.status).toBe(200);

    // Verify reorder
    const qResAfter = await request(app)
      .get(`/salon/branches/${branchId}/queue/barber`)
      .set('Authorization', `Bearer ${barber1Token}`);
    expect(qResAfter.body.waiting[0].id).toBe(entry2Id);

    // 4. Call Next -> Peter should be called
    const callRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/call-next`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(callRes.status).toBe(200);
    expect(callRes.body.entry.id).toBe(entry2Id);
    expect(callRes.body.entry.status).toBe('CALLED');

    // 5. Attempting to end shift while Peter is called or John is waiting should fail (400 QUEUE_NOT_EMPTY)
    const failEndRes = await request(app)
      .post(`/salon/branches/${branchId}/shifts/end`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(failEndRes.status).toBe(400);
    expect(failEndRes.body.error.code).toBe('QUEUE_NOT_EMPTY');

    // 6. Complete Peter's service (Haircut + Beard = 1500)
    // Amal's commission is 40% -> 40% of 1500 = 600
    const completeRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/${entry2Id}/complete`)
      .set('Authorization', `Bearer ${barber1Token}`)
      .send({
        amount: 1500,
        payment_method: 'CASH',
        tip: 200,
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.entry.status).toBe('COMPLETED');
    expect(completeRes.body.commission_amount).toBe(600);

    // 7. Reassign remaining customer John (entry1Id) to Barber Kasun
    const reassignRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/${entry1Id}/reassign`)
      .set('Authorization', `Bearer ${barber1Token}`)
      .send({ target_barber_id: barber2Id });

    expect(reassignRes.status).toBe(200);
    expect(reassignRes.body.entry.barber_id).toBe(barber2Id);
    expect(reassignRes.body.entry.reassigned_from_barber_id).toBe(barber1Id);

    // 8. Now Barber Amal's queue is completely empty -> End shift succeeds!
    const endRes = await request(app)
      .post(`/salon/branches/${branchId}/shifts/end`)
      .set('Authorization', `Bearer ${barber1Token}`);

    expect(endRes.status).toBe(200);
    expect(endRes.body.summary.shift.status).toBe('ENDED');
    expect(endRes.body.summary.completed_services_count).toBe(1);
    expect(endRes.body.summary.total_revenue).toBe(1500);
    expect(endRes.body.summary.total_commission).toBe(600);
  });

  it('handles general queue pickup (SPEC §6.2 late assignment)', async () => {
    // Barber Kasun is on shift. John is in Kasun's queue from previous test.
    // Kasun calls next -> John
    const call1 = await request(app)
      .post(`/salon/branches/${branchId}/queue/call-next`)
      .set('Authorization', `Bearer ${barber2Token}`);
    expect(call1.status).toBe(200);

    // Kasun completes John
    await request(app)
      .post(`/salon/branches/${branchId}/queue/${call1.body.entry.id}/complete`)
      .set('Authorization', `Bearer ${barber2Token}`)
      .send({ amount: 1000, payment_method: 'CARD' });

    // Enqueue an "Any Barber" (GENERAL queue) customer
    const genEnq = await request(app)
      .post(`/salon/branches/${branchId}/queue/dev-enqueue`)
      .set('Authorization', `Bearer ${barber2Token}`)
      .send({
        customerName: 'General Queue Walk-in',
        queueType: 'GENERAL',
        serviceIds: [haircutServiceId],
      });
    expect(genEnq.status).toBe(201);
    expect(genEnq.body.entry.queue_type).toBe('GENERAL');

    // Kasun calls next with empty own queue -> automatically picks up the general queue customer!
    const callGen = await request(app)
      .post(`/salon/branches/${branchId}/queue/call-next`)
      .set('Authorization', `Bearer ${barber2Token}`);

    expect(callGen.status).toBe(200);
    expect(callGen.body.entry.id).toBe(genEnq.body.entry.id);
    expect(callGen.body.entry.barber_id).toBe(barber2Id);
    expect(callGen.body.entry.status).toBe('CALLED');

    // Mark No Show
    const noShowRes = await request(app)
      .post(`/salon/branches/${branchId}/queue/${callGen.body.entry.id}/no-show`)
      .set('Authorization', `Bearer ${barber2Token}`);

    expect(noShowRes.status).toBe(200);
  });
});
