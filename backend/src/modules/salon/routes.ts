import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config/index.js';
import { HttpError, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import { broadcastBranchEvent } from '../../realtime/ws.js';
import { smsService } from '../../services/sms/index.js';
import { pool } from '../../db/pool.js';
import { normalizePhone } from '../../utils/phone.js';
import { findBranchById, findServicesByBranchId, isBranchOwnedByUser } from '../branch/repo.js';
import {
  autoReassignAll,
  callNext,
  completeService,
  devEnqueueCustomer,
  findBarberQueue,
  markLeft,
  markNoShow,
  reassignQueueEntry,
  reorderQueue,
} from './queueRepo.js';
import {
  acceptInviteByCode,
  cancelInvite,
  createInvite,
  findBarbersByBranchId,
  findInvitesByBranchId,
  updateBarberBranch,
} from './repo.js';
import {
  calculateShiftSummary,
  endShift,
  findCurrentShift,
  findOnShiftBarbers,
  pauseShift,
  resumeShift,
  startShift,
} from './shiftRepo.js';
import { assignGeneralQueueEntry, getBranchLiveFloor } from './liveFloorRepo.js';
import { searchSalonBranches } from './searchRepo.js';
import { calculateWaitTimes, createWalkIn } from './walkInRepo.js';
import {
  cancelAppointment,
  createAppointment,
  getBarberTodayBranch,
  getBranchAvailability,
  getBranchBarbersForCustomer,
  findCustomerActiveQueue,
  getCustomerAppointments,
  joinCustomerLiveQueue,
  leaveCustomerQueue,
  rescheduleAppointment,
} from './appointmentRepo.js';
import { addFavourite, listFavourites, removeFavourite } from './favouritesRepo.js';

export const salonRouter = Router();
salonRouter.use(requireAuth);

const inviteSchema = z.object({
  phone: z
    .string()
    .transform((v, ctx) => {
      if (!v) return null;
      const normalized = normalizePhone(v);
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
        return z.NEVER;
      }
      return normalized;
    })
    .optional()
    .nullable(),
  commission_type: z.enum(['PERCENT', 'FIXED']).default('PERCENT'),
  commission_value: z.number().int().min(0),
});

const updateBarberSchema = z.object({
  commission_type: z.enum(['PERCENT', 'FIXED']).optional(),
  commission_value: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const acceptInviteSchema = z.object({
  code: z.string().trim().min(4).max(10),
});

const completeServiceSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(['CASH', 'CARD', 'TRANSFER']),
  tip: z.number().min(0).optional(),
});

const reassignSchema = z.object({
  target_barber_id: z.string().uuid(),
});

const reorderSchema = z.object({
  entry_ids: z.array(z.string().uuid()),
});

const devEnqueueSchema = z.object({
  customerName: z.string().min(1),
  tokenNumber: z.string().optional(),
  serviceIds: z.array(z.string().uuid()),
  barberId: z.string().uuid().optional().nullable(),
  queueType: z.enum(['BARBER', 'GENERAL']).optional(),
});

// --- Owner: List barbers and active invites for a branch ---
salonRouter.get('/branches/:branchId/barbers', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }

    const barbers = await findBarbersByBranchId(branchId);
    const invites = await findInvitesByBranchId(branchId);
    res.json({ barbers, invites });
  } catch (err) {
    next(err);
  }
});

// --- Owner: Create invite for a barber ---
salonRouter.post(
  '/branches/:branchId/invites',
  validateBody(inviteSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
        throw new HttpError(404, 'BRANCH_NOT_FOUND');
      }

      const branch = await findBranchById(branchId);
      const invite = await createInvite(branchId, req.body);

      // If phone was provided, send SMS invitation via SmsService
      let smsMock: string | undefined;
      if (invite.phone) {
        const commText =
          invite.commission_type === 'PERCENT'
            ? `${invite.commission_value}%`
            : `Rs. ${invite.commission_value}`;
        const msg = `You have been invited to join ${branch?.name ?? 'our salon'} on ${config.APP_NAME} (${commText} commission). Your invite code is: ${invite.code}`;
        smsMock = msg;
        await smsService.sendSms(invite.phone, msg);
      }

      res.status(201).json({ invite, sms_mock: smsMock });
    } catch (err) {
      next(err);
    }
  },
);

