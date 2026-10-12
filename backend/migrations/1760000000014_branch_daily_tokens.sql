-- Up Migration
CREATE TABLE branch_daily_tokens (
  branch_id  uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  token_date date NOT NULL,
  last_seq   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (branch_id, token_date)
);

CREATE INDEX branch_daily_tokens_lookup_idx ON branch_daily_tokens(branch_id, token_date);

-- Down Migration
DROP TABLE branch_daily_tokens;
