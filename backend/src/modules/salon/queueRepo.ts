import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';
import { findOnShiftBarbers } from './shiftRepo.js';

export interface QueueEntryServiceItem {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface QueueEntryDetail {
  id: string;
  branch_id: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  barber_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  walk_in_name: string | null;
  token_number: string | null;
  source: 'APP' | 'WALK_IN_ANON' | 'WALK_IN_VERIFIED' | 'APPOINTMENT';
  manual_position: number | null;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'LEFT';
  joined_at: Date;
  assigned_at: Date | null;
  called_at: Date | null;
  completed_at: Date | null;
  reassigned_from_barber_id: string | null;
  services: QueueEntryServiceItem[];
  total_price: number;
  total_duration: number;
}

interface RawQueueRow {
  id: string;
  branch_id: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  barber_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  walk_in_name: string | null;
  token_number: string | null;
  source: 'APP' | 'WALK_IN_ANON' | 'WALK_IN_VERIFIED' | 'APPOINTMENT';
  manual_position: number | null;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'COMPLETED' | 'NO_SHOW' | 'LEFT';
  joined_at: Date;
  assigned_at: Date | null;
  called_at: Date | null;
  completed_at: Date | null;
  reassigned_from_barber_id: string | null;
  services_json: Array<{
    id: string;
    service_id: string;
    name: string;
    price: string | number;
    duration_minutes: number;
  }> | null;
}

export function mapRawQueueRow(row: any): QueueEntryDetail {
  const services: QueueEntryServiceItem[] = (row.services_json ?? []).map((s: any) => ({
    id: s.id,
    service_id: s.service_id,
    name: s.name,
    price: typeof s.price === 'string' ? parseFloat(s.price) : s.price,
    duration_minutes: s.duration_minutes,
  }));

  const totalPrice = services.reduce((acc: number, s: any) => acc + s.price, 0);
  const totalDuration = services.reduce((acc: number, s: any) => acc + s.duration_minutes, 0);

  return {
    id: row.id,
    branch_id: row.branch_id,
    queue_type: row.queue_type,
    barber_id: row.barber_id,
    barber_name: row.barber_name,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    walk_in_name: row.walk_in_name,
    token_number: row.token_number,
    source: row.source,
    manual_position: row.manual_position,
    status: row.status,
    joined_at: row.joined_at,
    assigned_at: row.assigned_at,
    called_at: row.called_at,
    completed_at: row.completed_at,
    reassigned_from_barber_id: row.reassigned_from_barber_id,
    services,
    total_price: totalPrice,
    total_duration: totalDuration,
  };
}

export const SELECT_QUEUE_DETAILS = `
  SELECT 
    qe.*,
    bu.name AS barber_name,
    cu.name AS customer_name,
    cu.phone AS customer_phone,
    (
      SELECT json_agg(
        json_build_object(
          'id', qes.id,
          'service_id', qes.service_id,
          'name', s.name,
          'price', qes.price,
          'duration_minutes', qes.duration_minutes
        )
      )
      FROM salon_queue_entry_services qes
      JOIN services s ON qes.service_id = s.id
      WHERE qes.queue_entry_id = qe.id
    ) AS services_json
  FROM salon_queue_entries qe
  LEFT JOIN users bu ON qe.barber_id = bu.id
  LEFT JOIN users cu ON qe.customer_id = cu.id
`;

export async function findBarberQueue(
  barberId: string,
  branchId: string,
  db: Queryable = pool,
): Promise<{
  serving: QueueEntryDetail | null;
  waiting: QueueEntryDetail[];
  generalCount: number;
}> {
  // 1. Serving customer
  const servingRes = await db.query<RawQueueRow>(
    `${SELECT_QUEUE_DETAILS}
     WHERE qe.barber_id = $1 AND qe.branch_id = $2 
       AND qe.status IN ('CALLED', 'IN_SERVICE')
     ORDER BY qe.called_at ASC LIMIT 1`,
    [barberId, branchId],
  );

  // 2. Waiting in barber's own queue
  const waitingRes = await db.query<RawQueueRow>(
    `${SELECT_QUEUE_DETAILS}
     WHERE qe.barber_id = $1 AND qe.branch_id = $2 
       AND qe.status = 'WAITING'
     ORDER BY qe.manual_position ASC NULLS LAST, qe.joined_at ASC`,
    [barberId, branchId],
  );

  // 3. General queue count for branch
  const generalRes = await db.query<{ count: string }>(
    `SELECT count(*) FROM salon_queue_entries
     WHERE branch_id = $1 AND queue_type = 'GENERAL' AND status = 'WAITING'`,
    [branchId],
  );

  return {
    serving: servingRes.rows[0] ? mapRawQueueRow(servingRes.rows[0]) : null,
    waiting: waitingRes.rows.map(mapRawQueueRow),
    generalCount: parseInt(generalRes.rows[0]?.count ?? '0', 10),
  };
}

export async function callNext(
  barberId: string,
  branchId: string,
): Promise<QueueEntryDetail | null> {
  return withTransaction(async (client) => {
    // 1. Check if already serving
    const currentServing = await client.query<{ id: string }>(
      `SELECT id FROM salon_queue_entries
       WHERE barber_id = $1 AND branch_id = $2 AND status IN ('CALLED', 'IN_SERVICE')
       LIMIT 1`,
      [barberId, branchId],
    );
    if (currentServing.rows.length > 0) {
      const full = await client.query<RawQueueRow>(
        `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
        [currentServing.rows[0]!.id],
      );
      return mapRawQueueRow(full.rows[0]!);
    }

    // 2. Pick next from barber's own queue
    let target = await client.query<{ id: string }>(
      `SELECT id FROM salon_queue_entries
       WHERE barber_id = $1 AND branch_id = $2 AND status = 'WAITING'
       ORDER BY manual_position ASC NULLS LAST, joined_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [barberId, branchId],
    );

    let fromGeneral = false;
    // 3. If own queue empty, pick earliest eligible from general queue (§6.2)
    if (target.rows.length === 0) {
      target = await client.query<{ id: string }>(
        `SELECT id FROM salon_queue_entries
         WHERE branch_id = $1 AND queue_type = 'GENERAL' AND status = 'WAITING'
         ORDER BY joined_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        [branchId],
      );
      fromGeneral = true;
    }

    if (target.rows.length === 0) return null;

    const entryId = target.rows[0]!.id;

    if (fromGeneral) {
      await client.query(
        `UPDATE salon_queue_entries
         SET barber_id = $1, assigned_at = now(), called_at = now(), status = 'CALLED'
         WHERE id = $2`,
        [barberId, entryId],
      );
    } else {
      await client.query(
        `UPDATE salon_queue_entries
         SET called_at = now(), status = 'CALLED'
         WHERE id = $1`,
        [entryId],
      );
    }

    const full = await client.query<RawQueueRow>(
      `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
      [entryId],
    );
    return mapRawQueueRow(full.rows[0]!);
  });
}

export async function completeService(
  barberId: string,
  entryId: string,
  data: {
    amount: number;
    payment_method: 'CASH' | 'CARD' | 'TRANSFER';
    tip?: number;
  },
): Promise<{ entry: QueueEntryDetail; transaction_id: string; commission_amount: number }> {
  return withTransaction(async (client) => {
    // 1. Lock and verify entry directly on salon_queue_entries
    const entryRes = await client.query<{ id: string; branch_id: string; customer_id: string | null }>(
      `SELECT id, branch_id, customer_id FROM salon_queue_entries
       WHERE id = $1 AND barber_id = $2 AND status IN ('CALLED', 'IN_SERVICE')
       FOR UPDATE`,
      [entryId, barberId],
    );
    const entryRow = entryRes.rows[0];
    if (!entryRow) throw new Error('ENTRY_NOT_FOUND');

    // 2. Lookup barber commission
    const commRes = await client.query<{
      commission_type: 'PERCENT' | 'FIXED';
      commission_value: number;
    }>(
      `SELECT commission_type, commission_value FROM barber_branches
       WHERE barber_id = $1 AND branch_id = $2`,
      [barberId, entryRow.branch_id],
    );

    const commSetting = commRes.rows[0];
    let commissionAmount = 0;
    if (commSetting) {
      if (commSetting.commission_type === 'PERCENT') {
        commissionAmount = (data.amount * commSetting.commission_value) / 100;
      } else {
        commissionAmount = commSetting.commission_value;
      }
    }

    // 3. Insert transaction
    const txRes = await client.query<{ id: string }>(
      `INSERT INTO salon_transactions (
         branch_id, barber_id, customer_id, queue_entry_id,
         amount, tip, payment_method, commission_amount, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       RETURNING id`,
      [
        entryRow.branch_id,
        barberId,
        entryRow.customer_id,
        entryRow.id,
        data.amount,
        data.tip ?? 0,
        data.payment_method,
        commissionAmount,
      ],
    );

    // 4. Mark entry COMPLETED
    await client.query(
      `UPDATE salon_queue_entries
       SET status = 'COMPLETED', completed_at = now()
       WHERE id = $1`,
      [entryId],
    );

    const updatedFull = await client.query<RawQueueRow>(
      `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
      [entryId],
    );

    return {
      entry: mapRawQueueRow(updatedFull.rows[0]!),
      transaction_id: txRes.rows[0]!.id,
      commission_amount: commissionAmount,
    };
  });
}

export async function markNoShow(
  barberId: string,
  entryId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE salon_queue_entries
     SET status = 'NO_SHOW'
     WHERE id = $1 AND barber_id = $2 AND status IN ('WAITING', 'CALLED', 'IN_SERVICE')`,
    [entryId, barberId],
  );
  return (rowCount ?? 0) > 0;
}

export async function markLeft(
  barberId: string,
  entryId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE salon_queue_entries
     SET status = 'LEFT'
     WHERE id = $1 AND barber_id = $2 AND status = 'WAITING'`,
    [entryId, barberId],
  );
  return (rowCount ?? 0) > 0;
}

export async function reassignQueueEntry(
  callerBarberId: string,
  entryId: string,
  targetBarberId: string,
  db: Queryable = pool,
): Promise<QueueEntryDetail | null> {
  const { rows } = await db.query<RawQueueRow>(
    `UPDATE salon_queue_entries
     SET barber_id = $3,
         reassigned_from_barber_id = $2,
         manual_position = NULL
     WHERE id = $1 AND (barber_id = $2 OR queue_type = 'GENERAL') AND status = 'WAITING'
     RETURNING *`,
    [entryId, callerBarberId, targetBarberId],
  );

  if (rows.length === 0) return null;

  const full = await db.query<RawQueueRow>(
    `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
    [entryId],
  );
  return full.rows[0] ? mapRawQueueRow(full.rows[0]) : null;
}

export async function autoReassignAll(
  callerBarberId: string,
  branchId: string,
): Promise<{ reassigned_count: number }> {
  return withTransaction(async (client) => {
    // 1. Find other on-shift barbers in branch
    const onShift = await findOnShiftBarbers(branchId, client);
    const targets = onShift.filter((b) => b.barber_id !== callerBarberId && b.status === 'ACTIVE');
    if (targets.length === 0) throw new Error('NO_AVAILABLE_BARBERS');

    // 2. Find waiting queue entries for caller
    const waitingRes = await client.query<{ id: string }>(
      `SELECT id FROM salon_queue_entries
       WHERE barber_id = $1 AND branch_id = $2 AND status = 'WAITING'
       ORDER BY manual_position ASC NULLS LAST, joined_at ASC`,
      [callerBarberId, branchId],
    );

    let targetIdx = 0;
    for (const item of waitingRes.rows) {
      const targetBarber = targets[targetIdx % targets.length]!;
      await client.query(
        `UPDATE salon_queue_entries
         SET barber_id = $1, reassigned_from_barber_id = $2, manual_position = NULL
         WHERE id = $3`,
        [targetBarber.barber_id, callerBarberId, item.id],
      );
      targetIdx++;
    }

    return { reassigned_count: waitingRes.rows.length };
  });
}

export async function reorderQueue(
  barberId: string,
  branchId: string,
  entryIds: string[],
  db: Queryable = pool,
): Promise<void> {
  for (let i = 0; i < entryIds.length; i++) {
    await db.query(
      `UPDATE salon_queue_entries
       SET manual_position = $1
       WHERE id = $2 AND barber_id = $3 AND branch_id = $4`,
      [i + 1, entryIds[i], barberId, branchId],
    );
  }
}

export async function devEnqueueCustomer(
  branchId: string,
  data: {
    barberId?: string | null;
    queueType?: 'BARBER' | 'GENERAL';
    customerName: string;
    tokenNumber?: string;
    serviceIds: string[];
    source?: 'APP' | 'WALK_IN_ANON' | 'WALK_IN_VERIFIED';
  },
): Promise<QueueEntryDetail> {
  return withTransaction(async (client) => {
    const queueType = data.queueType ?? (data.barberId ? 'BARBER' : 'GENERAL');
    const source = data.source ?? 'WALK_IN_ANON';

    const { rows: entryRows } = await client.query<{ id: string }>(
      `INSERT INTO salon_queue_entries (
         branch_id, queue_type, barber_id, walk_in_name, token_number, source, status, joined_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'WAITING', now())
       RETURNING id`,
      [
        branchId,
        queueType,
        data.barberId ?? null,
        data.customerName,
        data.tokenNumber ?? 'W-01',
        source,
      ],
    );
    const entryId = entryRows[0]!.id;

    // Attach services
    for (const sid of data.serviceIds) {
      const svcRes = await client.query<{ price: string; duration_minutes: number }>(
        'SELECT price, duration_minutes FROM services WHERE id = $1',
        [sid],
      );
      const svc = svcRes.rows[0];
      if (svc) {
        await client.query(
          `INSERT INTO salon_queue_entry_services (queue_entry_id, service_id, price, duration_minutes)
           VALUES ($1, $2, $3, $4)`,
          [entryId, sid, parseFloat(svc.price), svc.duration_minutes],
        );
      }
    }

    const full = await client.query<RawQueueRow>(
      `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
      [entryId],
    );
    return mapRawQueueRow(full.rows[0]!);
  });
}

export async function requestCancelQueueEntry(
  branchId: string,
  entryId: string,
  actorId: string,
  db: Queryable = pool,
): Promise<{ customerPhone: string | null; barberName: string | null; customerId: string | null }> {
  const { rows } = await db.query<{
    id: string;
    branch_id: string;
    barber_id: string | null;
    customer_id: string | null;
    customer_phone: string | null;
    barber_name: string | null;
  }>(
    `SELECT 
       qe.id,
       qe.branch_id,
       qe.barber_id,
       qe.customer_id,
       cu.phone AS customer_phone,
       bu.name AS barber_name
     FROM salon_queue_entries qe
     LEFT JOIN users cu ON qe.customer_id = cu.id
     LEFT JOIN users bu ON qe.barber_id = bu.id
     WHERE qe.id = $1 AND qe.branch_id = $2`,
    [entryId, branchId],
  );

  if (rows.length === 0) {
    throw new Error('QUEUE_ENTRY_NOT_FOUND');
  }

  const entry = rows[0]!;
  return {
    customerPhone: entry.customer_phone,
    barberName: entry.barber_name,
    customerId: entry.customer_id,
  };
}
