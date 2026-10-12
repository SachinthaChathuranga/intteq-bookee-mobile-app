import type { Queryable } from '../../db/pool.js';
import { pool } from '../../db/pool.js';

export interface BusinessRow {
  id: string;
  owner_id: string;
  type: 'SALON';
  name: string;
  logo_url: string | null;
  status: 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

/** Generic Business repo — no salon-specific assumptions (SPEC §1.2). */
export async function findBusinessById(id: string, db: Queryable = pool): Promise<BusinessRow | null> {
  const { rows } = await db.query<BusinessRow>('SELECT * FROM businesses WHERE id = $1', [id]);
  return rows[0] ?? null;
}
