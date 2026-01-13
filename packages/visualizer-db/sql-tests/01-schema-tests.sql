-- pgTAP Schema Tests
-- Tests for database schema constraints, indexes, and relationships

BEGIN;

-- Load pgTAP extension
SELECT plan(25);

-- ===== TABLE EXISTENCE TESTS =====
SELECT has_table('user', 'Table "user" should exist');
SELECT has_table('session', 'Table "session" should exist');
SELECT has_table('client', 'Table "client" should exist');
SELECT has_table('member', 'Table "member" should exist');
SELECT has_table('product', 'Table "product" should exist');
SELECT has_table('product_image', 'Table "product_image" should exist');
SELECT has_table('chat_session', 'Table "chat_session" should exist');
SELECT has_table('collection_session', 'Table "collection_session" should exist');
SELECT has_table('message', 'Table "message" should exist');
SELECT has_table('generation_flow', 'Table "generation_flow" should exist');
SELECT has_table('generated_asset', 'Table "generated_asset" should exist');
SELECT has_table('favorite_image', 'Table "favorite_image" should exist');

-- ===== PRIMARY KEY TESTS =====
SELECT has_pk('user', 'Table "user" should have a primary key');
SELECT has_pk('client', 'Table "client" should have a primary key');
SELECT has_pk('product', 'Table "product" should have a primary key');
SELECT has_pk('generation_flow', 'Table "generation_flow" should have a primary key');

-- ===== FOREIGN KEY TESTS =====
SELECT has_fk('product', 'Table "product" should have foreign keys');
SELECT has_fk('chat_session', 'Table "chat_session" should have foreign keys');
SELECT has_fk('generation_flow', 'Table "generation_flow" should have foreign keys');
SELECT has_fk('generated_asset', 'Table "generated_asset" should have foreign keys');

-- ===== INDEX TESTS =====
SELECT has_index('product', 'product_client_id_idx', 'Table "product" should have client_id index');
SELECT has_index('generated_asset', 'generated_asset_client_id_idx', 'Table "generated_asset" should have client_id index');
SELECT has_index('generated_asset', 'generated_asset_generation_flow_id_idx', 'Table "generated_asset" should have generation_flow_id index');
SELECT has_index('generated_asset', 'generated_asset_job_id_idx', 'Table "generated_asset" should have job_id index');

-- ===== CHECK CONSTRAINT TESTS =====
SELECT has_check('message', 'Table "message" should have check constraints');

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;
