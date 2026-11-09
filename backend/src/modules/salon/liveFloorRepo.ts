import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';
import { dispatchPushInBackground } from '../notifications/notificationDispatcher.js';
import { findBarberQueue, notifyQueueAdvance, type QueueEntryDetail } from './queueRepo.js';
import { findBarbersByBranchId } from './repo.js';
import { findCurrentShift } from './shiftRepo.js';
import { calculateWaitTimes, type WaitTimeSummary } from './walkInRepo.js';

export interface BarberFloorState {
  barber_id: string;
  name: string | null;
  phone: string;
  avatar_url: string | null;
  shift_status: 'ACTIVE' | 'PAUSED' | 'ENDED' | 'NOT_STARTED';
  serving: QueueEntryDetail | null;
  waiting: QueueEntryDetail[];
  wait_time_minutes: number;
}

export interface LiveFloorSummary {
  branch_id: string;
  general_queue: QueueEntryDetail[];
  barbers: BarberFloorState[];
  wait_times: WaitTimeSummary;
  total_waiting_count: number;
  active_barbers_count: number;
}

const SELECT_QUEUE_DETAILS = `
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

export async function getBranchLiveFloor(
  branchId: string,
  db: Queryable = pool,
): Promise<LiveFloorSummary> {
  // 1. Fetch all general queue entries
  const genRes = await db.query<any>(
    `${SELECT_QUEUE_DETAILS}
     WHERE qe.branch_id = $1 AND qe.queue_type = 'GENERAL' AND qe.status = 'WAITING'
     ORDER BY qe.joined_at ASC`,
    [branchId],
  );

  const generalQueue: QueueEntryDetail[] = genRes.rows.map((row) => {
    const services = (row.services_json ?? []).map((s: any) => ({
      id: s.id,
      service_id: s.service_id,
      name: s.name,
      price: typeof s.price === 'string' ? parseFloat(s.price) : s.price,
      duration_minutes: s.duration_minutes,
    }));
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
      total_price: services.reduce((acc: number, s: any) => acc + s.price, 0),
      total_duration: services.reduce((acc: number, s: any) => acc + s.duration_minutes, 0),
    };
  });

  // 2. Fetch all barbers assigned to branch
  const branchBarbers = await findBarbersByBranchId(branchId, db);
  const waitTimes = await calculateWaitTimes(branchId, db);

  const barbersState: BarberFloorState[] = [];
  let totalBarberWaiting = 0;

  for (const barber of branchBarbers) {
    const shift = await findCurrentShift(barber.barber_id, branchId, db);
    const q = await findBarberQueue(barber.barber_id, branchId, db);

    totalBarberWaiting += q.waiting.length;

    barbersState.push({
      barber_id: barber.barber_id,
      name: barber.name,
      phone: barber.phone,
      avatar_url: barber.avatar_url,
      shift_status: shift?.status ?? 'NOT_STARTED',
      serving: q.serving,
      waiting: q.waiting,
      wait_time_minutes: waitTimes.barber_wait_times[barber.barber_id] ?? 0,
    });
  }

  return {
    branch_id: branchId,
    general_queue: generalQueue,
    barbers: barbersState,
    wait_times: waitTimes,
    total_waiting_count: generalQueue.length + totalBarberWaiting,
    active_barbers_count: waitTimes.active_barbers_count,
  };
}

export async function assignGeneralQueueEntry(
  branchId: string,
  entryId: string,
  targetBarberId: string,
  db: Queryable = pool,
): Promise<QueueEntryDetail | null> {
  const { rowCount } = await db.query(
    `UPDATE salon_queue_entries
     SET barber_id = $1, queue_type = 'BARBER', assigned_at = now()
     WHERE id = $2 AND branch_id = $3 AND queue_type = 'GENERAL' AND status = 'WAITING'`,
    [targetBarberId, entryId, branchId],
  );

  if (!rowCount) return null;

  const full = await db.query<any>(
    `${SELECT_QUEUE_DETAILS} WHERE qe.id = $1`,
    [entryId],
  );
  if (!full.rows[0]) return null;

  const r = full.rows[0];
  const services = (r.services_json ?? []).map((s: any) => ({
    id: s.id,
    service_id: s.service_id,
    name: s.name,
    price: typeof s.price === 'string' ? parseFloat(s.price) : s.price,
    duration_minutes: s.duration_minutes,
  }));

  const entryResult = {
    id: r.id,
    branch_id: r.branch_id,
    queue_type: r.queue_type,
    barber_id: r.barber_id,
    barber_name: r.barber_name,
    customer_id: r.customer_id,
    customer_name: r.customer_name,
    customer_phone: r.customer_phone,
    walk_in_name: r.walk_in_name,
    token_number: r.token_number,
    source: r.source,
    manual_position: r.manual_position,
    status: r.status,
    joined_at: r.joined_at,
    assigned_at: r.assigned_at,
    called_at: r.called_at,
    completed_at: r.completed_at,
    reassigned_from_barber_id: r.reassigned_from_barber_id,
    services,
    total_price: services.reduce((acc: number, s: any) => acc + s.price, 0),
    total_duration: services.reduce((acc: number, s: any) => acc + s.duration_minutes, 0),
  };

  if (r.customer_id) {
    dispatchPushInBackground(
      r.customer_id,
      'general_queue_picked_up',
      { barberName: r.barber_name || undefined },
      { screen: 'CustomerWait' },
    );
  }
  notifyQueueAdvance(targetBarberId, branchId).catch(() => {});

  return entryResult;
}
