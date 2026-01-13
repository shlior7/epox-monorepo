-- Migration Plan: Neon schema -> current visualizer-db schema
-- See Design Log #010, #001, #003 for context.

BEGIN;

-- Needed for gen_random_uuid() when backfilling text IDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== 1) Rename session / flow / asset tables =====
DO $$
BEGIN
  IF to_regclass('public.studio_session') IS NOT NULL AND to_regclass('public.collection_session') IS NULL THEN
    ALTER TABLE studio_session RENAME TO collection_session;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.flow') IS NOT NULL AND to_regclass('public.generation_flow') IS NULL THEN
    ALTER TABLE flow RENAME TO generation_flow;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.generated_image') IS NOT NULL AND to_regclass('public.generated_asset') IS NULL THEN
    ALTER TABLE generated_image RENAME TO generated_asset;
  END IF;
END $$;

-- ===== 2) Rename columns for new naming =====
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generation_flow' AND column_name = 'studio_session_id') THEN
    ALTER TABLE generation_flow RENAME COLUMN studio_session_id TO collection_session_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'studio_session_id') THEN
    ALTER TABLE message RENAME COLUMN studio_session_id TO collection_session_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_asset' AND column_name = 'flow_id') THEN
    ALTER TABLE generated_asset RENAME COLUMN flow_id TO generation_flow_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generated_asset' AND column_name = 'r2_key') THEN
    ALTER TABLE generated_asset RENAME COLUMN r2_key TO asset_url;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'favorite_image' AND column_name = 'generated_image_id') THEN
    ALTER TABLE favorite_image RENAME COLUMN generated_image_id TO generated_asset_id;
  END IF;
END $$;

-- ===== 3) Rename indexes to match new table/column names (avoid duplicates) =====
DO $$
BEGIN
  IF to_regclass('public.flow_studio_session_id_idx') IS NOT NULL
     AND to_regclass('public.generation_flow_collection_session_id_idx') IS NULL THEN
    ALTER INDEX flow_studio_session_id_idx RENAME TO generation_flow_collection_session_id_idx;
  END IF;

  IF to_regclass('public.generated_image_client_id_idx') IS NOT NULL
     AND to_regclass('public.generated_asset_client_id_idx') IS NULL THEN
    ALTER INDEX generated_image_client_id_idx RENAME TO generated_asset_client_id_idx;
  END IF;
  IF to_regclass('public.generated_image_flow_id_idx') IS NOT NULL
     AND to_regclass('public.generated_asset_generation_flow_id_idx') IS NULL THEN
    ALTER INDEX generated_image_flow_id_idx RENAME TO generated_asset_generation_flow_id_idx;
  END IF;
  IF to_regclass('public.generated_image_chat_session_id_idx') IS NOT NULL
     AND to_regclass('public.generated_asset_chat_session_id_idx') IS NULL THEN
    ALTER INDEX generated_image_chat_session_id_idx RENAME TO generated_asset_chat_session_id_idx;
  END IF;
  IF to_regclass('public.generated_image_created_at_idx') IS NOT NULL
     AND to_regclass('public.generated_asset_created_at_idx') IS NULL THEN
    ALTER INDEX generated_image_created_at_idx RENAME TO generated_asset_created_at_idx;
  END IF;
  IF to_regclass('public.generated_image_job_id_idx') IS NOT NULL
     AND to_regclass('public.generated_asset_job_id_idx') IS NULL THEN
    ALTER INDEX generated_image_job_id_idx RENAME TO generated_asset_job_id_idx;
  END IF;

  IF to_regclass('public.favorite_image_generated_image_id_idx') IS NOT NULL
     AND to_regclass('public.favorite_image_generated_asset_id_idx') IS NULL THEN
    ALTER INDEX favorite_image_generated_image_id_idx RENAME TO favorite_image_generated_asset_id_idx;
  END IF;

  IF to_regclass('public.message_studio_session_id_idx') IS NOT NULL
     AND to_regclass('public.message_collection_session_id_idx') IS NULL THEN
    ALTER INDEX message_studio_session_id_idx RENAME TO message_collection_session_id_idx;
  END IF;

  IF to_regclass('public.studio_session_client_id_idx') IS NOT NULL
     AND to_regclass('public.collection_session_client_id_idx') IS NULL THEN
    ALTER INDEX studio_session_client_id_idx RENAME TO collection_session_client_id_idx;
  END IF;
