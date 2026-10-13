import type { Queryable } from '../../db/pool.js';
import { pool } from '../../db/pool.js';

export interface FavouriteItem {
  id: string;
  customer_id: string;
  type: 'SALON' | 'BARBER';
  target_id: string;
  created_at: Date;
}

export async function listFavourites(
  customerId: string,
  db: Queryable = pool,
): Promise<FavouriteItem[]> {
  const { rows } = await db.query<FavouriteItem>(
    `SELECT id, customer_id, type, target_id, created_at
     FROM favourites
     WHERE customer_id = $1
     ORDER BY created_at DESC`,
    [customerId],
  );
  return rows;
}

export async function addFavourite(
  customerId: string,
  type: 'SALON' | 'BARBER',
  targetId: string,
  db: Queryable = pool,
): Promise<{ id: string }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO favourites (customer_id, type, target_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (customer_id, type, target_id) DO UPDATE
     SET created_at = favourites.created_at
     RETURNING id`,
    [customerId, type, targetId],
  );
  return rows[0]!;
}

export async function removeFavourite(
  customerId: string,
  type: 'SALON' | 'BARBER',
  targetId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM favourites
     WHERE customer_id = $1 AND type = $2 AND target_id = $3`,
    [customerId, type, targetId],
  );
  return (rowCount ?? 0) > 0;
}
