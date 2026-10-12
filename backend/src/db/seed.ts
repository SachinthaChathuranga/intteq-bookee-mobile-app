import 'dotenv/config';
import { config } from '../config/index.js';
import { pool, withTransaction } from './pool.js';
import { normalizePhone } from '../utils/phone.js';

interface TestUserDef {
  phoneRaw: string;
  name: string;
  roleDescription: string;
}

const TEST_USERS: TestUserDef[] = [
  { phoneRaw: '0770000100', name: 'Nimal', roleDescription: 'Customer' },
  { phoneRaw: '0770000200', name: 'Kasun', roleDescription: 'Owner' },
  { phoneRaw: '0770000300', name: 'Amal', roleDescription: 'Barber' },
  { phoneRaw: '0770000400', name: 'Saman', roleDescription: 'Receptionist' },
  { phoneRaw: '0770000500', name: 'Super Admin', roleDescription: 'Super Admin' },
];

const SERVICES_DEF = [
  { name: 'Haircut', price: 500, duration_minutes: 30 },
  { name: 'Beard', price: 300, duration_minutes: 15 },
  { name: 'Haircut + Beard', price: 700, duration_minutes: 45 },
  { name: 'Kids cut', price: 400, duration_minutes: 20 },
];

export async function runSeed() {
  // Rule 1: Refuse to run unless NODE_ENV === 'development'
  if (config.NODE_ENV !== 'development' || process.env.NODE_ENV !== 'development') {
    console.error(
      `❌ Refusing to seed: NODE_ENV must be 'development'. Current: config=${config.NODE_ENV}, process.env=${process.env.NODE_ENV}`,
    );
    throw new Error('REFUSE_SEED_NON_DEV');
  }

  console.log('🌱 Starting Bookee development database seed...');

  await withTransaction(async (client) => {
    // 1. Upsert Test Users
    const userMap: Record<string, string> = {};

    for (const u of TEST_USERS) {
      const normalized = normalizePhone(u.phoneRaw);
      if (!normalized) throw new Error(`Invalid phone number: ${u.phoneRaw}`);

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (phone, name, is_app_user, language, theme)
         VALUES ($1, $2, true, 'en', 'light')
         ON CONFLICT (phone) DO UPDATE
         SET name = EXCLUDED.name, is_app_user = true
         RETURNING id`,
        [normalized, u.name],
      );
      userMap[u.phoneRaw] = rows[0]!.id;
      console.log(`  👤 User [${u.roleDescription}]: ${u.name} (${u.phoneRaw} -> ${normalized})`);
    }

    const customerId = userMap['0770000100']!;
    const ownerId = userMap['0770000200']!;
    const barberId = userMap['0770000300']!;
    const receptionistId = userMap['0770000400']!;
    const adminId = userMap['0770000500']!;

    // 2. Owner: Kasun's Salon Business
    let businessId: string;
    const bizRes = await client.query<{ id: string }>(
      `SELECT id FROM businesses WHERE owner_id = $1 AND name = $2 LIMIT 1`,
      [ownerId, "Kasun's Salon"],
    );
    if (bizRes.rows[0]) {
      businessId = bizRes.rows[0].id;
    } else {
      const newBiz = await client.query<{ id: string }>(
        `INSERT INTO businesses (owner_id, name, type, status)
         VALUES ($1, $2, 'SALON', 'active')
         RETURNING id`,
        [ownerId, "Kasun's Salon"],
      );
      businessId = newBiz.rows[0]!.id;
    }
    console.log(`  🏢 Business: Kasun's Salon (${businessId})`);

    // Ensure Owner role assignment
    const ownerRoleRes = await client.query(
      `SELECT id FROM role_assignments WHERE user_id = $1 AND role = 'OWNER' AND business_id = $2`,
      [ownerId, businessId],
    );
    if (ownerRoleRes.rowCount === 0) {
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id) VALUES ($1, 'OWNER', $2)`,
        [ownerId, businessId],
      );
    }

    // 3. Branches: Colombo and Kandy
    const branchDefs = [
      { name: 'Colombo', address: '123 Galle Road, Colombo 03', phone: '0112000001', lat: 6.9271, lng: 79.8612 },
      { name: 'Kandy', address: '45 Peradeniya Road, Kandy', phone: '0812000002', lat: 7.2906, lng: 80.6337 },
    ];

    const branchMap: Record<string, string> = {};

    for (const bDef of branchDefs) {
      let branchId: string;
      const bRes = await client.query<{ id: string }>(
        `SELECT id FROM branches WHERE business_id = $1 AND name = $2 LIMIT 1`,
        [businessId, bDef.name],
      );
      if (bRes.rows[0]) {
        branchId = bRes.rows[0].id;
        await client.query(
          `UPDATE branches SET address = $1, phone = $2, lat = $3, lng = $4 WHERE id = $5`,
          [bDef.address, bDef.phone, bDef.lat, bDef.lng, branchId],
        );
      } else {
        const newBranch = await client.query<{ id: string }>(
          `INSERT INTO branches (business_id, name, address, phone, lat, lng)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [businessId, bDef.name, bDef.address, bDef.phone, bDef.lat, bDef.lng],
        );
        branchId = newBranch.rows[0]!.id;
      }
      branchMap[bDef.name] = branchId;
      console.log(`  📍 Branch: ${bDef.name} (${branchId}) [${bDef.lat}, ${bDef.lng}]`);

      // Working Hours (Mon-Sat 09:00-19:00, Sun 10:00-16:00)
      for (let day = 0; day <= 6; day++) {
        const isSunday = day === 0;
        const openTime = isSunday ? '10:00' : '09:00';
        const closeTime = isSunday ? '16:00' : '19:00';

        await client.query(
          `INSERT INTO working_hours (branch_id, day_of_week, open_time, close_time, is_closed)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT (branch_id, day_of_week) DO UPDATE
           SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time, is_closed = false`,
          [branchId, day, openTime, closeTime],
        );
      }

      // 4 Services per branch
      const serviceIds: string[] = [];
      for (const sDef of SERVICES_DEF) {
        let serviceId: string;
        const sRes = await client.query<{ id: string }>(
          `SELECT id FROM services WHERE branch_id = $1 AND name = $2 LIMIT 1`,
          [branchId, sDef.name],
        );
        if (sRes.rows[0]) {
          serviceId = sRes.rows[0].id;
          await client.query(
            `UPDATE services SET price = $1, duration_minutes = $2, is_active = true WHERE id = $3`,
            [sDef.price, sDef.duration_minutes, serviceId],
          );
        } else {
          const newSvc = await client.query<{ id: string }>(
            `INSERT INTO services (branch_id, name, price, duration_minutes, is_active)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id`,
            [branchId, sDef.name, sDef.price, sDef.duration_minutes],
          );
          serviceId = newSvc.rows[0]!.id;
        }
        serviceIds.push(serviceId);
      }
      console.log(`    ✂️ 4 Services seeded for ${bDef.name}`);

      // Link Barber Amal to branch services
      for (const sId of serviceIds) {
        await client.query(
          `INSERT INTO barber_services (barber_id, service_id)
           VALUES ($1, $2)
           ON CONFLICT (barber_id, service_id) DO NOTHING`,
          [barberId, sId],
        );
      }
    }

    const colomboId = branchMap['Colombo']!;
    const kandyId = branchMap['Kandy']!;

    // 4. Barber: Amal
    // Barber Profile
    await client.query(
      `INSERT INTO barber_profiles (user_id, bio, avg_rating, rating_count)
       VALUES ($1, 'Master Barber with 8 years experience', 5.0, 10)
       ON CONFLICT (user_id) DO UPDATE
       SET bio = EXCLUDED.bio`,
      [barberId],
    );

    // Assign Amal to both branches with 40% commission
    for (const bId of [colomboId, kandyId]) {
      await client.query(
        `INSERT INTO barber_branches (barber_id, branch_id, commission_type, commission_value, is_active)
         VALUES ($1, $2, 'PERCENT', 40, true)
         ON CONFLICT (barber_id, branch_id) DO UPDATE
         SET commission_type = 'PERCENT', commission_value = 40, is_active = true`,
        [barberId, bId],
      );

      // Barber Role assignment per branch
      const barberRoleRes = await client.query(
        `SELECT id FROM role_assignments
         WHERE user_id = $1 AND role = 'BARBER' AND business_id = $2 AND branch_id = $3`,
        [barberId, businessId, bId],
      );
      if (barberRoleRes.rowCount === 0) {
        await client.query(
          `INSERT INTO role_assignments (user_id, role, business_id, branch_id)
           VALUES ($1, 'BARBER', $2, $3)`,
          [barberId, businessId, bId],
        );
      }
    }
    console.log(`  💈 Barber: Amal assigned to Colombo & Kandy (40% commission)`);

    // 5. Receptionist: Saman (Colombo branch)
    const recepRoleRes = await client.query(
      `SELECT id FROM role_assignments
       WHERE user_id = $1 AND role = 'RECEPTIONIST' AND business_id = $2 AND branch_id = $3`,
      [receptionistId, businessId, colomboId],
    );
    if (recepRoleRes.rowCount === 0) {
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id, branch_id)
         VALUES ($1, 'RECEPTIONIST', $2, $3)`,
        [receptionistId, businessId, colomboId],
      );
    }
    console.log(`  🛎️ Receptionist: Saman assigned to Colombo branch`);

    // 6. Super Admin: 0770000500
    const adminRoleRes = await client.query(
      `SELECT id FROM role_assignments
       WHERE user_id = $1 AND role = 'SUPER_ADMIN' AND business_id IS NULL`,
      [adminId],
    );
    if (adminRoleRes.rowCount === 0) {
      await client.query(
        `INSERT INTO role_assignments (user_id, role, business_id)
         VALUES ($1, 'SUPER_ADMIN', NULL)`,
        [adminId],
      );
    }
    console.log(`  🛡️ Super Admin: 0770000500 configured`);
  });

  console.log('✅ Development seed completed successfully!');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Error seeding database:', err);
      await pool.end();
      process.exit(1);
    });
}
