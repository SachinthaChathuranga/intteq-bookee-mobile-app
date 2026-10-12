import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';
import { normalizePhone } from '../../utils/phone.js';
import { mapRawQueueRow, SELECT_QUEUE_DETAILS, type QueueEntryDetail } from './queueRepo.js';
import { findOnShiftBarbers } from './shiftRepo.js';

export interface CreateWalkInInput {
  mode: 'ANONYMOUS' | 'VERIFIED';
  customerName?: string;
  phone?: string;
  serviceIds: string[];
  barberId?: string | null;
}

export interface WaitTimeSummary {
  general_wait_minutes: number;
  active_barbers_count: number;
  barber_wait_times: Record<string, number>;
}

export async function nextBranchToken(
  branchId: string,
  db: Queryable = pool,
): Promise<string> {
  const { rows } = await db.query<{ last_seq: number }>(
    `INSERT INTO branch_daily_tokens (branch_id, token_date, last_seq)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (branch_id, token_date)
     DO UPDATE SET last_seq = branch_daily_tokens.last_seq + 1
     RETURNING last_seq`,
    [branchId],
  );

  const seq = rows[0]!.last_seq;
  return `W-${String(seq).padStart(2, '0')}`;
}

export async function calculateWaitTimes(
  branchId: string,
  db: Queryable = pool,
): Promise<WaitTimeSummary> {
  // 1. Find active on-shift barbers
  const onShift = await findOnShiftBarbers(branchId, db);
  const activeBarbers = onShift.filter((b) => b.status === 'ACTIVE');
  const activeCount = activeBarbers.length;

  // 2. Compute waiting duration for each barber
  const barberWaitTimes: Record<string, number> = {};

  const barberWorkRes = await db.query<{
    barber_id: string;
    total_waiting_duration: string;
  }>(
    `SELECT 
       qe.barber_id,
       coalesce(sum(qes.duration_minutes), 0) AS total_waiting_duration
     FROM salon_queue_entries qe
     JOIN salon_queue_entry_services qes ON qe.id = qes.queue_entry_id
     WHERE qe.branch_id = $1 AND qe.status = 'WAITING' AND qe.barber_id IS NOT NULL
     GROUP BY qe.barber_id`,
    [branchId],
  );

  for (const b of onShift) {
    barberWaitTimes[b.barber_id] = 0;
  }
  for (const row of barberWorkRes.rows) {
    if (row.barber_id) {
      barberWaitTimes[row.barber_id] = parseInt(row.total_waiting_duration, 10);
    }
  }

  // 3. Compute general queue total work
  const genWorkRes = await db.query<{ total_gen_duration: string }>(
    `SELECT coalesce(sum(qes.duration_minutes), 0) AS total_gen_duration
     FROM salon_queue_entries qe
     JOIN salon_queue_entry_services qes ON qe.id = qes.queue_entry_id
     WHERE qe.branch_id = $1 AND qe.queue_type = 'GENERAL' AND qe.status = 'WAITING'`,
    [branchId],
  );
  const totalGenDuration = parseInt(genWorkRes.rows[0]?.total_gen_duration ?? '0', 10);

  // Total work across general queue + all barber queues
  const totalAllWork = Object.values(barberWaitTimes).reduce((a, b) => a + b, 0) + totalGenDuration;

  // SPEC §6.5: Total remaining work ÷ number of eligible active barbers, rounded up to 5 minutes
  let generalWaitMins = 0;
  if (activeCount > 0) {
    const rawWait = totalAllWork / activeCount;
    generalWaitMins = Math.max(5, Math.ceil(rawWait / 5) * 5);
  }

  return {
    general_wait_minutes: generalWaitMins,
    active_barbers_count: activeCount,
    barber_wait_times: barberWaitTimes,
  };
}

export async function createWalkIn(
  branchId: string,
  input: CreateWalkInInput,
): Promise<{ entry: QueueEntryDetail; token: string; estimated_wait_minutes: number }> {
  return withTransaction(async (client) => {
    let customerId: string | null = null;
    let customerName = input.customerName?.trim() || null;

    // 1. Handle Verified vs Anonymous Mode (SPEC §5.3, §8)
    if (input.mode === 'VERIFIED') {
      if (!input.phone) throw new Error('PHONE_REQUIRED');
      const normalizedPhone = normalizePhone(input.phone);
      if (!normalizedPhone) throw new Error('INVALID_PHONE');

      // Find or create lightweight User with is_app_user = false
      const userRes = await client.query<{ id: string; name: string | null }>(
        'SELECT id, name FROM users WHERE phone = $1',
        [normalizedPhone],
      );

      if (userRes.rows[0]) {
        customerId = userRes.rows[0].id;
        if (!customerName && userRes.rows[0].name) {
          customerName = userRes.rows[0].name;
        } else if (customerName && !userRes.rows[0].name) {
          await client.query('UPDATE users SET name = $1 WHERE id = $2', [customerName, customerId]);
        }
      } else {
        const newUser = await client.query<{ id: string }>(
          `INSERT INTO users (phone, name, is_app_user)
           VALUES ($1, $2, false)
           RETURNING id`,
          [normalizedPhone, customerName],
        );
        customerId = newUser.rows[0]!.id;
      }
    }

    // 2. Generate daily sequential token (W-01, W-02...)
    const token = await nextBranchToken(branchId, client);
    const displayName = customerName || token;

    // 3. Queue Type: Specific Barber vs General Queue
    const queueType = input.barberId ? 'BARBER' : 'GENERAL';
    const source = input.mode === 'VERIFIED' ? 'WALK_IN_VERIFIED' : 'WALK_IN_ANON';

    const { rows: entryRows } = await client.query<{ id: string }>(
      `INSERT INTO salon_queue_entries (
         branch_id, queue_type, barber_id, customer_id, walk_in_name, token_number, source, status, joined_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'WAITING', now())
       RETURNING id`,
      [branchId, queueType, input.barberId ?? null, customerId, displayName, token, source],
    );
    const entryId = entryRows[0]!.id;

    // 4. Attach snapshot services
    for (const sid of input.serviceIds) {
      const svcRes = await client.query<{ price: string; duration_minutes: number }>(
        'SELECT price, duration_minutes FROM services WHERE id = $1 AND branch_id = $2',
        [sid, branchId],
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

    // 5. Query full entry detail
    const full = await client.query<any>(
      `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
      [entryId],
    );
    const entry = mapRawQueueRow(full.rows[0]!);

    // 6. Calculate wait times
    const waitTimes = await calculateWaitTimes(branchId, client);
    const estimatedWait = input.barberId
      ? waitTimes.barber_wait_times[input.barberId] ?? 0
      : waitTimes.general_wait_minutes;

    return {
      entry,
      token,
      estimated_wait_minutes: estimatedWait,
    };
  });
}
