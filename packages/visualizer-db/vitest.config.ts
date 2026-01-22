import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use forks for DB tests - each fork gets isolated process with own connection
    // Threads cause connection pool issues with shared module state
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in single fork to share DB connection
      },
    },

    // Don't fail if no test files found
    passWithNoTests: true,

    // Global test setup
    globalSetup: './src/__tests__/global-setup.ts',
    setupFiles: ['./src/__tests__/setup.ts'],

    // Test patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],

    // Timeouts
    testTimeout: 30000, // 30s for DB operations
    hookTimeout: 60000, // 60s for setup/teardown

    // Run tests sequentially to avoid DB connection issues
    sequence: {
      shuffle: false,
    },

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/__tests__/**', 'src/index.ts'],
    },

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      'visualizer-types': new URL('../visualizer-types/src/index.ts', import.meta.url).pathname,
    },
  },
});
