import { Router } from 'express';
import { z } from 'zod';
import { HttpError, requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import { findRolesByUserId, findUserById, updateUser } from './repo.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const user = await findUserById(userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND');
    res.json({ user, roles: await findRolesByUserId(userId) });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch(
  '/',
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(100).optional(),
      language: z.enum(['si', 'ta', 'en']).optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const user = await updateUser((req as AuthedRequest).userId, req.body);
      if (!user) throw new HttpError(404, 'USER_NOT_FOUND');
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
);
