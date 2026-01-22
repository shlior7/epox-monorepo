-- Migration: Add is_primary column to product_image table
-- This allows explicit marking of primary images for products

BEGIN;

-- Add the is_primary column with default false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_image' AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE product_image ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add index for efficient primary image lookups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'product_image_primary_idx') THEN
    CREATE INDEX product_image_primary_idx ON product_image (product_id, is_primary);
  END IF;
END $$;

-- Set is_primary = true for the first image (by sort_order) of each product
-- that doesn't already have a primary image
UPDATE product_image pi
SET is_primary = true
WHERE pi.id IN (
  SELECT DISTINCT ON (product_id) id
  FROM product_image
  WHERE product_id NOT IN (
    SELECT product_id FROM product_image WHERE is_primary = true
  )
  ORDER BY product_id, sort_order ASC, created_at ASC
);

COMMIT;
