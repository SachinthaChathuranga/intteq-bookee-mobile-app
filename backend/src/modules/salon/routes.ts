import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config/index.js';
import { HttpError, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import { broadcastBranchEvent } from '../../realtime/ws.js';
import { smsService } from '../../services/sms/index.js';
import { normalizePhone } from '../../utils/phone.js';
import { findBranchById, isBranchOwnedByUser } from '../branch/repo.js';
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
import { calculateWaitTimes, createWalkIn } from './walkInRepo.js';

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

