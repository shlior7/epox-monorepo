/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
// Use bracket notation to avoid TypeScript read-only error for NODE_ENV
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.STORAGE_DRIVER = 'filesystem';
process.env.LOCAL_STORAGE_DIR = '.test-storage';

beforeAll(() => {
  console.log('🧪 Test suite initialized');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});
