-- Migration: Rename ERP fields to Store fields in product table
-- Date: 2026-01-24
-- Description: Rename erp_id -> store_id, erp_sku -> store_sku, erp_url -> store_url
--              Add store_name field, rename index

-- Rename columns
ALTER TABLE product RENAME COLUMN erp_id TO store_id;
ALTER TABLE product RENAME COLUMN erp_sku TO store_sku;
ALTER TABLE product RENAME COLUMN erp_url TO store_url;

-- Add new column
ALTER TABLE product ADD COLUMN store_name TEXT;

-- Drop old index
DROP INDEX IF EXISTS product_erp_idx;

-- Create new index with updated name
CREATE INDEX product_store_idx ON product(store_connection_id, store_id);

-- Update comments
COMMENT ON COLUMN product.store_id IS 'Original product ID in store (formerly erp_id)';
COMMENT ON COLUMN product.store_sku IS 'Store SKU (formerly erp_sku)';
COMMENT ON COLUMN product.store_url IS 'Product URL in store (formerly erp_url)';
COMMENT ON COLUMN product.store_name IS 'Product name in store (for display)';
