-- pgTAP Constraint Tests
-- Tests for database constraints and data integrity

BEGIN;

-- Load pgTAP extension
SELECT plan(11);

-- ===== SETUP TEST DATA =====

-- Create a test user and client
INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
VALUES ('test-user-1', 'Test User', 'test@example.com', true, NOW(), NOW());

INSERT INTO client (id, name, slug, version, created_at, updated_at)
VALUES ('test-client-1', 'Test Client', 'test-client', 1, NOW(), NOW());

INSERT INTO member (id, client_id, user_id, role, created_at, updated_at)
VALUES ('test-member-1', 'test-client-1', 'test-user-1', 'owner', NOW(), NOW());

-- Create a test product
INSERT INTO product (id, client_id, name, version, created_at, updated_at)
VALUES ('test-product-1', 'test-client-1', 'Test Product', 1, NOW(), NOW());

-- Create a test chat session
INSERT INTO chat_session (id, product_id, name, version, created_at, updated_at)
VALUES ('test-chat-1', 'test-product-1', 'Test Chat', 1, NOW(), NOW());

-- Create a test collection session
INSERT INTO collection_session (id, client_id, name, product_ids, selected_base_images, version, created_at, updated_at)
VALUES ('test-collection-1', 'test-client-1', 'Test Collection Session', '[]'::jsonb, '{}'::jsonb, 1, NOW(), NOW());

-- ===== MESSAGE CONSTRAINT TESTS =====

-- Test: Message can be created with chat_session_id only
SELECT lives_ok(
    $$INSERT INTO message (id, chat_session_id, collection_session_id, role, parts, version, created_at, updated_at)
      VALUES ('msg-1', 'test-chat-1', NULL, 'user', '[]', 1, NOW(), NOW())$$,
    'Message with chat_session_id only should succeed'
);

-- Test: Message can be created with collection_session_id only
SELECT lives_ok(
    $$INSERT INTO message (id, chat_session_id, collection_session_id, role, parts, version, created_at, updated_at)
      VALUES ('msg-2', NULL, 'test-collection-1', 'assistant', '[]', 1, NOW(), NOW())$$,
    'Message with collection_session_id only should succeed'
);

-- Test: Message with both session IDs should fail
SELECT throws_ok(
    $$INSERT INTO message (id, chat_session_id, collection_session_id, role, parts, version, created_at, updated_at)
      VALUES ('msg-3', 'test-chat-1', 'test-collection-1', 'user', '[]', 1, NOW(), NOW())$$,
    '23514', -- Check constraint violation error code
    NULL,
    'Message with both session IDs should fail check constraint'
);

-- Test: Message with neither session ID should fail
SELECT throws_ok(
    $$INSERT INTO message (id, chat_session_id, collection_session_id, role, parts, version, created_at, updated_at)
      VALUES ('msg-4', NULL, NULL, 'user', '[]', 1, NOW(), NOW())$$,
    '23514', -- Check constraint violation error code
    NULL,
    'Message with no session ID should fail check constraint'
);

-- ===== UNIQUE CONSTRAINT TESTS =====

-- Test: Duplicate email should fail
SELECT throws_ok(
    $$INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
      VALUES ('test-user-2', 'Another User', 'test@example.com', true, NOW(), NOW())$$,
    '23505', -- Unique violation error code
    NULL,
    'Duplicate email should fail unique constraint'
);

-- Test: Duplicate client slug should fail
SELECT throws_ok(
    $$INSERT INTO client (id, name, slug, version, created_at, updated_at)
      VALUES ('test-client-2', 'Another Client', 'test-client', 1, NOW(), NOW())$$,
    '23505', -- Unique violation error code
    NULL,
    'Duplicate client slug should fail unique constraint'
);

-- Test: Duplicate member (client + user) should fail
SELECT throws_ok(
    $$INSERT INTO member (id, client_id, user_id, role, created_at, updated_at)
      VALUES ('test-member-2', 'test-client-1', 'test-user-1', 'member', NOW(), NOW())$$,
    '23505', -- Unique violation error code
    NULL,
    'Duplicate member should fail unique constraint'
);

-- ===== CASCADE DELETE TESTS =====

-- Create a product to delete
INSERT INTO product (id, client_id, name, version, created_at, updated_at)
VALUES ('test-product-2', 'test-client-1', 'Product to Delete', 1, NOW(), NOW());

INSERT INTO product_image (id, product_id, r2_key_base, sort_order, version, created_at, updated_at)
VALUES ('test-image-1', 'test-product-2', 'test/image.png', 0, 1, NOW(), NOW());

-- Test: Deleting product should cascade delete product_image
SELECT lives_ok(
    $$DELETE FROM product WHERE id = 'test-product-2'$$,
    'Deleting product should succeed'
);

SELECT is_empty(
    $$SELECT * FROM product_image WHERE id = 'test-image-1'$$,
    'Product image should be deleted when product is deleted (cascade)'
);

-- ===== FOREIGN KEY TESTS =====

-- Test: Creating product with non-existent client should fail
SELECT throws_ok(
    $$INSERT INTO product (id, client_id, name, version, created_at, updated_at)
      VALUES ('test-product-3', 'non-existent-client', 'Invalid Product', 1, NOW(), NOW())$$,
    '23503', -- Foreign key violation error code
    NULL,
    'Product with non-existent client should fail foreign key constraint'
);

-- Test: Creating chat session with non-existent product should fail
SELECT throws_ok(
    $$INSERT INTO chat_session (id, product_id, name, version, created_at, updated_at)
      VALUES ('test-chat-2', 'non-existent-product', 'Invalid Chat', 1, NOW(), NOW())$$,
    '23503', -- Foreign key violation error code
    NULL,
    'Chat session with non-existent product should fail foreign key constraint'
);

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;
