import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, validateBody, type AuthedRequest } from '../../middleware/index.js';
import {
  deleteDeviceToken,
  deleteUserDeviceTokens,
  getUserDeviceTokens,
  saveDeviceToken,
} from './deviceTokenRepo.js';

export const notificationsRouter = Router();

const registerTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(['ios', 'android', 'web']),
});

const deleteTokenSchema = z.object({
  token: z.string().optional(),
});

// Register or update device push token
notificationsRouter.post(
  '/device-token',
  requireAuth,
  validateBody(registerTokenSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { token, platform } = req.body;
      const saved = await saveDeviceToken(userId, token, platform);
      res.json({ ok: true, deviceToken: saved });
    } catch (err) {
      next(err);
    }
  },
);

// Delete device push token on logout
notificationsRouter.delete(
  '/device-token',
  requireAuth,
  validateBody(deleteTokenSchema),
  async (req, res, next) => {
    try {
      const userId = (req as unknown as AuthedRequest).userId;
      const { token } = req.body;
      if (token) {
        await deleteDeviceToken(token);
      } else {
        await deleteUserDeviceTokens(userId);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// Get current user's registered tokens
notificationsRouter.get('/device-tokens', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const tokens = await getUserDeviceTokens(userId);
    res.json({ tokens });
  } catch (err) {
    next(err);
  }
});
