-- Migration: Add settings column to collection_session table
-- This allows collection-level generation settings (inspiration images, style, lighting)
-- that are shared across all products in the collection.

ALTER TABLE collection_session ADD COLUMN IF NOT EXISTS settings jsonb;

COMMENT ON COLUMN collection_session.settings IS 'Collection-level generation settings (FlowGenerationSettings) shared across all products';

