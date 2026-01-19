// ERP-service Vitest configuration
import { defineConfig } from 'vitest/config';

// Default test key (32 bytes base64) - only used if not provided via env
const DEFAULT_TEST_KEY = 'dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3Q=';

export default defineConfig({
  test: {
    pool: 'threads',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      STORE_CREDENTIALS_KEY: process.env.STORE_CREDENTIALS_KEY ?? DEFAULT_TEST_KEY,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
