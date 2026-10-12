-- Up Migration
CREATE TABLE salon_queue_entries (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id                  uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  queue_type                 text NOT NULL DEFAULT 'BARBER' CHECK (queue_type IN ('BARBER', 'GENERAL')),
  barber_id                  uuid REFERENCES users(id) ON DELETE SET NULL,
  customer_id                uuid REFERENCES users(id) ON DELETE SET NULL,
  walk_in_name               text,
  token_number               text,
  source                     text NOT NULL DEFAULT 'APP' CHECK (source IN ('APP', 'WALK_IN_ANON', 'WALK_IN_VERIFIED', 'APPOINTMENT')),
  manual_position            integer,
  status                     text NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'NO_SHOW', 'LEFT')),
  joined_at                  timestamptz NOT NULL DEFAULT now(),
  assigned_at                timestamptz,
  called_at                  timestamptz,
  completed_at               timestamptz,
  reassigned_from_barber_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX salon_queue_branch_status_idx ON salon_queue_entries(branch_id, status);
CREATE INDEX salon_queue_barber_status_idx ON salon_queue_entries(barber_id, status);

CREATE TRIGGER salon_queue_entries_set_updated_at BEFORE UPDATE ON salon_queue_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE salon_queue_entry_services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id   uuid NOT NULL REFERENCES salon_queue_entries(id) ON DELETE CASCADE,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  price            numeric(10, 2) NOT NULL,
  duration_minutes integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX salon_queue_entry_services_entry_idx ON salon_queue_entry_services(queue_entry_id);

-- Down Migration
DROP TABLE salon_queue_entry_services;
DROP TABLE salon_queue_entries;
