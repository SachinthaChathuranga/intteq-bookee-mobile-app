import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { runSeed } from '../src/db/seed.js';

const app = createApp();

import { config } from '../src/config/index.js';

let customerToken: string;
let customerId: string;
let colomboBranchId: string;
let barberAmalId: string;
let haircutServiceId: string;
let beardServiceId: string;

beforeAll(async () => {
  process.env.NODE_ENV = 'development';
  (config as any).NODE_ENV = 'development';
  await runSeed();
  await pool.query('DELETE FROM salon_appointments');

  // Login as Customer Nimal (0770000100)
  await request(app).post('/auth/otp/request').send({ phone: '0770000100' });
  const otpRes = await request(app).post('/auth/otp/verify').send({
    phone: '0770000100',
    code: '123456',
  });
  customerToken = otpRes.body.accessToken;
  customerId = otpRes.body.user.id;

  // Fetch Colombo branch and services
  const branchRes = await pool.query<{ id: string }>(
    `SELECT id FROM branches WHERE name = 'Colombo' LIMIT 1`,
  );
  colomboBranchId = branchRes.rows[0]!.id;

  const barberRes = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE phone = '94770000300' LIMIT 1`,
  );
  barberAmalId = barberRes.rows[0]!.id;

  const svcRes = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM services WHERE branch_id = $1`,
    [colomboBranchId],
  );
  haircutServiceId = svcRes.rows.find((s) => s.name === 'Haircut')!.id;
  beardServiceId = svcRes.rows.find((s) => s.name === 'Beard')!.id;
});

