import crypto from 'node:crypto';
import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';

export interface BarberDetailRow {
  id: string; // barber_branches.id
  barber_id: string;
  branch_id: string;
  name: string | null;
  phone: string;
  avatar_url: string | null;
  commission_type: 'PERCENT' | 'FIXED';
  commission_value: number;
  is_active: boolean;
  bio: string | null;
  avg_rating: string;
  rating_count: number;
  created_at: Date;
}

export interface InviteRow {
  id: string;
  branch_id: string;
  phone: string | null;
  code: string;
  commission_type: 'PERCENT' | 'FIXED';
  commission_value: number;
  expires_at: Date;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  created_at: Date;
}

export async function findBarbersByBranchId(branchId: string, db: Queryable = pool): Promise<BarberDetailRow[]> {
  const { rows } = await db.query<BarberDetailRow>(
    `SELECT 
       bb.id,
       bb.barber_id,
       bb.branch_id,
       u.name,
       u.phone,
       u.avatar_url,
       bb.commission_type,
       bb.commission_value,
       bb.is_active,
       bp.bio,
       COALESCE(bp.avg_rating, 5.00)::text AS avg_rating,
       COALESCE(bp.rating_count, 0) AS rating_count,
       bb.created_at
     FROM barber_branches bb
     JOIN users u ON bb.barber_id = u.id
     LEFT JOIN barber_profiles bp ON u.id = bp.user_id
     WHERE bb.branch_id = $1
     ORDER BY bb.created_at ASC`,
    [branchId],
  );
  return rows;
}

export async function findInvitesByBranchId(branchId: string, db: Queryable = pool): Promise<InviteRow[]> {
  const { rows } = await db.query<InviteRow>(
    `SELECT * FROM invites 
     WHERE branch_id = $1 AND status = 'PENDING' AND expires_at > now()
     ORDER BY created_at DESC`,
    [branchId],
  );
  return rows;
}

export async function findInviteByCode(code: string, db: Queryable = pool): Promise<InviteRow | null> {
  const { rows } = await db.query<InviteRow>(
    'SELECT * FROM invites WHERE code = $1',
    [code.toUpperCase().trim()],
  );
  return rows[0] ?? null;
}

export async function createInvite(
  branchId: string,
  data: { phone?: string | null; commission_type: 'PERCENT' | 'FIXED'; commission_value: number },
  db: Queryable = pool,
): Promise<InviteRow> {
  // Generate random 6-character alphanumeric code
  const code = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  const expiresAt = new Date(Date.now() + 7 * 86_400_000); // 7 days

  const { rows } = await db.query<InviteRow>(
    `INSERT INTO invites (branch_id, phone, code, commission_type, commission_value, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [branchId, data.phone ?? null, code, data.commission_type, data.commission_value, expiresAt],
  );
  return rows[0]!;
}

export async function cancelInvite(inviteId: string, branchId: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(
    "UPDATE invites SET status = 'CANCELLED' WHERE id = $1 AND branch_id = $2 AND status = 'PENDING'",
    [inviteId, branchId],
  );
  return (rowCount ?? 0) > 0;
}

export async function updateBarberBranch(
  branchId: string,
  barberId: string,
  patch: { commission_type?: 'PERCENT' | 'FIXED'; commission_value?: number; is_active?: boolean },
  db: Queryable = pool,
): Promise<BarberDetailRow | null> {
  await db.query(
    `UPDATE barber_branches SET
       commission_type = COALESCE($3, commission_type),
       commission_value = COALESCE($4, commission_value),
       is_active = COALESCE($5, is_active)
     WHERE branch_id = $1 AND barber_id = $2`,
    [
      branchId,
      barberId,
      patch.commission_type ?? null,
      patch.commission_value ?? null,
      patch.is_active !== undefined ? patch.is_active : null,
    ],
  );

  const barbers = await findBarbersByBranchId(branchId, db);
  return barbers.find((b) => b.barber_id === barberId) ?? null;
}

export async function acceptInviteByCode(
  code: string,
  barberUserId: string,
): Promise<{ branchId: string; roleAssignmentId: string }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<InviteRow>(
      `SELECT * FROM invites 
       WHERE code = $1 AND status = 'PENDING' AND expires_at > now()
       FOR UPDATE`,
      [code.toUpperCase().trim()],
    );
    const invite = rows[0];
    if (!invite) throw new Error('INVITE_INVALID');

    // Fetch business_id from branch
    const branchRes = await client.query<{ business_id: string }>(
      'SELECT business_id FROM branches WHERE id = $1',
      [invite.branch_id],
    );
    const branch = branchRes.rows[0];
    if (!branch) throw new Error('BRANCH_NOT_FOUND');

    // Create or update BarberProfile
    await client.query(
      `INSERT INTO barber_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [barberUserId],
    );

    // Create BarberBranch link
    await client.query(
      `INSERT INTO barber_branches (barber_id, branch_id, commission_type, commission_value, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (barber_id, branch_id) DO UPDATE SET
         commission_type = EXCLUDED.commission_type,
         commission_value = EXCLUDED.commission_value,
         is_active = true`,
      [barberUserId, invite.branch_id, invite.commission_type, invite.commission_value],
    );

    // Create RoleAssignment (role: BARBER)
    const roleRes = await client.query<{ id: string }>(
      `INSERT INTO role_assignments (user_id, role, business_id, branch_id)
       VALUES ($1, 'BARBER', $2, $3)
       RETURNING id`,
      [barberUserId, branch.business_id, invite.branch_id],
    );

    // Mark invite accepted
    await client.query("UPDATE invites SET status = 'ACCEPTED' WHERE id = $1", [invite.id]);

    return {
      branchId: invite.branch_id,
      roleAssignmentId: roleRes.rows[0]!.id,
    };
  });
}
