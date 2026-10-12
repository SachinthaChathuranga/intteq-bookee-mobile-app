import type { Queryable } from '../../db/pool.js';
import { pool } from '../../db/pool.js';

export interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_app_user: boolean;
  language: 'si' | 'ta' | 'en';
  theme: 'light' | 'dark' | 'system';
  created_at: Date;
  updated_at: Date;
}

export async function findUserById(id: string, db: Queryable = pool): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export interface EnrichedRoleAssignmentRow {
  id: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'RECEPTIONIST' | 'BARBER';
  business_id: string | null;
  business_name: string | null;
  business_type: string | null;
}

export async function findRolesByUserId(userId: string): Promise<EnrichedRoleAssignmentRow[]> {
  const { rows } = await pool.query<EnrichedRoleAssignmentRow>(
    `SELECT 
       ra.id, 
       ra.role, 
       ra.business_id,
       b.name AS business_name,
       b.type AS business_type
     FROM role_assignments ra
     LEFT JOIN businesses b ON ra.business_id = b.id
     WHERE ra.user_id = $1
     ORDER BY ra.created_at ASC`,
    [userId],
  );
  return rows;
}

export async function updateUser(
  id: string,
  patch: { name?: string; language?: UserRow['language']; theme?: UserRow['theme'] },
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET
       name = COALESCE($2, name),
       language = COALESCE($3, language),
       theme = COALESCE($4, theme)
     WHERE id = $1 RETURNING *`,
    [id, patch.name ?? null, patch.language ?? null, patch.theme ?? null],
  );
  return rows[0] ?? null;
}
