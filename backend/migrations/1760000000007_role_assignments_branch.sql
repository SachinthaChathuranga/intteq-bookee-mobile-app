-- Up Migration
ALTER TABLE role_assignments
  ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE CASCADE;
CREATE INDEX role_assignments_branch_idx ON role_assignments(branch_id);

-- Down Migration
DROP INDEX IF EXISTS role_assignments_branch_idx;
ALTER TABLE role_assignments
  DROP COLUMN branch_id;
