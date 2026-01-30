-- Step 1: Reassign product_category links from duplicate categories to the surviving one
-- For each (client_id, slug) group, the "survivor" is the oldest category (earliest created_at)
WITH survivors AS (
  SELECT DISTINCT ON (client_id, slug) id, client_id, slug
  FROM category
  ORDER BY client_id, slug, created_at ASC
),
duplicates AS (
  SELECT c.id AS dup_id, s.id AS survivor_id
  FROM category c
  JOIN survivors s ON c.client_id = s.client_id AND c.slug = s.slug
  WHERE c.id != s.id
)
UPDATE product_category pc
SET category_id = d.survivor_id
FROM duplicates d
WHERE pc.category_id = d.dup_id
  AND NOT EXISTS (
    -- Avoid conflict if the product is already linked to the survivor
    SELECT 1 FROM product_category pc2
    WHERE pc2.product_id = pc.product_id AND pc2.category_id = d.survivor_id
  );

-- Step 2: Delete orphaned product_category rows that couldn't be reassigned (already linked to survivor)
WITH survivors AS (
  SELECT DISTINCT ON (client_id, slug) id, client_id, slug
  FROM category
  ORDER BY client_id, slug, created_at ASC
),
duplicates AS (
  SELECT c.id AS dup_id
  FROM category c
  JOIN survivors s ON c.client_id = s.client_id AND c.slug = s.slug
  WHERE c.id != s.id
)
DELETE FROM product_category
WHERE category_id IN (SELECT dup_id FROM duplicates);

-- Step 3: Remove duplicate categories, keeping the oldest one per (client_id, slug)
DELETE FROM category
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id, slug) id
  FROM category
  ORDER BY client_id, slug, created_at ASC
);

-- Step 4: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS category_client_slug_unique ON category (client_id, slug);

-- Step 5: Drop the old non-unique index (replaced by the unique index above)
DROP INDEX IF EXISTS category_slug_idx;
