/**
 * Test Setup for scenergy-monitoring
 */

import { beforeEach, vi } from 'vitest';

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// Mock fetch globally
global.fetch = vi.fn();

// Test configuration
export const TEST_CONFIG = {
  redis: {
    url: process.env.TEST_REDIS_URL ?? 'redis://localhost:6399',
  },
};
