import type { Queryable } from '../../db/pool.js';
import { pool } from '../../db/pool.js';

export interface DeviceTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  created_at: Date;
  updated_at: Date;
}

export async function saveDeviceToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  db: Queryable = pool,
): Promise<DeviceTokenRow> {
  const { rows } = await db.query<DeviceTokenRow>(
    `INSERT INTO device_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           platform = EXCLUDED.platform,
           updated_at = now()
     RETURNING *`,
    [userId, token, platform],
  );
  return rows[0]!;
}

export async function deleteDeviceToken(token: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM device_tokens WHERE token = $1', [token]);
  return (rowCount ?? 0) > 0;
}

export async function deleteUserDeviceTokens(userId: string, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM device_tokens WHERE user_id = $1', [userId]);
  return rowCount ?? 0;
}

export async function getUserDeviceTokens(
  userId: string,
  db: Queryable = pool,
): Promise<DeviceTokenRow[]> {
  const { rows } = await db.query<DeviceTokenRow>(
    'SELECT * FROM device_tokens WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId],
  );
  return rows;
}

export async function getUsersDeviceTokens(
  userIds: string[],
  db: Queryable = pool,
): Promise<DeviceTokenRow[]> {
  if (userIds.length === 0) return [];
  const { rows } = await db.query<DeviceTokenRow>(
    'SELECT * FROM device_tokens WHERE user_id = ANY($1) ORDER BY updated_at DESC',
    [userIds],
  );
  return rows;
}
