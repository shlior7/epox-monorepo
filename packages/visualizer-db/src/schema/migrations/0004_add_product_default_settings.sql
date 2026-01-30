-- Add default_generation_settings column to product table
-- Stores per-product generation defaults (bubbles, prompt, output settings)
-- configured during product creation or via settings page
ALTER TABLE product ADD COLUMN IF NOT EXISTS default_generation_settings jsonb;
