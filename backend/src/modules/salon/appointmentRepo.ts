import type { Queryable } from '../../db/pool.js';
import { pool, withTransaction } from '../../db/pool.js';
import { HttpError } from '../../middleware/index.js';
import { calculateWaitTimes, nextBranchToken } from './walkInRepo.js';

export interface SlotAvailability {
  time: string; // 'HH:mm' in Asia/Colombo
  start_at: string; // ISO timestamptz
  end_at: string; // ISO timestamptz
  available: boolean;
}

export interface BranchAvailabilityResult {
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  total_duration_minutes: number;
  total_price: number;
  now_available: boolean;
  slots: SlotAvailability[];
  candidate_barbers_count: number;
}

export interface CreateAppointmentInput {
  branchId: string;
  customerId: string;
  barberId?: string | null;
  serviceIds: string[];
  startAt: string; // ISO string
  bookingMode: 'SPECIFIC' | 'ANY';
  notes?: string;
}

export interface AppointmentDetail {
  id: string;
  branch_id: string;
  barber_id: string;
  barber_name: string;
  barber_avatar: string | null;
  customer_id: string;
  booking_mode: 'SPECIFIC' | 'ANY';
  start_at: string;
  end_at: string;
  status: string;
  total_price: number;
  total_duration_minutes: number;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }[];
}

/** Check if a given barber offers all specified services */
async function barberOffersServices(
  barberId: string,
  serviceIds: string[],
  db: Queryable = pool,
): Promise<boolean> {
  if (serviceIds.length === 0) return true;

  // Check if barber has entries in barber_services
  const { rows: countRows } = await db.query<{ count: string }>(
    `SELECT count(*) AS count FROM barber_services WHERE barber_id = $1`,
    [barberId],
  );
  const totalBarberServices = parseInt(countRows[0]?.count ?? '0', 10);

  // If barber has no restriction configured, assume they offer branch services
  if (totalBarberServices === 0) return true;

  // Otherwise, barber must explicitly offer all requested services
  const { rows: matchRows } = await db.query<{ count: string }>(
    `SELECT count(*) AS count FROM barber_services WHERE barber_id = $1 AND service_id = ANY($2)`,
    [barberId, serviceIds],
  );
  const matched = parseInt(matchRows[0]?.count ?? '0', 10);
  return matched === serviceIds.length;
}

