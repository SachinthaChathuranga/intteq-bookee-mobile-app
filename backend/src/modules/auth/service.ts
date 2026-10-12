import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { pool, withTransaction, type Queryable } from '../../db/pool.js';
import { HttpError } from '../../middleware/index.js';
import { smsService } from '../../services/sms/index.js';
import { findUserById, type UserRow } from '../users/repo.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hmac = (value: string) =>
  crypto.createHmac('sha256', config.OTP_HMAC_SECRET).update(value).digest('hex');
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export const DEV_TEST_PHONES = new Set([
  '94770000100', // Customer: Nimal
  '94770000200', // Owner: Kasun
  '94770000300', // Barber: Amal
  '94770000400', // Receptionist: Saman
  '94770000500', // Super Admin
]);
export const DEV_FIXED_OTP = '123456';

export async function requestOtp(phone: string): Promise<void> {
  const isDevTestNumber = config.NODE_ENV === 'development' && DEV_TEST_PHONES.has(phone);

  if (!isDevTestNumber) {
    const { rows } = await pool.query<{ created_at: Date }>(
      'SELECT created_at FROM otp_codes WHERE phone = $1 ORDER BY created_at DESC LIMIT 1',
      [phone],
    );
    const last = rows[0];
    if (last && Date.now() - last.created_at.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpError(429, 'OTP_COOLDOWN');
    }
  }

  const code = isDevTestNumber ? DEV_FIXED_OTP : crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await pool.query('INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1, $2, $3)', [
    phone,
    hmac(`${phone}:${code}`),
    new Date(Date.now() + OTP_TTL_MS),
  ]);

  if (!isDevTestNumber) {
    await smsService.sendSms(phone, `Your ${config.APP_NAME} code is ${code}. It expires in 5 minutes.`);
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: UserRow;
  isNewUser: boolean;
}

function signAccessToken(userId: string): string {
  return jwt.sign({}, config.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: config.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
}

async function issueRefreshToken(
  client: Queryable,
  userId: string,
): Promise<{ token: string; id: string }> {
  const token = crypto.randomBytes(48).toString('base64url');
  const expires = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
    [userId, sha256(token), expires],
  );
  return { token, id: rows[0]!.id };
}

export async function verifyOtp(phone: string, code: string): Promise<Session> {
  return withTransaction(async (client) => {
    const isDevTestNumber = config.NODE_ENV === 'development' && DEV_TEST_PHONES.has(phone);

    if (isDevTestNumber) {
      if (code !== DEV_FIXED_OTP) {
        throw new HttpError(400, 'OTP_INVALID');
      }
      await client.query(
        'UPDATE otp_codes SET consumed_at = now() WHERE phone = $1 AND consumed_at IS NULL',
        [phone],
      );
    } else {
      const { rows } = await client.query<{
        id: string;
        code_hash: string;
        attempts: number;
      }>(
        `SELECT id, code_hash, attempts FROM otp_codes
         WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [phone],
      );
      const otp = rows[0];
      if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(400, 'OTP_INVALID');

      const expected = Buffer.from(otp.code_hash);
      const actual = Buffer.from(hmac(`${phone}:${code}`));
      const ok = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
      if (!ok) {
        await client.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
        await client.query('COMMIT');
        await client.query('BEGIN');
        throw new HttpError(400, 'OTP_INVALID');
      }
      await client.query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [otp.id]);
    }

    // Claim an existing walk-in profile or create a new user (SPEC §8).
    const existing = await client.query<UserRow>('SELECT * FROM users WHERE phone = $1', [phone]);
    let user: UserRow;
    let isNewUser: boolean;
    if (existing.rows[0]) {
      const updated = await client.query<UserRow>(
        'UPDATE users SET is_app_user = true WHERE id = $1 RETURNING *',
        [existing.rows[0].id],
      );
      user = updated.rows[0]!;
      isNewUser = !user.name;
    } else {
      const created = await client.query<UserRow>(
        'INSERT INTO users (phone, is_app_user) VALUES ($1, true) RETURNING *',
        [phone],
      );
      user = created.rows[0]!;
      isNewUser = true;
    }

    const refresh = await issueRefreshToken(client, user.id);
    return { accessToken: signAccessToken(user.id), refreshToken: refresh.token, user, isNewUser };
  });
}

export async function refreshSession(refreshToken: string) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>('SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE', [
      sha256(refreshToken),
    ]);
    const row = rows[0];
    if (!row) throw new HttpError(401, 'INVALID_REFRESH_TOKEN');
    if (row.revoked_at) {
      // Reuse of a rotated token: revoke every active token for this user.
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [row.user_id],
      );
      await client.query('COMMIT');
      await client.query('BEGIN');
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN');
    }
    if (row.expires_at.getTime() < Date.now()) throw new HttpError(401, 'INVALID_REFRESH_TOKEN');

    const next = await issueRefreshToken(client, row.user_id);
    await client.query('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1', [
      row.id,
      next.id,
    ]);
    const user = await findUserById(row.user_id, client);
    if (!user) throw new HttpError(401, 'INVALID_REFRESH_TOKEN');
    return { accessToken: signAccessToken(user.id), refreshToken: next.token };
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [sha256(refreshToken)],
  );
}
