-- Up Migration
ALTER TABLE branches ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Down Migration
ALTER TABLE branches DROP COLUMN IF EXISTS cover_image_url;