export async function getBranchAvailability(
  branchId: string,
  dateStr: string,
  serviceIds: string[],
  barberId?: string | null,
  db: Queryable = pool,
): Promise<BranchAvailabilityResult> {
  // 1. Calculate Day of Week for the date in Asia/Colombo
  // Using 12:00 PM UTC+5:30 ensures the calendar day matches UTC day
  const probeDate = new Date(`${dateStr}T12:00:00+05:30`);
  if (isNaN(probeDate.getTime())) {
    throw new HttpError(400, 'INVALID_DATE');
  }
  const dayOfWeek = probeDate.getUTCDay(); // 0 = Sunday, 1 = Monday...

  // 2. Fetch working hours for that day
  const { rows: whRows } = await db.query<{
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>(
    `SELECT open_time, close_time, is_closed FROM working_hours WHERE branch_id = $1 AND day_of_week = $2`,
    [branchId, dayOfWeek],
  );

  const workingHour = whRows[0];
  if (!workingHour || workingHour.is_closed) {
    return {
      date: dateStr,
      is_closed: true,
      open_time: null,
      close_time: null,
      total_duration_minutes: 0,
      total_price: 0,
      now_available: false,
      slots: [],
      candidate_barbers_count: 0,
    };
  }

  // 3. Fetch services and calculate totals
  let totalDurationMinutes = 0;
  let totalPrice = 0;
  if (serviceIds.length > 0) {
    const { rows: serviceRows } = await db.query<{
      price: string;
      duration_minutes: number;
    }>(
      `SELECT price, duration_minutes FROM services WHERE id = ANY($1) AND branch_id = $2 AND is_active = true`,
      [serviceIds, branchId],
    );
    for (const s of serviceRows) {
      totalPrice += parseFloat(s.price);
      totalDurationMinutes += s.duration_minutes;
    }
  }
  if (totalDurationMinutes === 0) {
    totalDurationMinutes = 30; // default slot length if no services selected yet
  }

  // 4. Find active barbers in branch who offer all selected services
  const { rows: barberRows } = await db.query<{
    barber_id: string;
  }>(
    `SELECT bb.barber_id
     FROM barber_branches bb
     WHERE bb.branch_id = $1 AND bb.is_active = true`,
    [branchId],
  );

  const eligibleBarbers: string[] = [];
  for (const b of barberRows) {
    if (barberId && b.barber_id !== barberId) continue;
    const offers = await barberOffersServices(b.barber_id, serviceIds, db);
    if (offers) {
      eligibleBarbers.push(b.barber_id);
    }
  }

  // If specific barber was requested but doesn't qualify
  if (barberId && !eligibleBarbers.includes(barberId)) {
    return {
      date: dateStr,
      is_closed: false,
      open_time: workingHour.open_time,
      close_time: workingHour.close_time,
      total_duration_minutes: totalDurationMinutes,
      total_price: totalPrice,
      now_available: false,
      slots: [],
      candidate_barbers_count: 0,
    };
  }

  // 5. Check if "Now - join queue" is available today (at least one barber active on shift)
  let nowAvailable = false;
  const now = new Date();
  // Check if today matches dateStr in Asia/Colombo
  const todayInColombo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(now);
  const isToday = dateStr === todayInColombo;

  if (isToday) {
    if (barberId) {
      const { rows: shiftRows } = await db.query(
        `SELECT 1 FROM salon_shifts WHERE barber_id = $1 AND branch_id = $2 AND status = 'ACTIVE'`,
        [barberId, branchId],
      );
      nowAvailable = shiftRows.length > 0;
    } else {
      const { rows: shiftRows } = await db.query(
        `SELECT 1 FROM salon_shifts WHERE branch_id = $1 AND status = 'ACTIVE'`,
        [branchId],
      );
      nowAvailable = shiftRows.length > 0;
    }
  }

  // 6. Generate time slots (15-min intervals)
  // Parse open_time ('09:00') and close_time ('18:00') into Date objects in Asia/Colombo
  const openTimeParts = workingHour.open_time.slice(0, 5).split(':').map(Number);
  const closeTimeParts = workingHour.close_time.slice(0, 5).split(':').map(Number);

  const openTimeMinutes = openTimeParts[0]! * 60 + openTimeParts[1]!;
  const closeTimeMinutes = closeTimeParts[0]! * 60 + closeTimeParts[1]!;

  // Minimum allowed start time: if today, slots earlier than now + 15 min are hidden
  const minAllowedTime = new Date(now.getTime() + 15 * 60 * 1000);

  // Fetch all confirmed appointments for this branch on this date
  const dayStartISO = `${dateStr}T00:00:00+05:30`;
  const dayEndISO = `${dateStr}T23:59:59+05:30`;

  const { rows: busyAppointments } = await db.query<{
    barber_id: string;
    start_at: Date;
    end_at: Date;
  }>(
    `SELECT barber_id, start_at, end_at
     FROM salon_appointments
     WHERE branch_id = $1
       AND status IN ('CONFIRMED', 'RESCHEDULED', 'ARRIVED')
       AND start_at >= $2 AND start_at <= $3`,
    [branchId, dayStartISO, dayEndISO],
  );

  const slots: SlotAvailability[] = [];

  for (let m = openTimeMinutes; m + totalDurationMinutes <= closeTimeMinutes; m += 15) {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    const slotStart = new Date(`${dateStr}T${timeStr}:00+05:30`);
    const slotEnd = new Date(slotStart.getTime() + totalDurationMinutes * 60 * 1000);

    // Rule: for today, hide slots earlier than now + 15 min
    if (isToday && slotStart < minAllowedTime) {
      continue;
    }

    // Availability:
    // A slot is available if AT LEAST ONE eligible barber has NO overlapping busy appointment
    let hasAvailableBarber = false;

    for (const bId of eligibleBarbers) {
      const isOverlapping = busyAppointments.some(
        (app) => app.barber_id === bId && app.start_at < slotEnd && app.end_at > slotStart,
      );
      if (!isOverlapping) {
        hasAvailableBarber = true;
        break;
      }
    }

    slots.push({
      time: timeStr,
      start_at: slotStart.toISOString(),
      end_at: slotEnd.toISOString(),
      available: hasAvailableBarber && eligibleBarbers.length > 0,
    });
  }

  return {
    date: dateStr,
    is_closed: false,
    open_time: workingHour.open_time.slice(0, 5),
    close_time: workingHour.close_time.slice(0, 5),
    total_duration_minutes: totalDurationMinutes,
    total_price: totalPrice,
    now_available: nowAvailable,
    slots,
    candidate_barbers_count: eligibleBarbers.length,
  };
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<AppointmentDetail> {
  const { branchId, customerId, barberId, serviceIds, startAt, bookingMode, notes } = input;

  if (serviceIds.length === 0) {
    throw new HttpError(400, 'SERVICES_REQUIRED');
  }

  const startDate = new Date(startAt);
  if (isNaN(startDate.getTime())) {
    throw new HttpError(400, 'INVALID_START_TIME');
  }

  return withTransaction(async (client) => {
    // 1. Fetch requested services
    const { rows: serviceRows } = await client.query<{
      id: string;
      name: string;
      price: string;
      duration_minutes: number;
    }>(
      `SELECT id, name, price, duration_minutes
       FROM services
       WHERE id = ANY($1) AND branch_id = $2 AND is_active = true`,
      [serviceIds, branchId],
    );

    if (serviceRows.length !== serviceIds.length) {
      throw new HttpError(400, 'SOME_SERVICES_NOT_FOUND');
    }

    const totalDurationMinutes = serviceRows.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = serviceRows.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60 * 1000);

    // 2. Validate Barber & Service offering (reject with 400 if a specific barber doesn't offer a service)
    if (barberId) {
      const offersAll = await barberOffersServices(barberId, serviceIds, client);
      if (!offersAll) {
        throw new HttpError(400, 'BARBER_DOES_NOT_OFFER_SERVICE');
      }

      // Specific barber: try insert with exclusion constraint protection
      try {
        const { rows: appRows } = await client.query<{ id: string }>(
          `INSERT INTO salon_appointments (
             branch_id, barber_id, customer_id, booking_mode, start_at, end_at, status, notes
           ) VALUES ($1, $2, $3, 'SPECIFIC', $4, $5, 'CONFIRMED', $6)
           RETURNING id`,
          [branchId, barberId, customerId, startDate.toISOString(), endDate.toISOString(), notes ?? null],
        );

        const appointmentId = appRows[0]!.id;

        // Insert appointment services
        for (const s of serviceRows) {
          await client.query(
            `INSERT INTO salon_appointment_services (appointment_id, service_id, price, duration_minutes)
             VALUES ($1, $2, $3, $4)`,
            [appointmentId, s.id, s.price, s.duration_minutes],
          );
        }

        // Fetch assigned barber details
        const { rows: barberUserRows } = await client.query<{
          name: string | null;
          avatar_url: string | null;
        }>(`SELECT name, avatar_url FROM users WHERE id = $1`, [barberId]);

        return {
          id: appointmentId,
          branch_id: branchId,
          barber_id: barberId,
          barber_name: barberUserRows[0]?.name || 'Barber',
          barber_avatar: barberUserRows[0]?.avatar_url || null,
          customer_id: customerId,
          booking_mode: 'SPECIFIC',
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          status: 'CONFIRMED',
          total_price: totalPrice,
          total_duration_minutes: totalDurationMinutes,
          services: serviceRows.map((s) => ({
            id: s.id,
            name: s.name,
            price: parseFloat(s.price),
            duration_minutes: s.duration_minutes,
          })),
        };
      } catch (err: any) {
        if (err?.code === '23P01') {
          // exclusion_violation
          throw new HttpError(409, 'SLOT_ALREADY_BOOKED');
        }
        throw err;
      }
    } else {
      // Any Barber (SPEC §6.4):
      // "try the candidate barbers in order and pick the first insert that succeeds"
      const { rows: barberBranchRows } = await client.query<{ barber_id: string }>(
        `SELECT barber_id FROM barber_branches WHERE branch_id = $1 AND is_active = true`,
        [branchId],
      );

      const candidateBarberIds: string[] = [];
      for (const b of barberBranchRows) {
        const offers = await barberOffersServices(b.barber_id, serviceIds, client);
        if (offers) {
          candidateBarberIds.push(b.barber_id);
        }
      }

      if (candidateBarberIds.length === 0) {
        throw new HttpError(400, 'NO_BARBER_OFFERS_SERVICES');
      }

      // Tie-breaker: sort candidates by fewest confirmed appointments on that day
      const dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(startDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { rows: bookingCounts } = await client.query<{
        barber_id: string;
        cnt: string;
      }>(
        `SELECT barber_id, count(*) AS cnt
         FROM salon_appointments
         WHERE branch_id = $1
           AND barber_id = ANY($2)
           AND status IN ('CONFIRMED', 'RESCHEDULED', 'ARRIVED')
           AND start_at >= $3 AND start_at <= $4
         GROUP BY barber_id`,
        [branchId, candidateBarberIds, dayStart.toISOString(), dayEnd.toISOString()],
      );

      const countMap = new Map<string, number>();
      for (const bc of bookingCounts) {
        countMap.set(bc.barber_id, parseInt(bc.cnt, 10));
      }

      candidateBarberIds.sort((a, b) => (countMap.get(a) ?? 0) - (countMap.get(b) ?? 0));

      let bookedBarberId: string | null = null;
      let appointmentId: string | null = null;

      for (const candidateId of candidateBarberIds) {
        try {
          await client.query('SAVEPOINT try_candidate_barber');
          const { rows: appRows } = await client.query<{ id: string }>(
            `INSERT INTO salon_appointments (
               branch_id, barber_id, customer_id, booking_mode, start_at, end_at, status, notes
             ) VALUES ($1, $2, $3, 'ANY', $4, $5, 'CONFIRMED', $6)
             RETURNING id`,
            [branchId, candidateId, customerId, startDate.toISOString(), endDate.toISOString(), notes ?? null],
          );
          await client.query('RELEASE SAVEPOINT try_candidate_barber');
          bookedBarberId = candidateId;
          appointmentId = appRows[0]!.id;
          break;
        } catch (err: any) {
          await client.query('ROLLBACK TO SAVEPOINT try_candidate_barber');
          if (err?.code === '23P01') {
            // exclusion constraint: slot busy for this candidate, try next
            continue;
          }
          throw err;
        }
      }

      if (!bookedBarberId || !appointmentId) {
        throw new HttpError(409, 'SLOT_ALREADY_BOOKED');
      }

      // Insert appointment services
      for (const s of serviceRows) {
        await client.query(
          `INSERT INTO salon_appointment_services (appointment_id, service_id, price, duration_minutes)
           VALUES ($1, $2, $3, $4)`,
          [appointmentId, s.id, s.price, s.duration_minutes],
        );
      }

      const { rows: barberUserRows } = await client.query<{
        name: string | null;
        avatar_url: string | null;
      }>(`SELECT name, avatar_url FROM users WHERE id = $1`, [bookedBarberId]);

      return {
        id: appointmentId,
        branch_id: branchId,
        barber_id: bookedBarberId,
        barber_name: barberUserRows[0]?.name || 'Barber',
        barber_avatar: barberUserRows[0]?.avatar_url || null,
        customer_id: customerId,
        booking_mode: 'ANY',
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: 'CONFIRMED',
        total_price: totalPrice,
        total_duration_minutes: totalDurationMinutes,
        services: serviceRows.map((s) => ({
          id: s.id,
          name: s.name,
          price: parseFloat(s.price),
          duration_minutes: s.duration_minutes,
        })),
      };
    }
  });
}

/** Customer joins live queue ("Now — join queue") */
export async function joinCustomerLiveQueue(
  branchId: string,
  customerId: string,
  serviceIds: string[],
  barberId?: string | null,
): Promise<{
  entry_id: string;
  token: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  estimated_wait_minutes: number;
}> {
  return withTransaction(async (client) => {
    // Generate daily token
    const token = await nextBranchToken(branchId, client);
    const queueType = barberId ? 'BARBER' : 'GENERAL';

    // Get customer name
    const { rows: userRows } = await client.query<{ name: string | null }>(
      `SELECT name FROM users WHERE id = $1`,
      [customerId],
    );
    const customerName = userRows[0]?.name || token;

    const { rows: entryRows } = await client.query<{ id: string }>(
      `INSERT INTO salon_queue_entries (
         branch_id, queue_type, barber_id, customer_id, walk_in_name, token_number, source, status, joined_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'APP', 'WAITING', now())
       RETURNING id`,
      [branchId, queueType, barberId ?? null, customerId, customerName, token],
    );
    const entryId = entryRows[0]!.id;

    // Attach services
    for (const sid of serviceIds) {
      const svcRes = await client.query<{ price: string; duration_minutes: number }>(
        'SELECT price, duration_minutes FROM services WHERE id = $1 AND branch_id = $2',
        [sid, branchId],
      );
      if (svcRes.rows[0]) {
        await client.query(
          `INSERT INTO salon_queue_entry_services (queue_entry_id, service_id, price, duration_minutes)
           VALUES ($1, $2, $3, $4)`,
          [entryId, sid, svcRes.rows[0].price, svcRes.rows[0].duration_minutes],
        );
      }
    }

    return {
      entry_id: entryId,
      token,
      queue_type: queueType,
      barber_id: barberId ?? null,
      estimated_wait_minutes: 15,
    };
  });
}

/** Look up where a barber is on shift today, or their assigned branch */
export async function getBarberTodayBranch(
  barberId: string,
  db: Queryable = pool,
): Promise<{
  branch_id: string;
  branch_name: string;
  business_name: string;
  is_on_shift_today: boolean;
  address: string;
} | null> {
  // 1. Check if barber is on shift today at any branch
  const { rows: shiftRows } = await db.query<{
    branch_id: string;
    branch_name: string;
    business_name: string;
    address: string;
  }>(
    `SELECT b.id AS branch_id, b.name AS branch_name, biz.name AS business_name, b.address
     FROM salon_shifts s
     JOIN branches b ON s.branch_id = b.id
     JOIN businesses biz ON b.business_id = biz.id
     WHERE s.barber_id = $1 AND s.status IN ('ACTIVE', 'PAUSED')
     ORDER BY s.start_at DESC LIMIT 1`,
    [barberId],
  );

  if (shiftRows[0]) {
    return {
      branch_id: shiftRows[0].branch_id,
      branch_name: shiftRows[0].branch_name,
      business_name: shiftRows[0].business_name,
      is_on_shift_today: true,
      address: shiftRows[0].address,
    };
  }

  // 2. Otherwise return their primary active branch
  const { rows: branchRows } = await db.query<{
    branch_id: string;
    branch_name: string;
    business_name: string;
    address: string;
  }>(
    `SELECT b.id AS branch_id, b.name AS branch_name, biz.name AS business_name, b.address
     FROM barber_branches bb
     JOIN branches b ON bb.branch_id = b.id
     JOIN businesses biz ON b.business_id = biz.id
     WHERE bb.barber_id = $1 AND bb.is_active = true
     ORDER BY bb.created_at ASC LIMIT 1`,
    [barberId],
  );

  if (branchRows[0]) {
    return {
      branch_id: branchRows[0].branch_id,
      branch_name: branchRows[0].branch_name,
      business_name: branchRows[0].business_name,
      is_on_shift_today: false,
      address: branchRows[0].address,
    };
  }

  return null;
}

export interface CustomerBarberInfo {
  id: string;
  name: string | null;
  avatar_url: string | null;
  avg_rating: string;
  rating_count: number;
  is_working_today: boolean;
  offered_service_ids: string[];
}

export async function getBranchBarbersForCustomer(
  branchId: string,
  db: Queryable = pool,
): Promise<CustomerBarberInfo[]> {
  const { rows } = await db.query<CustomerBarberInfo>(
    `SELECT 
       bb.barber_id AS id,
       u.name,
       u.avatar_url,
       COALESCE(bp.avg_rating, 5.00)::text AS avg_rating,
       COALESCE(bp.rating_count, 0) AS rating_count,
       EXISTS (
         SELECT 1 FROM salon_shifts s
         WHERE s.barber_id = bb.barber_id
           AND s.branch_id = bb.branch_id
           AND s.status IN ('ACTIVE', 'PAUSED')
       ) AS is_working_today,
       COALESCE(
         (SELECT array_agg(service_id::text) FROM barber_services bs WHERE bs.barber_id = bb.barber_id),
         ARRAY[]::text[]
       ) AS offered_service_ids
     FROM barber_branches bb
     JOIN users u ON bb.barber_id = u.id
     LEFT JOIN barber_profiles bp ON u.id = bp.user_id
     WHERE bb.branch_id = $1 AND bb.is_active = true
     ORDER BY is_working_today DESC, bb.created_at ASC`,
    [branchId],
  );
  return rows;
}

export interface CustomerAppointmentItem {
  id: string;
  branch_id: string;
  branch_name: string;
  business_name: string;
  barber_id: string;
  barber_name: string;
  barber_avatar: string | null;
  start_at: string;
  end_at: string;
  status: string;
  total_price: number;
  total_duration_minutes: number;
  services: {
    name: string;
    price: number;
    duration_minutes: number;
  }[];
}

export async function getCustomerAppointments(
  customerId: string,
  db: Queryable = pool,
): Promise<CustomerAppointmentItem[]> {
  const { rows } = await db.query<any>(
    `SELECT 
       a.id,
       a.branch_id,
       b.name AS branch_name,
       biz.name AS business_name,
       a.barber_id,
       u.name AS barber_name,
       u.avatar_url AS barber_avatar,
       a.start_at,
       a.end_at,
       a.status,
       COALESCE((SELECT SUM(sas.price) FROM salon_appointment_services sas WHERE sas.appointment_id = a.id), 0) AS total_price,
       COALESCE((SELECT SUM(sas.duration_minutes) FROM salon_appointment_services sas WHERE sas.appointment_id = a.id), 0)::integer AS total_duration_minutes,
       COALESCE(
         (SELECT json_agg(json_build_object('id', s.id, 'service_id', s.id, 'name', s.name, 'price', s.price, 'duration_minutes', s.duration_minutes))
          FROM salon_appointment_services sas
          JOIN services s ON sas.service_id = s.id
          WHERE sas.appointment_id = a.id),
         '[]'::json
       ) AS services
     FROM salon_appointments a
     JOIN branches b ON a.branch_id = b.id
     JOIN businesses biz ON b.business_id = biz.id
     JOIN users u ON a.barber_id = u.id
     WHERE a.customer_id = $1
     ORDER BY a.start_at DESC`,
    [customerId],
  );

  return rows.map((r: any) => ({
    ...r,
    total_price: parseFloat(r.total_price),
    services: typeof r.services === 'string' ? JSON.parse(r.services) : r.services,
  }));
}

export interface CustomerActiveQueueDetail {
  id: string;
  branch_id: string;
  branch_name: string;
  branch_address: string;
  business_name: string;
  queue_type: 'BARBER' | 'GENERAL';
  barber_id: string | null;
  barber_name: string | null;
  barber_avatar: string | null;
  token_number: string | null;
  status: 'WAITING' | 'CALLED' | 'IN_SERVICE';
  position: number;
  people_ahead: number;
  estimated_wait_minutes: number;
  joined_at: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  }>;
  total_price: number;
  total_duration_minutes: number;
}

export async function findCustomerActiveQueue(
  customerId: string,
  db: Queryable = pool,
): Promise<CustomerActiveQueueDetail | null> {
  const { rows } = await db.query<any>(
    `SELECT 
       qe.id,
       qe.branch_id,
       qe.queue_type,
       qe.barber_id,
       bu.name AS barber_name,
       bu.avatar_url AS barber_avatar,
       qe.token_number,
       qe.status,
       qe.joined_at,
       b.name AS branch_name,
       b.address AS branch_address,
       biz.name AS business_name,
       COALESCE(
         (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'price', qes.price, 'duration_minutes', qes.duration_minutes))
          FROM salon_queue_entry_services qes
          JOIN services s ON qes.service_id = s.id
          WHERE qes.queue_entry_id = qe.id),
         '[]'::json
       ) AS services
     FROM salon_queue_entries qe
     JOIN branches b ON qe.branch_id = b.id
     JOIN businesses biz ON b.business_id = biz.id
     LEFT JOIN users bu ON qe.barber_id = bu.id
     WHERE qe.customer_id = $1
       AND qe.status IN ('WAITING', 'CALLED', 'IN_SERVICE')
     ORDER BY qe.joined_at DESC
     LIMIT 1`,
    [customerId],
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  const rawServices = typeof row.services === 'string' ? JSON.parse(row.services) : (row.services ?? []);
  const services = rawServices.map((s: any) => ({
    id: s.id,
    name: s.name,
    price: typeof s.price === 'string' ? parseFloat(s.price) : Number(s.price),
    duration_minutes: Number(s.duration_minutes),
  }));
  const totalPrice = services.reduce((sum: number, s: any) => sum + s.price, 0);
  const totalDuration = services.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);

  let addressStr = '';
  if (typeof row.branch_address === 'string') {
    try {
      const parsed = JSON.parse(row.branch_address);
      addressStr = parsed.address || row.branch_address;
    } catch {
      addressStr = row.branch_address;
    }
  } else if (row.branch_address && typeof row.branch_address === 'object') {
    addressStr = row.branch_address.address || '';
  }

  let position = 1;
  let peopleAhead = 0;
  let estimatedWait = 0;

  if (row.status === 'CALLED' || row.status === 'IN_SERVICE') {
    position = 1;
    peopleAhead = 0;
    estimatedWait = 0;
  } else if (row.status === 'WAITING') {
    if (row.queue_type === 'BARBER' && row.barber_id) {
      const { rows: aheadRows } = await db.query<{ ahead_count: string; ahead_duration: string }>(
        `SELECT 
           count(*)::text AS ahead_count,
           coalesce(sum(qes.duration_minutes), 0)::text AS ahead_duration
         FROM salon_queue_entries qe
         JOIN salon_queue_entry_services qes ON qe.id = qes.queue_entry_id
         WHERE qe.branch_id = $1
           AND qe.barber_id = $2
           AND qe.status = 'WAITING'
           AND (qe.joined_at < $3 OR (qe.joined_at = $3 AND qe.id < $4))`,
        [row.branch_id, row.barber_id, row.joined_at, row.id],
      );
      const aheadCount = parseInt(aheadRows[0]?.ahead_count ?? '0', 10);
      const aheadDuration = parseInt(aheadRows[0]?.ahead_duration ?? '0', 10);

      const { rows: servingRows } = await db.query<{ serving_duration: string }>(
        `SELECT coalesce(sum(qes.duration_minutes), 0)::text AS serving_duration
         FROM salon_queue_entries qe
         JOIN salon_queue_entry_services qes ON qe.id = qes.queue_entry_id
         WHERE qe.branch_id = $1
           AND qe.barber_id = $2
           AND qe.status IN ('CALLED', 'IN_SERVICE')`,
        [row.branch_id, row.barber_id],
      );
      const servingDuration = parseInt(servingRows[0]?.serving_duration ?? '0', 10);

      peopleAhead = aheadCount;
      position = aheadCount + 1;
      estimatedWait = aheadDuration + servingDuration;
    } else {
      // GENERAL queue
      const { rows: aheadRows } = await db.query<{ ahead_count: string }>(
        `SELECT count(*)::text AS ahead_count
         FROM salon_queue_entries qe
         WHERE qe.branch_id = $1
           AND qe.queue_type = 'GENERAL'
           AND qe.status = 'WAITING'
           AND (qe.joined_at < $2 OR (qe.joined_at = $2 AND qe.id < $3))`,
        [row.branch_id, row.joined_at, row.id],
      );
      peopleAhead = parseInt(aheadRows[0]?.ahead_count ?? '0', 10);
      position = peopleAhead + 1;

      const waitSummary = await calculateWaitTimes(row.branch_id, db);
      estimatedWait = waitSummary.general_wait_minutes;
    }
  }

  return {
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    branch_address: addressStr,
    business_name: row.business_name,
    queue_type: row.queue_type,
    barber_id: row.barber_id,
    barber_name: row.barber_name,
    barber_avatar: row.barber_avatar,
    token_number: row.token_number,
    status: row.status,
    position,
    people_ahead: peopleAhead,
    estimated_wait_minutes: estimatedWait,
    joined_at: new Date(row.joined_at).toISOString(),
    services,
    total_price: totalPrice,
    total_duration_minutes: totalDuration,
  };
}

export async function leaveCustomerQueue(
  customerId: string,
  db: Queryable = pool,
): Promise<{ id: string; branch_id: string } | null> {
  const { rows } = await db.query<{ id: string; branch_id: string }>(
    `UPDATE salon_queue_entries
     SET status = 'LEFT', updated_at = now()
     WHERE customer_id = $1 AND status = 'WAITING'
     RETURNING id, branch_id`,
    [customerId],
  );
  return rows[0] ?? null;
}

export async function cancelAppointment(
  appointmentId: string,
  actorId: string,
  isStaff: boolean = false,
  db: Queryable = pool,
): Promise<{ id: string; branch_id: string; status: string }> {
  const { rows } = await db.query<{
    id: string;
    branch_id: string;
    customer_id: string;
    barber_id: string;
    status: string;
  }>(
    `SELECT id, branch_id, customer_id, barber_id, status FROM salon_appointments WHERE id = $1`,
    [appointmentId],
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');
  }

  const app = rows[0]!;
  if (!isStaff && app.customer_id !== actorId && app.barber_id !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'You cannot cancel this appointment.');
  }

  if (app.status !== 'CONFIRMED' && app.status !== 'RESCHEDULED') {
    throw new HttpError(400, 'CANNOT_CANCEL', `Cannot cancel appointment in status ${app.status}.`);
  }

  const { rows: updateRows } = await db.query<{ id: string; branch_id: string; status: string }>(
    `UPDATE salon_appointments
     SET status = 'CANCELLED', updated_at = now()
     WHERE id = $1
     RETURNING id, branch_id, status`,
    [appointmentId],
  );

  return updateRows[0]!;
}