// --- Owner: Cancel an invite ---
salonRouter.patch('/branches/:branchId/invites/:inviteId/cancel', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const inviteId = String(req.params.inviteId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }

    const cancelled = await cancelInvite(inviteId, branchId);
    if (!cancelled) throw new HttpError(404, 'INVITE_NOT_FOUND');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Owner: Update barber commission ---
salonRouter.patch(
  ['/branches/:branchId/barbers/:barberId', '/branches/:branchId/barbers/:barberId/commission'],
  validateBody(updateBarberSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      const barberId = String(req.params.barberId);
      if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
        throw new HttpError(404, 'BRANCH_NOT_FOUND');
      }

      const updated = await updateBarberBranch(branchId, barberId, req.body);
      if (!updated) throw new HttpError(404, 'BARBER_NOT_FOUND');
      res.json({ ok: true, barber: updated });
    } catch (err) {
      next(err);
    }
  },
);

// --- Barber: Accept invite code ---
salonRouter.post('/invites/accept', validateBody(acceptInviteSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const result = await acceptInviteByCode(req.body.code, userId);
    const branch = await findBranchById(result.branchId);
    res.json({
      ok: true,
      success: true,
      business_name: config.APP_NAME,
      branch_name: branch?.name ?? 'Branch',
      ...result,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVITE_INVALID') {
      return next(new HttpError(400, 'INVITE_INVALID', 'The invite code is invalid or has expired.'));
    }
    next(err);
  }
});

// ============================================================
// --- Milestone 4: Shift Management Endpoints ---
// ============================================================

// Get current shift status for barber & on-shift list in branch
salonRouter.get('/branches/:branchId/shifts/current', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);

    const shift = await findCurrentShift(barberId, branchId);
    const onShiftBarbers = await findOnShiftBarbers(branchId);
    const summary = shift ? await calculateShiftSummary(shift) : null;

    res.json({
      shift,
      on_shift_barbers: onShiftBarbers,
      summary,
    });
  } catch (err) {
    next(err);
  }
});

// Start shift
salonRouter.post('/branches/:branchId/shifts/start', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);

    const shift = await startShift(barberId, branchId);
    broadcastBranchEvent(branchId, { type: 'SHIFT_UPDATED', barberId });
    res.json({ shift });
  } catch (err) {
    next(err);
  }
});

// Pause shift
salonRouter.post('/branches/:branchId/shifts/pause', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const current = await findCurrentShift(barberId, branchId);
    if (!current) throw new HttpError(400, 'NO_ACTIVE_SHIFT');

    const shift = await pauseShift(current.id, barberId);
    broadcastBranchEvent(branchId, { type: 'SHIFT_UPDATED', barberId });
    res.json({ shift });
  } catch (err) {
    next(err);
  }
});

// Resume shift
salonRouter.post('/branches/:branchId/shifts/resume', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const current = await findCurrentShift(barberId, branchId);
    if (!current) throw new HttpError(400, 'NO_ACTIVE_SHIFT');

    const shift = await resumeShift(current.id, barberId);
    broadcastBranchEvent(branchId, { type: 'SHIFT_UPDATED', barberId });
    res.json({ shift });
  } catch (err) {
    next(err);
  }
});

// End shift (requires empty queue)
salonRouter.post('/branches/:branchId/shifts/end', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const current = await findCurrentShift(barberId, branchId);
    if (!current) throw new HttpError(400, 'NO_ACTIVE_SHIFT');

    try {
      const summary = await endShift(current.id, barberId, branchId);
      broadcastBranchEvent(branchId, { type: 'SHIFT_UPDATED', barberId });
      res.json({ summary });
    } catch (err: any) {
      if (err?.message === 'QUEUE_NOT_EMPTY') {
        throw new HttpError(400, 'QUEUE_NOT_EMPTY', 'All waiting customers must be reassigned or resolved before ending shift.');
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// ============================================================
// --- Milestone 4: Queue Management Endpoints ---
// ============================================================

// Get barber queue view
salonRouter.get('/branches/:branchId/queue/barber', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);

    const queueData = await findBarberQueue(barberId, branchId);
    res.json(queueData);
  } catch (err) {
    next(err);
  }
});

