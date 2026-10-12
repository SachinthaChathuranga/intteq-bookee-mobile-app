import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().min(1),
  APP_SLUG: z.string().min(1),
  SUPPORT_CONTACT: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  OTP_HMAC_SECRET: z.string().min(16),
  SMS_PROVIDER: z.enum(['console', 'notify_lk']).default('console'),
  NOTIFY_LK_USER_ID: z.string().optional(),
  NOTIFY_LK_API_KEY: z.string().optional(),
  NOTIFY_LK_SENDER_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
