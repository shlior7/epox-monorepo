-- Migration: Add sync_status and original_store_url columns to product_image table
-- This enables tracking of image sync state with store (synced, unsynced, local)

BEGIN;

-- Add the sync_status column with default 'local'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_image' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE product_image ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local';
  END IF;
END $$;

-- Add the original_store_url column for reference when image is unsynced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_image' AND column_name = 'original_store_url'
  ) THEN
    ALTER TABLE product_image ADD COLUMN original_store_url TEXT;
  END IF;
END $$;

COMMIT;
