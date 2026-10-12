import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validateBody } from '../../middleware/index.js';
import { normalizePhone } from '../../utils/phone.js';
import { logout, refreshSession, requestOtp, verifyOtp } from './service.js';

export const authRouter = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const phoneField = z.string().transform((v, ctx) => {
  const phone = normalizePhone(v);
  if (!phone) {
    ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
    return z.NEVER;
  }
  return phone;
});

authRouter.post(
  '/otp/request',
  otpLimiter,
  validateBody(z.object({ phone: phoneField })),
  async (req, res, next) => {
    try {
      await requestOtp(req.body.phone);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/otp/verify',
  otpLimiter,
  validateBody(z.object({ phone: phoneField, code: z.string().regex(/^\d{6}$/) })),
  async (req, res, next) => {
    try {
      const session = await verifyOtp(req.body.phone, req.body.code);
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/refresh',
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      res.json(await refreshSession(req.body.refreshToken));
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/logout',
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  async (req, res, next) => {
    try {
      await logout(req.body.refreshToken);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);
