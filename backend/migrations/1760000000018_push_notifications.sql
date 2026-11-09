-- Up Migration
CREATE TABLE device_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE TRIGGER device_tokens_set_updated_at BEFORE UPDATE ON device_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE salon_appointments ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_salon_appointments_reminder ON salon_appointments(start_at) 
  WHERE status IN ('CONFIRMED', 'RESCHEDULED') AND reminder_sent_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS device_tokens;
DROP INDEX IF EXISTS idx_salon_appointments_reminder;
ALTER TABLE salon_appointments DROP COLUMN IF EXISTS reminder_sent_at;
