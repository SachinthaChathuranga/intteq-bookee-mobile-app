import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { phone: string; message: string }[] = [];
vi.mock('../src/services/sms/index.js', () => ({
  smsService: {
    sendSms: async (phone: string, message: string) => {
      sent.push({ phone, message });
    },
  },
}));

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const app = createApp();

const PHONE = '0771110000';
const NORMALISED = '94771110000';
const lastCode = () => /(\d{6})/.exec(sent.at(-1)!.message)![1]!;

async function login() {
  await request(app).post('/auth/otp/request').send({ phone: PHONE }).expect(204);
  const res = await request(app)
    .post('/auth/otp/verify')
    .send({ phone: PHONE, code: lastCode() })
    .expect(200);
  return res.body as { accessToken: string; refreshToken: string; isNewUser: boolean };
}

beforeEach(async () => {
  sent.length = 0;
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM otp_codes');
  await pool.query('DELETE FROM users WHERE phone = $1', [NORMALISED]);
});

afterAll(async () => {
  await pool.end();
});

describe('auth', () => {
  it('rejects an invalid phone', async () => {
    await request(app).post('/auth/otp/request').send({ phone: '123' }).expect(400);
  });

  it('enforces the resend cooldown', async () => {
    await request(app).post('/auth/otp/request').send({ phone: PHONE }).expect(204);
    await request(app).post('/auth/otp/request').send({ phone: PHONE }).expect(429);
  });

  it('creates a user on first verify and flags isNewUser', async () => {
    const session = await login();
    expect(session.isNewUser).toBe(true);
    expect(sent[0]!.phone).toBe(NORMALISED);
  });

  it('rejects a wrong code and locks after 5 attempts', async () => {
    await request(app).post('/auth/otp/request').send({ phone: PHONE }).expect(204);
    const good = lastCode();
    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await request(app).post('/auth/otp/verify').send({ phone: PHONE, code: wrong }).expect(400);
    }
    await request(app).post('/auth/otp/verify').send({ phone: PHONE, code: good }).expect(400);
  });

  it('rotates refresh tokens and revokes everything on reuse', async () => {
    const { refreshToken } = await login();
    const rotated = await request(app).post('/auth/refresh').send({ refreshToken }).expect(200);
    await request(app).post('/auth/refresh').send({ refreshToken }).expect(401);
    // reuse detection revoked the whole chain
    await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('serves and updates /me', async () => {
    const { accessToken } = await login();
    await request(app).get('/me').expect(401);
    const me = await request(app).get('/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(me.body.user.phone).toBe(NORMALISED);
    expect(me.body.roles).toEqual([]);
    const patched = await request(app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Kasun', language: 'si', theme: 'dark' })
      .expect(200);
    expect(patched.body.user).toMatchObject({ name: 'Kasun', language: 'si', theme: 'dark' });
  });

  it('revokes the refresh token on logout', async () => {
    const { refreshToken } = await login();
    await request(app).post('/auth/logout').send({ refreshToken }).expect(204);
    await request(app).post('/auth/refresh').send({ refreshToken }).expect(401);
  });
});
