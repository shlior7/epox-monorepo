-- Migration: Add webhook fields to store_connection and externalImageId to product_image/generated_asset
-- For bidirectional store sync feature

-- Add webhook fields to store_connection
ALTER TABLE store_connection
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS webhook_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_events TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_webhook_at TIMESTAMPTZ;

-- Add external image ID to product_image for tracking store images
ALTER TABLE product_image
  ADD COLUMN IF NOT EXISTS external_image_id TEXT;

-- Add index for looking up product images by external ID
CREATE INDEX IF NOT EXISTS idx_product_image_external_id ON product_image(external_image_id);

-- Add sync tracking fields to generated_asset
ALTER TABLE generated_asset
  ADD COLUMN IF NOT EXISTS external_image_id TEXT,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Add index for looking up synced assets by external ID
CREATE INDEX IF NOT EXISTS idx_generated_asset_external_image_id ON generated_asset(external_image_id);