END $$;

-- ===== 4) Ensure the message session check uses collection_session_id =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'message_session_check'
      AND conrelid = 'message'::regclass
  ) THEN
    ALTER TABLE message
      ADD CONSTRAINT message_session_check
      CHECK (
        (chat_session_id IS NOT NULL AND collection_session_id IS NULL)
        OR (chat_session_id IS NULL AND collection_session_id IS NOT NULL)
      );
  END IF;
END $$;

-- ===== 5) collection_session columns =====
ALTER TABLE collection_session
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- ===== 6) generation_flow columns =====
ALTER TABLE generation_flow
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE generation_flow
  ALTER COLUMN collection_session_id DROP NOT NULL;

-- Backfill generation_flow.client_id from collection_session when missing
UPDATE generation_flow gf
SET client_id = cs.client_id
FROM collection_session cs
WHERE gf.collection_session_id = cs.id
  AND gf.client_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM generation_flow WHERE client_id IS NULL) THEN
    ALTER TABLE generation_flow ALTER COLUMN client_id SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'generation_flow'::regclass
      AND conname = 'generation_flow_client_id_client_id_fk'
  ) THEN
    ALTER TABLE generation_flow
      ADD CONSTRAINT generation_flow_client_id_client_id_fk
      FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ===== 7) generated_asset columns =====
ALTER TABLE generated_asset
  ADD COLUMN IF NOT EXISTS asset_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS asset_analysis JSONB,
  ADD COLUMN IF NOT EXISTS analysis_version TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE generated_asset
SET asset_type = COALESCE(asset_type, 'image')
WHERE asset_type IS NULL;

UPDATE generated_asset
SET status = CASE WHEN error IS NOT NULL THEN 'error' ELSE 'completed' END
WHERE status IS NULL;

ALTER TABLE generated_asset
  ALTER COLUMN asset_type SET DEFAULT 'image',
  ALTER COLUMN asset_type SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

UPDATE generated_asset
SET approval_status = COALESCE(approval_status, 'pending')
WHERE approval_status IS NULL;

ALTER TABLE generated_asset
  ALTER COLUMN approval_status SET DEFAULT 'pending',
  ALTER COLUMN approval_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'generated_asset'::regclass
      AND conname = 'generated_asset_approved_by_user_id_fk'
  ) THEN
    ALTER TABLE generated_asset
      ADD CONSTRAINT generated_asset_approved_by_user_id_fk
      FOREIGN KEY (approved_by) REFERENCES "user"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===== 8) product columns =====
ALTER TABLE product
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS store_connection_id TEXT,
  ADD COLUMN IF NOT EXISTS erp_id TEXT,
  ADD COLUMN IF NOT EXISTS erp_sku TEXT,
  ADD COLUMN IF NOT EXISTS erp_url TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS analysis_data JSONB,
  ADD COLUMN IF NOT EXISTS analysis_version TEXT,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ===== 9) New tables =====