export async function rescheduleAppointment(
  appointmentId: string,
  actorId: string,
  newStartAt: string,
  isStaff: boolean = false,
  db: Queryable = pool,
): Promise<{
  id: string;
  branch_id: string;
  start_at: Date;
  end_at: Date;
  status: string;
}> {
  const { rows } = await db.query<{
    id: string;
    branch_id: string;
    customer_id: string;
    barber_id: string;
    status: string;
    total_duration_minutes: number;
  }>(
    `SELECT a.id, a.branch_id, a.customer_id, a.barber_id, a.status,
       COALESCE((SELECT SUM(sas.duration_minutes) FROM salon_appointment_services sas WHERE sas.appointment_id = a.id), 0)::integer AS total_duration_minutes
     FROM salon_appointments a WHERE a.id = $1`,
    [appointmentId],
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found.');
  }

  const app = rows[0]!;
  if (!isStaff && app.customer_id !== actorId && app.barber_id !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'You cannot reschedule this appointment.');
  }

  if (app.status !== 'CONFIRMED' && app.status !== 'RESCHEDULED') {
    throw new HttpError(400, 'CANNOT_RESCHEDULE', `Cannot reschedule appointment in status ${app.status}.`);
  }

  const startDate = new Date(newStartAt);
  if (isNaN(startDate.getTime())) {
    throw new HttpError(400, 'INVALID_START_TIME', 'Invalid start time format.');
  }
  const endDate = new Date(startDate.getTime() + app.total_duration_minutes * 60 * 1000);

  try {
    const { rows: updateRows } = await db.query<{
      id: string;
      branch_id: string;
      start_at: Date;
      end_at: Date;
      status: string;
    }>(
      `UPDATE salon_appointments
       SET start_at = $1, end_at = $2, status = 'RESCHEDULED', updated_at = now()
       WHERE id = $3
       RETURNING id, branch_id, start_at, end_at, status`,
      [startDate.toISOString(), endDate.toISOString(), appointmentId],
    );

    return updateRows[0]!;
  } catch (err: any) {
    if (err.code === '23P01') {
      throw new HttpError(
        409,
        'SLOT_ALREADY_BOOKED',
        'This slot was just booked by another customer. Please select another slot.',
      );
    }
    throw err;
  }
}


