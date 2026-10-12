-- Up Migration
CREATE TABLE working_hours (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   text NOT NULL DEFAULT '09:00',
  close_time  text NOT NULL DEFAULT '19:00',
  is_closed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, day_of_week)
);
CREATE TRIGGER working_hours_set_updated_at BEFORE UPDATE ON working_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE working_hours;
