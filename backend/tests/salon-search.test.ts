import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEV_FIXED_OTP } from '../src/modules/auth/service.js';

const { config } = await import('../src/config/index.js');
const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { runSeed } = await import('../src/db/seed.js');
const app = createApp();

let customerToken: string;

beforeAll(async () => {
  // Ensure development seed data is populated
  process.env.NODE_ENV = 'development';
  (config as any).NODE_ENV = 'development';
  await runSeed();

  // Login as Customer Nimal (0770000100)
  const loginRes = await request(app)
    .post('/auth/otp/verify')
    .send({ phone: '0770000100', code: DEV_FIXED_OTP })
    .expect(200);

  customerToken = loginRes.body.accessToken;
});

afterAll(async () => {
  await pool.end();
});

describe('Customer Salon Discovery & Search API', () => {
  it('returns all active salon branches when customer queries /salon/search without parameters', async () => {
    const res = await request(app)
      .get('/salon/search')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.salons).toBeDefined();
    expect(res.body.salons.length).toBeGreaterThanOrEqual(2);

    const names = res.body.salons.map((s: any) => `${s.business_name} - ${s.branch_name}`);
    expect(names).toContain("Kasun's Salon - Colombo");
    expect(names).toContain("Kasun's Salon - Kandy");

    // Verify services and working hours are populated
    const colombo = res.body.salons.find((s: any) => s.branch_name === 'Colombo');
    expect(colombo.services.length).toBe(4);
    expect(colombo.working_hours.length).toBe(7);
    expect(colombo.active_barbers_count).toBe(1);
    expect(colombo.lat).toBeCloseTo(6.9271, 2);
    expect(colombo.lng).toBeCloseTo(79.8612, 2);
  });

  it('filters salons by search query text', async () => {
    // Search for Colombo
    const colomboRes = await request(app)
      .get('/salon/search?query=Colombo')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(colomboRes.body.salons.length).toBeGreaterThanOrEqual(1);
    expect(colomboRes.body.salons.some((s: any) => s.branch_name === 'Colombo')).toBe(true);

    // Search for Kandy
    const kandyRes = await request(app)
      .get('/salon/search?query=Kandy')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(kandyRes.body.salons.some((s: any) => s.branch_name === 'Kandy')).toBe(true);

    // Search for Kasun matches both
    const kasunRes = await request(app)
      .get('/salon/search?query=Kasun')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(kasunRes.body.salons.length).toBeGreaterThanOrEqual(2);

    // Search for non-existent salon returns empty list
    const noneRes = await request(app)
      .get('/salon/search?query=NonExistentSalonXYZ')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(noneRes.body.salons.length).toBe(0);
  });

  it('calculates distance and sorts by location proximity', async () => {
    // Search near Colombo coordinates: lat 6.93, lng 79.85
    const res = await request(app)
      .get('/salon/search?lat=6.93&lng=79.85&radius_km=30')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    // Colombo is within 30km, Kandy is >100km away
    expect(res.body.salons.length).toBe(1);
    expect(res.body.salons[0].branch_name).toBe('Colombo');
    expect(res.body.salons[0].distance_km).toBeLessThan(10);
  });
});
