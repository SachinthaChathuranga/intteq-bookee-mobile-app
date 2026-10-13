-- Up Migration
CREATE TABLE favourites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('SALON', 'BARBER')),
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favourites_user_type_target_unique UNIQUE (customer_id, type, target_id)
);

CREATE INDEX favourites_customer_type_idx ON favourites(customer_id, type);
CREATE INDEX favourites_target_idx ON favourites(target_id);

-- Down Migration
DROP TABLE favourites;
