import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { HttpError, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import {
  createBranch,
  createService,
  findBranchesByOwnerId,
  findBranchById,
  findServicesByBranchId,
  findWorkingHoursByBranchId,
  isBranchOwnedByUser,
  updateBranch,
  updateService,
  upsertWorkingHours,
} from './repo.js';

export const ownerBranchRouter = Router();
ownerBranchRouter.use(requireAuth);

const workingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  is_closed: z.boolean(),
});

const createBranchSchema = z.object({
  business_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  working_hours: z.array(workingHourSchema).optional(),
});

const updateBranchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  address: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  working_hours: z.array(workingHourSchema).optional(),
});

const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().int().min(0),
  duration_minutes: z.number().int().min(1).max(720),
});

const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  price: z.number().int().min(0).optional(),
  duration_minutes: z.number().int().min(1).max(720).optional(),
  is_active: z.boolean().optional(),
});

// List all branches for the owner
ownerBranchRouter.get('/branches', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branches = await findBranchesByOwnerId(userId);
    res.json({ branches });
  } catch (err) {
    next(err);
  }
});

// Create branch
ownerBranchRouter.post('/branches', validateBody(createBranchSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    let businessId = req.body.business_id;

    if (!businessId) {
      // Find or create default business for this owner
      const bizRes = await pool.query<{ id: string }>(
        'SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1',
        [userId],
      );
      if (bizRes.rows[0]) {
        businessId = bizRes.rows[0].id;
      } else {
        const createdBiz = await pool.query<{ id: string }>(
          "INSERT INTO businesses (owner_id, type, name, status) VALUES ($1, 'SALON', 'My Salon', 'active') RETURNING id",
          [userId],
        );
        businessId = createdBiz.rows[0]!.id;
      }
    }

    const branch = await createBranch(businessId, req.body, req.body.working_hours);
    const workingHours = await findWorkingHoursByBranchId(branch.id);
    res.status(201).json({ branch, workingHours });
  } catch (err) {
    next(err);
  }
});

// Get branch details
ownerBranchRouter.get('/branches/:branchId', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }

    const branch = await findBranchById(branchId);
    const workingHours = await findWorkingHoursByBranchId(branchId);
    const services = await findServicesByBranchId(branchId);
    res.json({ branch, workingHours, services });
  } catch (err) {
    next(err);
  }
});

// Update branch
ownerBranchRouter.patch('/branches/:branchId', validateBody(updateBranchSchema), async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }

    const branch = await updateBranch(branchId, req.body);
    let workingHours = await findWorkingHoursByBranchId(branchId);
    if (req.body.working_hours) {
      workingHours = await upsertWorkingHours(branchId, req.body.working_hours);
    }
    res.json({ branch, workingHours });
  } catch (err) {
    next(err);
  }
});

// List services for branch
ownerBranchRouter.get('/branches/:branchId/services', async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const branchId = String(req.params.branchId);
    if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
      throw new HttpError(404, 'BRANCH_NOT_FOUND');
    }

    const services = await findServicesByBranchId(branchId);
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

// Create service in branch
ownerBranchRouter.post(
  '/branches/:branchId/services',
  validateBody(createServiceSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
        throw new HttpError(404, 'BRANCH_NOT_FOUND');
      }

      const service = await createService(branchId, req.body);
      res.status(201).json({ service });
    } catch (err) {
      next(err);
    }
  },
);

// Update service
ownerBranchRouter.patch(
  '/branches/:branchId/services/:serviceId',
  validateBody(updateServiceSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const branchId = String(req.params.branchId);
      const serviceId = String(req.params.serviceId);
      if (!branchId || !(await isBranchOwnedByUser(branchId, userId))) {
        throw new HttpError(404, 'BRANCH_NOT_FOUND');
      }
      if (!serviceId) {
        throw new HttpError(404, 'SERVICE_NOT_FOUND');
      }

      const service = await updateService(serviceId, req.body);
      if (!service) throw new HttpError(404, 'SERVICE_NOT_FOUND');
      res.json({ service });
    } catch (err) {
      next(err);
    }
  },
);
