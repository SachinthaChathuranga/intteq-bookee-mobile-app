import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';

export interface ShiftRow {
  id: string;
  barber_id: string;
  branch_id: string;
  start_at: Date;
  end_at: Date | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  created_at: Date;
  updated_at: Date;
}

export interface OnShiftBarber {
  barber_id: string;
  name: string | null;
  phone: string;
  avatar_url: string | null;
  status: 'ACTIVE' | 'PAUSED';
  shift_id: string;
}

export interface ShiftSummary {
  shift: ShiftRow;
  duration_minutes: number;
  completed_services_count: number;
  total_revenue: number;
  total_commission: number;
}

export async function findCurrentShift(
  barberId: string,
  branchId: string,
  db: Queryable = pool,
): Promise<ShiftRow | null> {
  const { rows } = await db.query<ShiftRow>(
    `SELECT * FROM salon_shifts 
     WHERE barber_id = $1 AND branch_id = $2 AND status IN ('ACTIVE', 'PAUSED')
     ORDER BY start_at DESC LIMIT 1`,
    [barberId, branchId],
  );
  return rows[0] ?? null;
}

export async function startShift(
  barberId: string,
  branchId: string,
  db: Queryable = pool,
): Promise<ShiftRow> {
  const existing = await findCurrentShift(barberId, branchId, db);
  if (existing) return existing;

  const { rows } = await db.query<ShiftRow>(
    `INSERT INTO salon_shifts (barber_id, branch_id, status, start_at)
     VALUES ($1, $2, 'ACTIVE', now())
     RETURNING *`,
    [barberId, branchId],
  );
  return rows[0]!;
}

export async function pauseShift(
  shiftId: string,
  barberId: string,
  db: Queryable = pool,
): Promise<ShiftRow | null> {
  const { rows } = await db.query<ShiftRow>(
    `UPDATE salon_shifts 
     SET status = 'PAUSED'
     WHERE id = $1 AND barber_id = $2 AND status = 'ACTIVE'
     RETURNING *`,
    [shiftId, barberId],
  );
  return rows[0] ?? null;
}

export async function resumeShift(
  shiftId: string,
  barberId: string,
  db: Queryable = pool,
): Promise<ShiftRow | null> {
  const { rows } = await db.query<ShiftRow>(
    `UPDATE salon_shifts 
     SET status = 'ACTIVE'
     WHERE id = $1 AND barber_id = $2 AND status = 'PAUSED'
     RETURNING *`,
    [shiftId, barberId],
  );
  return rows[0] ?? null;
}

export async function countActiveQueueEntries(
  barberId: string,
  branchId: string,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `SELECT count(*) FROM salon_queue_entries
     WHERE barber_id = $1 AND branch_id = $2 AND status IN ('WAITING', 'CALLED', 'IN_SERVICE')`,
    [barberId, branchId],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function endShift(
  shiftId: string,
  barberId: string,
  branchId: string,
): Promise<ShiftSummary> {
  return withTransaction(async (client) => {
    // 1. Check if queue has waiting/serving customers
    const activeCount = await countActiveQueueEntries(barberId, branchId, client);
    if (activeCount > 0) {
      throw new Error('QUEUE_NOT_EMPTY');
    }

    // 2. Mark shift ended
    const { rows } = await client.query<ShiftRow>(
      `UPDATE salon_shifts
       SET status = 'ENDED', end_at = now()
       WHERE id = $1 AND barber_id = $2 AND status IN ('ACTIVE', 'PAUSED')
       RETURNING *`,
      [shiftId, barberId],
    );

    const shift = rows[0];
    if (!shift) throw new Error('SHIFT_NOT_FOUND');

    return await calculateShiftSummary(shift, client);
  });
}

export async function calculateShiftSummary(
  shift: ShiftRow,
  db: Queryable = pool,
): Promise<ShiftSummary> {
  const endAt = shift.end_at ? new Date(shift.end_at) : new Date();
  const startAt = new Date(shift.start_at);
  const durationMinutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));

  const { rows } = await db.query<{
    count: string;
    total_amount: string;
    total_commission: string;
  }>(
    `SELECT 
       count(*) AS count,
       coalesce(sum(amount), 0) AS total_amount,
       coalesce(sum(commission_amount), 0) AS total_commission
     FROM salon_transactions
     WHERE barber_id = $1 AND branch_id = $2 
       AND completed_at >= $3 AND completed_at <= $4`,
    [shift.barber_id, shift.branch_id, shift.start_at, endAt],
  );

  const stats = rows[0]!;
  return {
    shift,
    duration_minutes: durationMinutes,
    completed_services_count: parseInt(stats.count, 10),
    total_revenue: parseFloat(stats.total_amount),
    total_commission: parseFloat(stats.total_commission),
  };
}

export async function findOnShiftBarbers(
  branchId: string,
  db: Queryable = pool,
): Promise<OnShiftBarber[]> {
  const { rows } = await db.query<OnShiftBarber>(
    `SELECT 
       s.barber_id,
       u.name,
       u.phone,
       u.avatar_url,
       s.status,
       s.id AS shift_id
     FROM salon_shifts s
     JOIN users u ON s.barber_id = u.id
     WHERE s.branch_id = $1 AND s.status IN ('ACTIVE', 'PAUSED')
     ORDER BY s.start_at ASC`,
    [branchId],
  );
  return rows;
}
