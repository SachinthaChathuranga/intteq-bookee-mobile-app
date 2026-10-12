import { Router } from 'express';
import { pool, withTransaction } from '../../db/pool.js';
import { requireAuth, type AuthedRequest } from '../../middleware/index.js';
import { findRolesByUserId } from '../users/repo.js';

export const devRouter = Router();

devRouter.use(requireAuth);

/**
 * Seed sample staff workspaces for the authenticated user to test My Workspaces.
 * Only enabled in development / test environments.
 */
devRouter.post('/seed-workspaces', async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;

    await withTransaction(async (client) => {
      // Find or create test business
      let businessId: string;
      const existingBiz = await client.query<{ id: string }>(
        "SELECT id FROM businesses WHERE owner_id = $1 AND name = 'Kasun''s Salon' LIMIT 1",
        [userId],
      );

      if (existingBiz.rows[0]) {
        businessId = existingBiz.rows[0].id;
      } else {
        const createdBiz = await client.query<{ id: string }>(
          "INSERT INTO businesses (owner_id, type, name, status) VALUES ($1, 'SALON', 'Kasun''s Salon', 'active') RETURNING id",
          [userId],
        );
        businessId = createdBiz.rows[0]!.id;
      }

      // Ensure OWNER role
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id)
         VALUES ($1, 'OWNER', $2)
         ON CONFLICT DO NOTHING`,
        [userId, businessId],
      );

      // Ensure BARBER role
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id)
         VALUES ($1, 'BARBER', $2)
         ON CONFLICT DO NOTHING`,
        [userId, businessId],
      );

      // Ensure RECEPTIONIST role
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id)
         VALUES ($1, 'RECEPTIONIST', $2)
         ON CONFLICT DO NOTHING`,
        [userId, businessId],
      );
    });

    const roles = await findRolesByUserId(userId);
    res.json({ success: true, roles });
  } catch (err) {
    next(err);
  }
});
