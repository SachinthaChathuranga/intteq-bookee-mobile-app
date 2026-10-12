import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config/index.js';
import { DEV_FIXED_OTP } from '../src/modules/auth/service.js';

const sentSms: { phone: string; message: string }[] = [];
vi.mock('../src/services/sms/index.js', () => ({
  smsService: {
    sendSms: async (phone: string, message: string) => {
      sentSms.push({ phone, message });
    },
  },
}));

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { runSeed } = await import('../src/db/seed.js');
const app = createApp();

beforeAll(async () => {
  // Test refusal when NODE_ENV is 'test'
  await expect(runSeed()).rejects.toThrow('REFUSE_SEED_NON_DEV');

  // Temporarily enable development mode to execute seed
  process.env.NODE_ENV = 'development';
  (config as any).NODE_ENV = 'development';

  await runSeed();
});

afterAll(async () => {
  await pool.end();
});

describe('Development Seed Accounts & Fixed OTP', () => {
  it('accepts fixed OTP 123456 for test customer without sending SMS in development', async () => {
    sentSms.length = 0;
    const phone = '0770000100';

    // 1. Request OTP
    await request(app).post('/auth/otp/request').send({ phone }).expect(204);
    // Verified: No SMS was sent
    expect(sentSms.length).toBe(0);

    // 2. Reject wrong code
    await request(app).post('/auth/otp/verify').send({ phone, code: '999999' }).expect(400);

    // 3. Accept fixed OTP 123456
    const res = await request(app).post('/auth/otp/verify').send({ phone, code: DEV_FIXED_OTP }).expect(200);
    expect(res.body.user.name).toBe('Nimal');
    expect(res.body.user.phone).toBe('94770000100');
  });

  it('authenticates Owner Kasun with OWNER role on Kasun Salon', async () => {
    const res = await request(app)
      .post('/auth/otp/verify')
      .send({ phone: '0770000200', code: DEV_FIXED_OTP })
      .expect(200);

    expect(res.body.user.name).toBe('Kasun');
    const token = res.body.accessToken;

    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(meRes.body.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'OWNER',
          business_name: "Kasun's Salon",
        }),
      ]),
    );
  });

  it('authenticates Barber Amal with BARBER role on both Colombo and Kandy branches', async () => {
    const res = await request(app)
      .post('/auth/otp/verify')
      .send({ phone: '0770000300', code: DEV_FIXED_OTP })
      .expect(200);

    expect(res.body.user.name).toBe('Amal');
    const token = res.body.accessToken;

    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    const barberRoles = meRes.body.roles.filter((r: any) => r.role === 'BARBER');
    expect(barberRoles.length).toBe(2);
    const branchNames = barberRoles.map((r: any) => r.branch_name).sort();
    expect(branchNames).toEqual(['Colombo', 'Kandy']);
  });

  it('authenticates Receptionist Saman with RECEPTIONIST role on Colombo branch', async () => {
    const res = await request(app)
      .post('/auth/otp/verify')
      .send({ phone: '0770000400', code: DEV_FIXED_OTP })
      .expect(200);

    expect(res.body.user.name).toBe('Saman');
    const token = res.body.accessToken;

    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(meRes.body.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'RECEPTIONIST',
          branch_name: 'Colombo',
        }),
      ]),
    );
  });

  it('authenticates Super Admin with SUPER_ADMIN role', async () => {
    const res = await request(app)
      .post('/auth/otp/verify')
      .send({ phone: '0770000500', code: DEV_FIXED_OTP })
      .expect(200);

    expect(res.body.user.name).toBe('Super Admin');
    const token = res.body.accessToken;

    const meRes = await request(app).get('/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(meRes.body.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'SUPER_ADMIN',
          business_id: null,
        }),
      ]),
    );
  });

  it('proves fixed OTP bypass is impossible in production', async () => {
    // Switch to production
    process.env.NODE_ENV = 'production';
    (config as any).NODE_ENV = 'production';

    // Trying to use 123456 without a real OTP record must fail in production
    await request(app)
      .post('/auth/otp/verify')
      .send({ phone: '0770000100', code: DEV_FIXED_OTP })
      .expect(400);

    // Reset back
    process.env.NODE_ENV = 'development';
    (config as any).NODE_ENV = 'development';
  });
});
