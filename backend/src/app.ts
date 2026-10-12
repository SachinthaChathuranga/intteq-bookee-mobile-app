import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pool } from './db/pool.js';
import { errorHandler } from './middleware/index.js';
import { authRouter } from './modules/auth/routes.js';
import { usersRouter } from './modules/users/routes.js';

import { config } from './config/index.js';
import { devRouter } from './modules/dev/routes.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'db_unavailable' });
    }
  });

  app.use('/auth', authRouter);
  app.use('/me', usersRouter);

  if (config.NODE_ENV !== 'production') {
    app.use('/dev', devRouter);
  }

  app.use(errorHandler);
  return app;
}
