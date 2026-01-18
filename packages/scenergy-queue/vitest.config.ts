import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 60000, // 60s for E2E tests
    hookTimeout: 30000,
    pool: 'forks', // Use forks for isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid Redis conflicts
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts', 'src/index.ts', 'src/testkit.ts'],
    },
    // Categorize tests by strategy
    typecheck: {
      enabled: false, // Speed up test runs
    },
  },
  resolve: {
    alias: {
      'visualizer-services': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-services/src',
      'visualizer-services/testkit': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-services/src/testkit.ts',
      'visualizer-storage': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-storage/src',
      'visualizer-storage/testkit': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-storage/src/testkit.ts',
      'visualizer-db': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-db/src',
      'visualizer-db/testkit': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-db/src/testkit.ts',
      'visualizer-types': '/Users/liorsht/MyThings/MyProjects/epox-monorepo/packages/visualizer-types/src',
    },
  },
});