// Call next customer in line
salonRouter.post('/branches/:branchId/queue/call-next', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);

    const entry = await callNext(barberId, branchId);
    broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
    res.json({ entry });
  } catch (err) {
    next(err);
  }
});

// Complete service
salonRouter.post(
  '/branches/:branchId/queue/:entryId/complete',
  validateBody(completeServiceSchema),
  async (req, res, next) => {
    try {
      const barberId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      const entryId = String(req.params.entryId);

      const result = await completeService(barberId, entryId, req.body);
      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Mark no show
salonRouter.post('/branches/:branchId/queue/:entryId/no-show', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const entryId = String(req.params.entryId);

    const success = await markNoShow(barberId, entryId);
    if (!success) throw new HttpError(404, 'ENTRY_NOT_FOUND');

    broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Mark left (customer left)
salonRouter.post('/branches/:branchId/queue/:entryId/left', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const entryId = String(req.params.entryId);

    const success = await markLeft(barberId, entryId);
    if (!success) throw new HttpError(404, 'ENTRY_NOT_FOUND');

    broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Reassign specific queue entry
salonRouter.post(
  '/branches/:branchId/queue/:entryId/reassign',
  validateBody(reassignSchema),
  async (req, res, next) => {
    try {
      const barberId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      const entryId = String(req.params.entryId);

      const updated = await reassignQueueEntry(barberId, entryId, req.body.target_barber_id);
      if (!updated) throw new HttpError(404, 'ENTRY_NOT_FOUND');

      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.json({ entry: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Auto-reassign all waiting customers to other active barbers
salonRouter.post('/branches/:branchId/queue/auto-reassign-all', async (req, res, next) => {
  try {
    const barberId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);

    const result = await autoReassignAll(barberId, branchId);
    broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    if (err?.message === 'NO_AVAILABLE_BARBERS') {
      throw new HttpError(400, 'NO_AVAILABLE_BARBERS', 'No other active on-shift barbers available in this branch.');
    }
    next(err);
  }
});

// Reorder barber queue entries
salonRouter.post(
  '/branches/:branchId/queue/reorder',
  validateBody(reorderSchema),
  async (req, res, next) => {
    try {
      const barberId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);

      await reorderQueue(barberId, branchId, req.body.entry_ids);
      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// Dev / Test endpoint to enqueue customer
salonRouter.post(
  '/branches/:branchId/queue/dev-enqueue',
  validateBody(devEnqueueSchema),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const entry = await devEnqueueCustomer(branchId, req.body);
      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.status(201).json({ entry });
    } catch (err) {
      next(err);
    }
  },
);

const walkInSchema = z.object({
  mode: z.enum(['ANONYMOUS', 'VERIFIED']),
  customerName: z.string().optional(),
  phone: z.string().optional(),
  serviceIds: z.array(z.string().uuid()).min(1),
  barberId: z.string().uuid().optional().nullable(),
});

const assignGeneralSchema = z.object({
  target_barber_id: z.string().uuid(),
});

// Live Floor (Receptionist + Barber)
salonRouter.get('/branches/:branchId/live-floor', async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const floor = await getBranchLiveFloor(branchId);
    res.json(floor);
  } catch (err) {
    next(err);
  }
});

// Calculate live wait times
salonRouter.get('/branches/:branchId/wait-times', async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const waitTimes = await calculateWaitTimes(branchId);
    res.json(waitTimes);
  } catch (err) {
    next(err);
  }
});

// Add Walk-in (Anonymous or Verified)
salonRouter.post(
  '/branches/:branchId/walk-ins',
  validateBody(walkInSchema),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const result = await createWalkIn(branchId, req.body);
      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Assign General Queue Entry to Specific Barber
salonRouter.post(
  '/branches/:branchId/queue/:entryId/assign',
  validateBody(assignGeneralSchema),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const entryId = String(req.params.entryId);
      const updated = await assignGeneralQueueEntry(branchId, entryId, req.body.target_barber_id);
      if (!updated) throw new HttpError(404, 'ENTRY_NOT_FOUND');
      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.json({ entry: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Customer Salon Discovery & Search
salonRouter.get('/search', async (req, res, next) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const lng = req.query.lng ? parseFloat(String(req.query.lng)) : undefined;
    const radius_km = req.query.radius_km ? parseFloat(String(req.query.radius_km)) : undefined;

    const salons = await searchSalonBranches({ query, lat, lng, radius_km });
    res.json({ salons });
  } catch (err) {
    next(err);
  }
});

salonRouter.get('/branches', async (req, res, next) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    const salons = await searchSalonBranches({ query });
    res.json({ salons });
  } catch (err) {
    next(err);
  }
});

const createAppointmentSchema = z.object({
  barberId: z.string().uuid().optional().nullable(),
  serviceIds: z.array(z.string().uuid()).min(1),
  startAt: z.string(),
  bookingMode: z.enum(['SPECIFIC', 'ANY']),
  notes: z.string().optional(),
});

const customerJoinQueueSchema = z.object({
  barberId: z.string().uuid().optional().nullable(),
  serviceIds: z.array(z.string().uuid()).min(1),
});

// Check Available Slots for Date & Services
salonRouter.get('/branches/:branchId/availability', async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const date = String(req.query.date || '');
    if (!date) throw new HttpError(400, 'DATE_REQUIRED');

    const serviceIdsParam = req.query.serviceIds;
    let serviceIds: string[] = [];
    if (typeof serviceIdsParam === 'string') {
      serviceIds = serviceIdsParam.split(',').filter(Boolean);
    } else if (Array.isArray(serviceIdsParam)) {
      serviceIds = serviceIdsParam.map(String).filter(Boolean);
    }

    const barberId =
      typeof req.query.barberId === 'string' && req.query.barberId ? req.query.barberId : undefined;

    const availability = await getBranchAvailability(branchId, date, serviceIds, barberId);
    res.json(availability);
  } catch (err) {
    next(err);
  }
});

// Book Appointment (Instant Confirmation with Double-booking prevention)
salonRouter.post(
  '/branches/:branchId/appointments',
  validateBody(createAppointmentSchema),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const userId = (req as unknown as AuthedRequest).userId;
      const appointment = await createAppointment({
        branchId,
        customerId: userId,
        barberId: req.body.barberId,
        serviceIds: req.body.serviceIds,
        startAt: req.body.startAt,
        bookingMode: req.body.bookingMode,
        notes: req.body.notes,
      });

      broadcastBranchEvent(branchId, { type: 'APPOINTMENT_CREATED' });
      res.status(201).json({ appointment });
    } catch (err) {
      next(err);
    }
  },
);

const rescheduleSchema = z.object({
  startAt: z.string().min(10),
});

// Cancel Appointment (Customer or Barber)
salonRouter.post('/appointments/:id/cancel', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const appointmentId = String(req.params.id);
    const result = await cancelAppointment(appointmentId, userId);
    broadcastBranchEvent(result.branch_id, { type: 'APPOINTMENT_UPDATED' });
    res.json({ success: true, appointment: result });
  } catch (err) {
    next(err);
  }
});

