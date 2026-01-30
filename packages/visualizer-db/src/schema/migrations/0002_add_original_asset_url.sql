-- Migration: Add original_asset_url column to generated_asset table
-- Date: 2026-01-29
-- Description: Store PNG original URL alongside WebP display URL for dual-format downloads

ALTER TABLE generated_asset ADD COLUMN original_asset_url TEXT;
