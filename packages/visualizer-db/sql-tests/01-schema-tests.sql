-- pgTAP Schema Tests
-- Tests for database schema constraints, indexes, and relationships

BEGIN;

-- Load pgTAP extension
SELECT plan(25);

-- ===== TABLE EXISTENCE TESTS =====
SELECT has_table('user', 'Table "user" should exist');
SELECT has_table('session', 'Table "session" should exist');
SELECT has_table('organization', 'Table "organization" should exist');
SELECT has_table('member', 'Table "member" should exist');
SELECT has_table('product', 'Table "product" should exist');
SELECT has_table('product_image', 'Table "product_image" should exist');
SELECT has_table('chat_session', 'Table "chat_session" should exist');
SELECT has_table('client_session', 'Table "client_session" should exist');
SELECT has_table('message', 'Table "message" should exist');
SELECT has_table('flow', 'Table "flow" should exist');
SELECT has_table('generated_image', 'Table "generated_image" should exist');
SELECT has_table('favorite_image', 'Table "favorite_image" should exist');

-- ===== PRIMARY KEY TESTS =====
SELECT has_pk('user', 'Table "user" should have a primary key');
SELECT has_pk('organization', 'Table "organization" should have a primary key');
SELECT has_pk('product', 'Table "product" should have a primary key');
SELECT has_pk('flow', 'Table "flow" should have a primary key');

-- ===== FOREIGN KEY TESTS =====
SELECT has_fk('product', 'Table "product" should have foreign keys');
SELECT has_fk('chat_session', 'Table "chat_session" should have foreign keys');
SELECT has_fk('flow', 'Table "flow" should have foreign keys');
SELECT has_fk('generated_image', 'Table "generated_image" should have foreign keys');

-- ===== INDEX TESTS =====
SELECT has_index('product', 'product_org_id_idx', 'Table "product" should have org_id index');
SELECT has_index('generated_image', 'generated_image_org_id_idx', 'Table "generated_image" should have org_id index');
SELECT has_index('generated_image', 'generated_image_flow_id_idx', 'Table "generated_image" should have flow_id index');
SELECT has_index('generated_image', 'generated_image_job_id_idx', 'Table "generated_image" should have job_id index');

-- ===== CHECK CONSTRAINT TESTS =====
SELECT has_check('message', 'Table "message" should have check constraints');

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;
