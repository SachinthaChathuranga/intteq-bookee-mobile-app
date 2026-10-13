import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sentSms: { phone: string; message: string }[] = [];
vi.mock('../src/services/sms/index.js', () => ({
  smsService: {
    sendSms: async (phone: string, message: string) => {
      sentSms.push({ phone, message });
    },
  },
}));

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const app = createApp();

const OWNER_PHONE = '0772221111';
const BARBER_PHONE = '0773332222';
const lastCode = () => /(\d{6})/.exec(sentSms.at(-1)!.message)![1]!;

async function createUserSession(phone: string, name: string) {
  sentSms.length = 0;
  await request(app).post('/auth/otp/request').send({ phone }).expect(204);
  const otp = lastCode();
  const verifyRes = await request(app)
    .post('/auth/otp/verify')
    .send({ phone, code: otp })
    .expect(200);

  const token = verifyRes.body.accessToken;
  await request(app)
    .patch('/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ name })
    .expect(200);

  return { token, userId: verifyRes.body.user.id };
}

beforeEach(async () => {
  sentSms.length = 0;
  await pool.query('DELETE FROM invites');
  await pool.query('DELETE FROM barber_services');
  await pool.query('DELETE FROM barber_branches');
  await pool.query('DELETE FROM barber_profiles');
  await pool.query('DELETE FROM salon_appointments');
  await pool.query('DELETE FROM services');
  await pool.query('DELETE FROM working_hours');
  await pool.query('DELETE FROM role_assignments');
  await pool.query('DELETE FROM branches');
  await pool.query('DELETE FROM businesses');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM otp_codes');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('Owner Setup (Milestone 3)', () => {
  it('manages branches, working hours, services, and barber invites with commission', async () => {
    const owner = await createUserSession(OWNER_PHONE, 'Kasun Owner');
    const barber = await createUserSession(BARBER_PHONE, 'Amal Barber');

    // 1. Create a Branch
    const createBranchRes = await request(app)
      .post('/owner/branches')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Kasun Salon Main',
        address: '123 Galle Road, Colombo 03',
        phone: '0112345678',
      })
      .expect(201);

    const branch = createBranchRes.body.branch;
    expect(branch.name).toBe('Kasun Salon Main');
    expect(createBranchRes.body.workingHours.length).toBe(7);

    // 2. Fetch branch details
    const branchDetails = await request(app)
      .get(`/owner/branches/${branch.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(branchDetails.body.branch.id).toBe(branch.id);
    expect(branchDetails.body.workingHours.length).toBe(7);

    // 3. Update branch and custom working hours
    const updatedBranchRes = await request(app)
      .patch(`/owner/branches/${branch.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Kasun Salon Flagship',
        working_hours: [
          { day_of_week: 0, open_time: '10:00', close_time: '17:00', is_closed: false },
        ],
      })
      .expect(200);
    expect(updatedBranchRes.body.branch.name).toBe('Kasun Salon Flagship');
    const sundayHours = updatedBranchRes.body.workingHours.find((h: { day_of_week: number }) => h.day_of_week === 0);
    expect(sundayHours.open_time).toBe('10:00');
    expect(sundayHours.is_closed).toBe(false);

    // 4. Create Services
    const serviceRes1 = await request(app)
      .post(`/owner/branches/${branch.id}/services`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Classic Haircut',
        price: 800,
        duration_minutes: 30,
      })
      .expect(201);
    expect(serviceRes1.body.service.name).toBe('Classic Haircut');
    expect(serviceRes1.body.service.price).toBe(800);

    const serviceRes2 = await request(app)
      .post(`/owner/branches/${branch.id}/services`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Beard Trim',
        price: 400,
        duration_minutes: 15,
      })
      .expect(201);

    // 5. List and update service
    const listServices = await request(app)
      .get(`/owner/branches/${branch.id}/services`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(listServices.body.services.length).toBe(2);

    await request(app)
      .patch(`/owner/branches/${branch.id}/services/${serviceRes1.body.service.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ price: 900 })
      .expect(200);

    // 6. Invite a barber with 40% commission
    sentSms.length = 0;
    const inviteRes = await request(app)
      .post(`/salon/branches/${branch.id}/invites`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        phone: '0773332222',
        commission_type: 'PERCENT',
        commission_value: 40,
      })
      .expect(201);

    const invite = inviteRes.body.invite;
    expect(invite.code.length).toBe(6);
    expect(invite.commission_type).toBe('PERCENT');
    expect(invite.commission_value).toBe(40);
    expect(sentSms.length).toBe(1);
    expect(sentSms[0]!.message).toContain(invite.code);

    // 7. Barber accepts the invite
    const acceptRes = await request(app)
      .post('/salon/invites/accept')
      .set('Authorization', `Bearer ${barber.token}`)
      .send({ code: invite.code })
      .expect(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.branchId).toBe(branch.id);

    // Barber's roles should now include BARBER
    const barberMe = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${barber.token}`)
      .expect(200);
    expect(barberMe.body.roles.some((r: { role: string; branch_id: string }) => r.role === 'BARBER' && r.branch_id === branch.id)).toBe(true);

    // 8. Owner lists barbers for the branch
    const branchBarbers = await request(app)
      .get(`/salon/branches/${branch.id}/barbers`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(branchBarbers.body.barbers.length).toBe(1);
    expect(branchBarbers.body.barbers[0].name).toBe('Amal Barber');
    expect(branchBarbers.body.barbers[0].commission_type).toBe('PERCENT');
    expect(branchBarbers.body.barbers[0].commission_value).toBe(40);

    // 9. Update barber commission to fixed Rs. 350 per service
    const updatedBarberRes = await request(app)
      .patch(`/salon/branches/${branch.id}/barbers/${barber.userId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        commission_type: 'FIXED',
        commission_value: 350,
      })
      .expect(200);
    expect(updatedBarberRes.body.barber.commission_type).toBe('FIXED');
    expect(updatedBarberRes.body.barber.commission_value).toBe(350);

    // 10. Authorization protection: Barber cannot access owner branch management
    await request(app)
      .get(`/owner/branches/${branch.id}`)
      .set('Authorization', `Bearer ${barber.token}`)
      .expect(404);
  });
});