// Reschedule Appointment (Customer or Barber)
salonRouter.post(
  '/appointments/:id/reschedule',
  validateBody(rescheduleSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const appointmentId = String(req.params.id);
      const result = await rescheduleAppointment(appointmentId, userId, req.body.startAt);
      broadcastBranchEvent(result.branch_id, { type: 'APPOINTMENT_UPDATED' });
      res.json({ success: true, appointment: result });
    } catch (err) {
      next(err);
    }
  },
);


// App Customer Join Live Queue ("Now — join queue")
salonRouter.post(
  '/branches/:branchId/queue/join',
  validateBody(customerJoinQueueSchema),
  async (req, res, next) => {
    try {
      const branchId = String(req.params.branchId);
      const userId = (req as unknown as AuthedRequest).userId;
      const result = await joinCustomerLiveQueue(
        branchId,
        userId,
        req.body.serviceIds,
        req.body.barberId,
      );

      broadcastBranchEvent(branchId, { type: 'QUEUE_UPDATED' });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Customer: List active barbers across system (for favorite/featured barbers)
salonRouter.get('/barbers', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.name,
        u.avatar_url,
        COALESCE(bp.avg_rating, 5.00)::text AS avg_rating,
        COALESCE(bp.rating_count, 0) AS rating_count,
        b.id AS branch_id,
        b.name AS branch_name,
        biz.name AS business_name
      FROM users u
      JOIN barber_branches bb ON u.id = bb.barber_id
      JOIN branches b ON bb.branch_id = b.id
      JOIN businesses biz ON b.business_id = biz.id
      LEFT JOIN barber_profiles bp ON u.id = bp.user_id
      WHERE bb.is_active = true
      ORDER BY u.id, bb.created_at ASC
    `);
    res.json({ barbers: rows });
  } catch (err) {
    next(err);
  }
});

// Barber's branch today (for barber card entry point)
salonRouter.get('/barbers/:barberId/today-branch', async (req, res, next) => {
  try {
    const barberId = String(req.params.barberId);
    const branchInfo = await getBarberTodayBranch(barberId);
    if (!branchInfo) throw new HttpError(404, 'BARBER_BRANCH_NOT_FOUND');
    res.json(branchInfo);
  } catch (err) {
    next(err);
  }
});

// Customer: List active services for a branch
salonRouter.get('/branches/:branchId/services', async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const services = await findServicesByBranchId(branchId, true);
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

// Customer: List active barbers with today's shift status and offered services
salonRouter.get('/branches/:branchId/barbers-list', async (req, res, next) => {
  try {
    const branchId = String(req.params.branchId);
    const barbers = await getBranchBarbersForCustomer(branchId);
    res.json({ barbers });
  } catch (err) {
    next(err);
  }
});

// Customer: List own booked appointments
salonRouter.get('/customer/appointments', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const appointments = await getCustomerAppointments(userId);
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

// Customer: Get active live queue entry (for Wait Screen and Home card)
salonRouter.get('/customer/active-queue', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const activeQueue = await findCustomerActiveQueue(userId);
    res.json({ activeQueue });
  } catch (err) {
    next(err);
  }
});

// Customer: Leave queue before being called
salonRouter.post('/customer/queue/leave', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const result = await leaveCustomerQueue(userId);
    if (result) {
      broadcastBranchEvent(result.branch_id, { type: 'QUEUE_UPDATED' });
    }
    res.json({ success: true, left: Boolean(result) });
  } catch (err) {
    next(err);
  }
});

const favouriteSchema = z.object({
  type: z.enum(['SALON', 'BARBER']),
  targetId: z.string().uuid(),
});

// Customer: List saved favourites
salonRouter.get('/customer/favourites', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const favourites = await listFavourites(userId);
    res.json({ favourites });
  } catch (err) {
    next(err);
  }
});

// Customer: Add favourite
salonRouter.post(
  '/customer/favourites',
  validateBody(favouriteSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const favourite = await addFavourite(userId, req.body.type, req.body.targetId);
      res.status(201).json({ success: true, favourite });
    } catch (err) {
      next(err);
    }
  },
);

// Customer: Remove favourite
salonRouter.delete(
  '/customer/favourites/:type/:targetId',
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const type = req.params.type as 'SALON' | 'BARBER';
      const targetId = String(req.params.targetId);
      if (type !== 'SALON' && type !== 'BARBER') {
        throw new HttpError(400, 'INVALID_FAVOURITE_TYPE');
      }
      const removed = await removeFavourite(userId, type, targetId);
      res.json({ success: true, removed });
    } catch (err) {
      next(err);
    }
  },
);




