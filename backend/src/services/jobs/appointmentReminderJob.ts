import { pool } from '../../db/pool.js';
import { dispatchPushInBackground } from '../../modules/notifications/notificationDispatcher.js';

interface ReminderTarget {
  id: string;
  customer_id: string;
  start_at: Date;
  barber_name: string | null;
}

/**
 * Checks for upcoming appointments 50-70 mins away with no reminder sent,
 * marks reminder_sent_at, and dispatches push notifications.
 */
export async function runAppointmentReminderCheck(): Promise<number> {
  const { rows } = await pool.query<ReminderTarget>(
    `SELECT a.id, a.customer_id, a.start_at, bu.name AS barber_name
     FROM salon_appointments a
     LEFT JOIN users bu ON a.barber_id = bu.id
     WHERE a.status IN ('CONFIRMED', 'RESCHEDULED')
       AND a.reminder_sent_at IS NULL
       AND a.start_at >= now() + interval '50 minutes'
       AND a.start_at <= now() + interval '70 minutes'`,
  );

  let sentCount = 0;
  for (const app of rows) {
    const updateRes = await pool.query(
      `UPDATE salon_appointments 
       SET reminder_sent_at = now() 
       WHERE id = $1 AND reminder_sent_at IS NULL`,
      [app.id],
    );

    if ((updateRes.rowCount ?? 0) > 0) {
      const timeStr = new Date(app.start_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      dispatchPushInBackground(
        app.customer_id,
        'appointment_reminder',
        {
          barberName: app.barber_name || undefined,
          time: timeStr,
        },
        { screen: 'Appointments', appointmentId: app.id },
      );
      sentCount++;
    }
  }

  return sentCount;
}

let reminderTimer: NodeJS.Timeout | null = null;

export function startAppointmentReminderJob(intervalMs: number = 60000): void {
  if (reminderTimer) return;
  reminderTimer = setInterval(() => {
    runAppointmentReminderCheck().catch((err) => {
      console.error('[AppointmentReminderJob] Error checking reminders:', err);
    });
  }, intervalMs);
}

export function stopAppointmentReminderJob(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}
