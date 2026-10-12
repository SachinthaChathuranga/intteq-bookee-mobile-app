-- Up Migration
CREATE TABLE salon_transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  barber_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  queue_entry_id    uuid REFERENCES salon_queue_entries(id) ON DELETE SET NULL,
  amount            numeric(10, 2) NOT NULL,
  tip               numeric(10, 2) NOT NULL DEFAULT 0,
  payment_method    text NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER')),
  commission_amount numeric(10, 2) NOT NULL DEFAULT 0,
  completed_at      timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX salon_transactions_branch_barber_idx ON salon_transactions(branch_id, barber_id);
CREATE INDEX salon_transactions_completed_at_idx ON salon_transactions(completed_at);

-- Down Migration
DROP TABLE salon_transactions;
