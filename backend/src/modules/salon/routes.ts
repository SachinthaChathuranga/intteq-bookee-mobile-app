import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config/index.js';
import { HttpError, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import { smsService } from '../../services/sms/index.js';
import { normalizePhone } from '../../utils/phone.js';
import { findBranchById, isBranchOwnedByUser } from '../branch/repo.js';
import {
  acceptInviteByCode,
  cancelInvite,
  createInvite,
  findBarbersByBranchId,
  findInvitesByBranchId,
  updateBarberBranch,
} from './repo.js';

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

// List barbers and active invites for a branch
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

// Create invite for a barber
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
      if (invite.phone) {
        const commText =
          invite.commission_type === 'PERCENT'
            ? `${invite.commission_value}%`
            : `Rs. ${invite.commission_value}`;
        const msg = `You have been invited to join ${branch?.name ?? 'our salon'} on ${config.APP_NAME} (${commText} commission). Your invite code is: ${invite.code}`;
        await smsService.sendSms(invite.phone, msg);
      }

      res.status(201).json({ invite });
    } catch (err) {
      next(err);
    }
  },
);

// Cancel an invite
salonRouter.delete('/branches/:branchId/invites/:inviteId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    const inviteId = String(req.params.inviteId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }
    if (!inviteId) {
      throw new HttpError(404, 'INVITE_NOT_FOUND');
    }

    const cancelled = await cancelInvite(inviteId, branchId);
    if (!cancelled) throw new HttpError(404, 'INVITE_NOT_FOUND');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Update barber commission / active status
salonRouter.patch(
  '/branches/:branchId/barbers/:barberId',
  validateBody(updateBarberSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      const barberId = String(req.params.barberId);
      if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
        throw new HttpError(404, 'BRANCH_NOT_FOUND');
      }
      if (!barberId) {
        throw new HttpError(404, 'BARBER_NOT_FOUND');
      }

      const updated = await updateBarberBranch(branchId, barberId, req.body);
      if (!updated) throw new HttpError(404, 'BARBER_NOT_FOUND');
      res.json({ barber: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Barber accepts invite code
salonRouter.post('/invites/accept', validateBody(acceptInviteSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const result = await acceptInviteByCode(req.body.code, userId);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVITE_INVALID') {
      return next(new HttpError(400, 'INVITE_INVALID', 'The invite code is invalid or has expired.'));
    }
    next(err);
  }
});
