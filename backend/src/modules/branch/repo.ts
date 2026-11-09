import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';

export interface BranchRow {
  id: string;
  business_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  cover_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkingHoursRow {
  id: string;
  branch_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkingHoursInput {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface ServiceRow {
  id: string;
  branch_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function isBranchOwnedByUser(branchId: string, userId: string, db: Queryable = pool): Promise<boolean> {
  const { rows } = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM branches b
       JOIN businesses biz ON b.business_id = biz.id
       WHERE b.id = $1 AND biz.owner_id = $2
     ) AS exists`,
    [branchId, userId],
  );
  return rows[0]?.exists ?? false;
}

export async function findBranchesByOwnerId(ownerId: string, db: Queryable = pool): Promise<BranchRow[]> {
  const { rows } = await db.query<BranchRow>(
    `SELECT b.* FROM branches b
     JOIN businesses biz ON b.business_id = biz.id
     WHERE biz.owner_id = $1
     ORDER BY b.created_at ASC`,
    [ownerId],
  );
  return rows;
}

export async function findBranchById(branchId: string, db: Queryable = pool): Promise<BranchRow | null> {
  const { rows } = await db.query<BranchRow>('SELECT * FROM branches WHERE id = $1', [branchId]);
  return rows[0] ?? null;
}

export async function createBranch(
  businessId: string,
  data: {
    name: string;
    address: string;
    phone?: string | null;
    lat?: number | null;
    lng?: number | null;
    cover_image_url?: string | null;
  },
  hours?: WorkingHoursInput[],
): Promise<BranchRow> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<BranchRow>(
      `INSERT INTO branches (business_id, name, address, phone, lat, lng, cover_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        businessId,
        data.name,
        data.address,
        data.phone ?? null,
        data.lat ?? null,
        data.lng ?? null,
        data.cover_image_url ?? null,
      ],
    );
    const branch = rows[0]!;

    // Seed default 7-day schedule (0 = Sunday .. 6 = Saturday) if not provided
    const scheduleToInsert = hours && hours.length === 7 ? hours : [
      { day_of_week: 0, open_time: '09:00', close_time: '18:00', is_closed: true },  // Sunday default closed or customized
      { day_of_week: 1, open_time: '09:00', close_time: '19:00', is_closed: false },
      { day_of_week: 2, open_time: '09:00', close_time: '19:00', is_closed: false },
      { day_of_week: 3, open_time: '09:00', close_time: '19:00', is_closed: false },
      { day_of_week: 4, open_time: '09:00', close_time: '19:00', is_closed: false },
      { day_of_week: 5, open_time: '09:00', close_time: '19:00', is_closed: false },
      { day_of_week: 6, open_time: '09:00', close_time: '19:00', is_closed: false },
    ];

    for (const item of scheduleToInsert) {
      await client.query(
        `INSERT INTO working_hours (branch_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, $3, $4, $5)`,
        [branch.id, item.day_of_week, item.open_time, item.close_time, item.is_closed],
      );
    }

    return branch;
  });
}

export async function updateBranch(
  branchId: string,
  data: Partial<{
    name: string;
    address: string;
    phone: string | null;
    lat: number | null;
    lng: number | null;
    cover_image_url: string | null;
  }>,
  db: Queryable = pool,
): Promise<BranchRow | null> {
  const { rows } = await db.query<BranchRow>(
    `UPDATE branches SET
       name = COALESCE($2, name),
       address = COALESCE($3, address),
       phone = COALESCE($4, phone),
       lat = COALESCE($5, lat),
       lng = COALESCE($6, lng),
       cover_image_url = COALESCE($7, cover_image_url)
     WHERE id = $1
     RETURNING *`,
    [
      branchId,
      data.name ?? null,
      data.address ?? null,
      data.phone ?? null,
      data.lat ?? null,
      data.lng ?? null,
      data.cover_image_url ?? null,
    ],
  );
  return rows[0] ?? null;
}

export async function findWorkingHoursByBranchId(branchId: string, db: Queryable = pool): Promise<WorkingHoursRow[]> {
  const { rows } = await db.query<WorkingHoursRow>(
    'SELECT * FROM working_hours WHERE branch_id = $1 ORDER BY day_of_week ASC',
    [branchId],
  );
  return rows;
}

export async function upsertWorkingHours(
  branchId: string,
  hours: WorkingHoursInput[],
  db: Queryable = pool,
): Promise<WorkingHoursRow[]> {
  return withTransaction(async (client) => {
    for (const h of hours) {
      await client.query(
        `INSERT INTO working_hours (branch_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (branch_id, day_of_week) DO UPDATE SET
           open_time = EXCLUDED.open_time,
           close_time = EXCLUDED.close_time,
           is_closed = EXCLUDED.is_closed`,
        [branchId, h.day_of_week, h.open_time, h.close_time, h.is_closed],
      );
    }
    const { rows } = await client.query<WorkingHoursRow>(
      'SELECT * FROM working_hours WHERE branch_id = $1 ORDER BY day_of_week ASC',
      [branchId],
    );
    return rows;
  });
}

export async function findServicesByBranchId(
  branchId: string,
  onlyActive = false,
  db: Queryable = pool,
): Promise<ServiceRow[]> {
  const query = onlyActive
    ? 'SELECT * FROM services WHERE branch_id = $1 AND is_active = true ORDER BY name ASC'
    : 'SELECT * FROM services WHERE branch_id = $1 ORDER BY name ASC';
  const { rows } = await db.query<ServiceRow>(query, [branchId]);
  return rows;
}

export async function createService(
  branchId: string,
  data: { name: string; price: number; duration_minutes: number },
  db: Queryable = pool,
): Promise<ServiceRow> {
  const { rows } = await db.query<ServiceRow>(
    `INSERT INTO services (branch_id, name, price, duration_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [branchId, data.name, data.price, data.duration_minutes],
  );
  return rows[0]!;
}

export async function updateService(
  serviceId: string,
  data: Partial<{ name: string; price: number; duration_minutes: number; is_active: boolean }>,
  db: Queryable = pool,
): Promise<ServiceRow | null> {
  const { rows } = await db.query<ServiceRow>(
    `UPDATE services SET
       name = COALESCE($2, name),
       price = COALESCE($3, price),
       duration_minutes = COALESCE($4, duration_minutes),
       is_active = COALESCE($5, is_active)
     WHERE id = $1
     RETURNING *`,
    [
      serviceId,
      data.name ?? null,
      data.price ?? null,
      data.duration_minutes ?? null,
      data.is_active ?? null,
    ],
  );
  return rows[0] ?? null;
}
