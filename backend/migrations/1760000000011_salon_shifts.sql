-- Up Migration
CREATE TABLE salon_shifts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id  uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  start_at   timestamptz NOT NULL DEFAULT now(),
  end_at     timestamptz,
  status     text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX salon_shifts_branch_status_idx ON salon_shifts(branch_id, status);
CREATE INDEX salon_shifts_barber_status_idx ON salon_shifts(barber_id, status);

CREATE TRIGGER salon_shifts_set_updated_at BEFORE UPDATE ON salon_shifts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE salon_shifts;
