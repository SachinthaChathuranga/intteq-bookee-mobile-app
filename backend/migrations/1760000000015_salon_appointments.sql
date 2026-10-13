-- Up Migration
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE salon_appointments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id    uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  barber_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_mode text NOT NULL CHECK (booking_mode IN ('SPECIFIC', 'ANY')),
  start_at     timestamptz NOT NULL,
  end_at       timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'ARRIVED', 'NO_SHOW', 'COMPLETED')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_appointments_no_double_booking EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('CONFIRMED', 'RESCHEDULED', 'ARRIVED'))
);

CREATE INDEX salon_appointments_branch_date_idx ON salon_appointments(branch_id, start_at);
CREATE INDEX salon_appointments_barber_date_idx ON salon_appointments(barber_id, start_at);
CREATE INDEX salon_appointments_customer_idx ON salon_appointments(customer_id);

CREATE TRIGGER salon_appointments_set_updated_at BEFORE UPDATE ON salon_appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE salon_appointment_services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid NOT NULL REFERENCES salon_appointments(id) ON DELETE CASCADE,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  price            numeric(10, 2) NOT NULL,
  duration_minutes integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX salon_appointment_services_appointment_idx ON salon_appointment_services(appointment_id);

-- Down Migration
DROP TABLE salon_appointment_services;
DROP TABLE salon_appointments;
