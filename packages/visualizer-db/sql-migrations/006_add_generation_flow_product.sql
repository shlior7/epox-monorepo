-- Migration: Add generation_flow_product junction table for many-to-many relationship
-- Constraints: max 10 flows per product, max 3 products per flow

BEGIN;

-- ===== 1) Create junction table =====
CREATE TABLE IF NOT EXISTS generation_flow_product (
  id TEXT PRIMARY KEY,
  generation_flow_id TEXT NOT NULL REFERENCES generation_flow(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT generation_flow_product_unique UNIQUE (generation_flow_id, product_id)
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS generation_flow_product_flow_idx
  ON generation_flow_product (generation_flow_id);
CREATE INDEX IF NOT EXISTS generation_flow_product_product_idx
  ON generation_flow_product (product_id);

-- ===== 3) Create function to enforce max 3 products per flow =====
CREATE OR REPLACE FUNCTION check_max_products_per_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM generation_flow_product WHERE generation_flow_id = NEW.generation_flow_id) >= 3 THEN
    RAISE EXCEPTION 'Generation flow cannot have more than 3 products';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 4) Create function to enforce max 10 flows per product =====
CREATE OR REPLACE FUNCTION check_max_flows_per_product()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM generation_flow_product WHERE product_id = NEW.product_id) >= 10 THEN
    RAISE EXCEPTION 'Product cannot have more than 10 generation flows';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 5) Create triggers =====
DROP TRIGGER IF EXISTS enforce_max_products_per_flow ON generation_flow_product;
CREATE TRIGGER enforce_max_products_per_flow
  BEFORE INSERT ON generation_flow_product
  FOR EACH ROW
  EXECUTE FUNCTION check_max_products_per_flow();

DROP TRIGGER IF EXISTS enforce_max_flows_per_product ON generation_flow_product;
CREATE TRIGGER enforce_max_flows_per_product
  BEFORE INSERT ON generation_flow_product
  FOR EACH ROW
  EXECUTE FUNCTION check_max_flows_per_product();

COMMIT;

