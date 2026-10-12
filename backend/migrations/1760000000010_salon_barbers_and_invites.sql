-- Up Migration
CREATE TABLE barber_profiles (
  user_id      uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio          text,
  photo_url    text,
  avg_rating   numeric(3, 2) NOT NULL DEFAULT 5.00,
  rating_count integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER barber_profiles_set_updated_at BEFORE UPDATE ON barber_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE barber_branches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id        uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  commission_type  text NOT NULL CHECK (commission_type IN ('PERCENT', 'FIXED')),
  commission_value integer NOT NULL CHECK (commission_value >= 0),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barber_id, branch_id)
);
CREATE INDEX barber_branches_branch_idx ON barber_branches(branch_id);
CREATE TRIGGER barber_branches_set_updated_at BEFORE UPDATE ON barber_branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE barber_services (
  barber_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);

CREATE TABLE invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id        uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  phone            text,
  code             text NOT NULL UNIQUE,
  commission_type  text NOT NULL DEFAULT 'PERCENT' CHECK (commission_type IN ('PERCENT', 'FIXED')),
  commission_value integer NOT NULL DEFAULT 40,
  expires_at       timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invites_branch_idx ON invites(branch_id);
CREATE INDEX invites_code_idx ON invites(code);
CREATE TRIGGER invites_set_updated_at BEFORE UPDATE ON invites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE invites;
DROP TABLE barber_services;
DROP TABLE barber_branches;
DROP TABLE barber_profiles;
