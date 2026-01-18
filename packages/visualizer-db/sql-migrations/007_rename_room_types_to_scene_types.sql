-- Migration: Rename room_types to scene_types in product table
-- This migration renames the column to align with the new settings structure
-- which uses scene types instead of room types for better semantic clarity.

-- Rename the column
ALTER TABLE product RENAME COLUMN room_types TO scene_types;

-- Add comment for documentation
COMMENT ON COLUMN product.scene_types IS 'Array of scene types this product is compatible with (e.g., Living-Room, Office, Bedroom)';

