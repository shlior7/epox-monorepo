import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      STORE_CREDENTIALS_KEY: 'dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGtleXRlc3Q=', // 32 bytes base64
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