describe('Salon Availability & Appointments', () => {
  it('1. GET /salon/branches/:branchId/availability returns slots for open working day', async () => {
    // Pick next Wednesday
    const d = new Date();
    d.setDate(d.getDate() + ((3 + 7 - d.getDay()) % 7 || 7));
    const targetDate = d.toISOString().split('T')[0]!;

    const res = await request(app)
      .get(`/salon/branches/${colomboBranchId}/availability`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({
        date: targetDate,
        serviceIds: `${haircutServiceId},${beardServiceId}`,
      });

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(targetDate);
    expect(res.body.is_closed).toBe(false);
    expect(res.body.open_time).toBe('09:00');
    expect(res.body.close_time).toBe('19:00');
    expect(res.body.total_duration_minutes).toBe(45); // 30 + 15
    expect(res.body.total_price).toBe(800); // 500 + 300
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    expect(res.body.slots[0]).toHaveProperty('time');
    expect(res.body.slots[0]).toHaveProperty('available', true);
  });

  it('2. GET /salon/branches/:branchId/availability returns is_closed for closed day (Sunday)', async () => {
    // Find next Sunday
    const d = new Date();
    d.setDate(d.getDate() + ((0 + 7 - d.getDay()) % 7 || 7));
    const sundayDate = d.toISOString().split('T')[0]!;

    // Set Sunday as closed in working_hours for testing
    await pool.query(
      `UPDATE working_hours SET is_closed = true WHERE branch_id = $1 AND day_of_week = 0`,
      [colomboBranchId],
    );

    const res = await request(app)
      .get(`/salon/branches/${colomboBranchId}/availability`)
      .set('Authorization', `Bearer ${customerToken}`)
      .query({
        date: sundayDate,
        serviceIds: haircutServiceId,
      });

    expect(res.status).toBe(200);
    expect(res.body.is_closed).toBe(true);
    expect(res.body.slots).toEqual([]);
  });

  it('3. POST /salon/branches/:branchId/appointments books appointment with Any Barber (auto-assigned)', async () => {
    // A future date slot at 11:00 AM
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const dateStr = d.toISOString().split('T')[0]!;
    const startAt = `${dateStr}T11:00:00+05:30`;

    const res = await request(app)
      .post(`/salon/branches/${colomboBranchId}/appointments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingMode: 'ANY',
        serviceIds: [haircutServiceId],
        startAt,
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.appointment.barber_id).toBe(barberAmalId); // Amal auto-assigned
    expect(res.body.appointment.barber_name).toBe('Amal');
    expect(res.body.appointment.status).toBe('CONFIRMED');
    expect(res.body.appointment.total_price).toBe(500);
    expect(res.body.appointment.total_duration_minutes).toBe(30);
  });

  it('4. Double-booking prevention: concurrent attempt for same barber & overlapping slot fails with 409', async () => {
    const d = new Date();
    d.setDate(d.getDate() + 11);
    const dateStr = d.toISOString().split('T')[0]!;
    const startAt = `${dateStr}T14:00:00+05:30`;

    // First booking succeeds
    const firstRes = await request(app)
      .post(`/salon/branches/${colomboBranchId}/appointments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        barberId: barberAmalId,
        bookingMode: 'SPECIFIC',
        serviceIds: [haircutServiceId],
        startAt,
      });
    expect(firstRes.status).toBe(201);

    // Second booking overlapping exactly the same time slot fails with 409
    const secondRes = await request(app)
      .post(`/salon/branches/${colomboBranchId}/appointments`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        barberId: barberAmalId,
        bookingMode: 'SPECIFIC',
        serviceIds: [haircutServiceId],
        startAt,
      });
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });

  it('5. POST /salon/branches/:branchId/queue/join allows customer to join live queue (Now)', async () => {
    const res = await request(app)
      .post(`/salon/branches/${colomboBranchId}/queue/join`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceIds: [haircutServiceId],
        barberId: null, // General queue
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^W-\d+/);
    expect(res.body.queue_type).toBe('GENERAL');
    expect(res.body.estimated_wait_minutes).toBeGreaterThan(0);
  });

  it('6. GET /salon/barbers/:barberId/today-branch returns barber assigned branch', async () => {
    const res = await request(app)
      .get(`/salon/barbers/${barberAmalId}/today-branch`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.branch_id).toBe(colomboBranchId);
    expect(res.body.branch_name).toBe('Colombo');
    expect(res.body.business_name).toBe("Kasun's Salon");
  });

  it('7. GET /salon/branches/:branchId/services returns active services for customers', async () => {
    const res = await request(app)
      .get(`/salon/branches/${colomboBranchId}/services`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services.length).toBe(4);
    expect(res.body.services.some((s: any) => s.name === 'Haircut')).toBe(true);
  });

  it('8. GET /salon/branches/:branchId/barbers-list returns active barbers for customers', async () => {
    const res = await request(app)
      .get(`/salon/branches/${colomboBranchId}/barbers-list`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.barbers)).toBe(true);
    expect(res.body.barbers.length).toBeGreaterThanOrEqual(1);
    expect(res.body.barbers[0]).toHaveProperty('id');
    expect(res.body.barbers[0]).toHaveProperty('name');
    expect(res.body.barbers[0]).toHaveProperty('is_working_today');
    expect(res.body.barbers[0]).toHaveProperty('offered_service_ids');
  });

  it('9. POST /salon/appointments/:id/reschedule updates appointment start_at and status to RESCHEDULED', async () => {
    // Fetch customer's appointments
    const listRes = await request(app)
      .get('/salon/customer/appointments')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(listRes.status).toBe(200);
    const apt = listRes.body.appointments.find((a: any) => a.status === 'CONFIRMED');
    expect(apt).toBeDefined();
    expect(apt.services[0]).toHaveProperty('id');

    const d = new Date();
    d.setDate(d.getDate() + 12);
    const newDateStr = d.toISOString().split('T')[0]!;
    const newStartAt = `${newDateStr}T10:00:00+05:30`;

    const res = await request(app)
      .post(`/salon/appointments/${apt.id}/reschedule`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ startAt: newStartAt });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('RESCHEDULED');
  });

  it('10. POST /salon/appointments/:id/cancel marks appointment as CANCELLED', async () => {
    const listRes = await request(app)
      .get('/salon/customer/appointments')
      .set('Authorization', `Bearer ${customerToken}`);

    const apt = listRes.body.appointments.find((a: any) => a.status === 'RESCHEDULED');
    expect(apt).toBeDefined();

    const res = await request(app)
      .post(`/salon/appointments/${apt.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.status).toBe('CANCELLED');
  });
});