CREATE TABLE IF NOT EXISTS generated_asset_product (
  id TEXT PRIMARY KEY,
  generated_asset_id TEXT NOT NULL REFERENCES generated_asset(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generated_asset_product_asset_idx
  ON generated_asset_product (generated_asset_id);
CREATE INDEX IF NOT EXISTS generated_asset_product_product_idx
  ON generated_asset_product (product_id);

CREATE TABLE IF NOT EXISTS tag (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tag_client_name_unique UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS tag_client_id_idx
  ON tag (client_id);

CREATE TABLE IF NOT EXISTS tag_assignment (
  id TEXT PRIMARY KEY,
  tag_id TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tag_assignment_unique UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS tag_assignment_tag_id_idx
  ON tag_assignment (tag_id);
CREATE INDEX IF NOT EXISTS tag_assignment_entity_idx
  ON tag_assignment (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS user_favorite (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_favorite_unique UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS user_favorite_user_id_idx
  ON user_favorite (user_id);
CREATE INDEX IF NOT EXISTS user_favorite_entity_idx
  ON user_favorite (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS generation_event (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  generation_flow_id TEXT REFERENCES generation_flow(id) ON DELETE SET NULL,
  product_id TEXT REFERENCES product(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generation_event_client_id_idx
  ON generation_event (client_id);
CREATE INDEX IF NOT EXISTS generation_event_type_idx
  ON generation_event (event_type);
CREATE INDEX IF NOT EXISTS generation_event_created_at_idx
  ON generation_event (created_at);
CREATE INDEX IF NOT EXISTS generation_event_flow_id_idx
  ON generation_event (generation_flow_id);

CREATE TABLE IF NOT EXISTS store_connection (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  store_type TEXT NOT NULL,
  store_url TEXT NOT NULL,
  store_name TEXT,
  credentials_ciphertext TEXT NOT NULL,
  credentials_iv TEXT NOT NULL,
  credentials_tag TEXT NOT NULL,
  credentials_key_id TEXT NOT NULL,
  credentials_fingerprint TEXT,
  token_expires_at TIMESTAMPTZ,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sync_on_approval BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_connection_unique UNIQUE (client_id, store_type, store_url)
);

CREATE INDEX IF NOT EXISTS store_connection_client_id_idx
  ON store_connection (client_id);

ALTER TABLE store_connection
  ADD COLUMN IF NOT EXISTS credentials_ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS credentials_iv TEXT,
  ADD COLUMN IF NOT EXISTS credentials_tag TEXT,
  ADD COLUMN IF NOT EXISTS credentials_key_id TEXT,
  ADD COLUMN IF NOT EXISTS credentials_fingerprint TEXT,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM store_connection WHERE credentials_ciphertext IS NULL) THEN
    ALTER TABLE store_connection ALTER COLUMN credentials_ciphertext SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM store_connection WHERE credentials_iv IS NULL) THEN
    ALTER TABLE store_connection ALTER COLUMN credentials_iv SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM store_connection WHERE credentials_tag IS NULL) THEN
    ALTER TABLE store_connection ALTER COLUMN credentials_tag SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM store_connection WHERE credentials_key_id IS NULL) THEN
    ALTER TABLE store_connection ALTER COLUMN credentials_key_id SET NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS store_sync_log (
  id TEXT PRIMARY KEY,
  store_connection_id TEXT NOT NULL REFERENCES store_connection(id) ON DELETE CASCADE,
  generated_asset_id TEXT NOT NULL REFERENCES generated_asset(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_image_url TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS store_sync_log_store_connection_id_idx
  ON store_sync_log (store_connection_id);
CREATE INDEX IF NOT EXISTS store_sync_log_generated_asset_id_idx
  ON store_sync_log (generated_asset_id);
CREATE INDEX IF NOT EXISTS store_sync_log_product_id_idx
  ON store_sync_log (product_id);
CREATE INDEX IF NOT EXISTS store_sync_log_status_idx
  ON store_sync_log (status);

-- ===== 10) Backfill generated_asset_product from product_ids =====
INSERT INTO generated_asset_product (id, generated_asset_id, product_id, is_primary, created_at)
SELECT
  gen_random_uuid()::text,
  ga.id,
  p.product_id,
  (p.ord = 1),
  COALESCE(ga.created_at, NOW())
FROM generated_asset ga
CROSS JOIN LATERAL jsonb_array_elements_text(ga.product_ids) WITH ORDINALITY AS p(product_id, ord)
WHERE ga.product_ids IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM generated_asset_product gap
    WHERE gap.generated_asset_id = ga.id
      AND gap.product_id = p.product_id
  );

-- ===== 11) Indexes for new columns =====
CREATE INDEX IF NOT EXISTS generation_flow_client_id_idx
  ON generation_flow (client_id);
CREATE INDEX IF NOT EXISTS generation_flow_status_idx
  ON generation_flow (status);
CREATE INDEX IF NOT EXISTS generation_flow_favorite_idx
  ON generation_flow (client_id, is_favorite);

CREATE INDEX IF NOT EXISTS generated_asset_status_idx
  ON generated_asset (status);
CREATE INDEX IF NOT EXISTS generated_asset_approval_status_idx
  ON generated_asset (client_id, approval_status);

CREATE INDEX IF NOT EXISTS product_favorite_idx
  ON product (client_id, is_favorite);
CREATE INDEX IF NOT EXISTS product_source_idx
  ON product (client_id, source);
CREATE INDEX IF NOT EXISTS product_erp_idx
  ON product (store_connection_id, erp_id);
CREATE INDEX IF NOT EXISTS product_analyzed_idx
  ON product (client_id, analyzed_at);

COMMIT;
