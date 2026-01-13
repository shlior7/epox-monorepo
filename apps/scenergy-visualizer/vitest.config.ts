import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./lib/__tests__/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'lib/__tests__/**', '*.config.ts', '*.config.js', 'dist/', '.next/'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@testing-library/react': path.resolve(__dirname, './lib/test-utils/testing-library'),
      '@': path.resolve(__dirname, './'),
    },
  },
});
