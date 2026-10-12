-- Up Migration
CREATE TABLE role_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('SUPER_ADMIN', 'OWNER', 'RECEPTIONIST', 'BARBER')),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'SUPER_ADMIN') = (business_id IS NULL))
);
CREATE INDEX role_assignments_user_idx ON role_assignments(user_id);
CREATE TRIGGER role_assignments_set_updated_at BEFORE UPDATE ON role_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE role_assignments;
