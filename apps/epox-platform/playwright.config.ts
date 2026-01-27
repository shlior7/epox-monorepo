import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  timeout: 60_000,
  testDir: './__tests__',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: path.join(__dirname, '__tests__/e2e/setup/global-setup.ts'),

  use: {
    ignoreHTTPSErrors: true,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  // IMPORTANT: Override DATABASE_URL to use test database!
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh server with test env
    timeout: 120_000,
    env: {
      // Test database
      DATABASE_URL: 'postgresql://test:test@localhost:5434/visualizer_test',

      // Disable external services for tests
      NODE_ENV: 'test',
      SENTRY_DSN: '', // Disable Sentry

      // Clear Redis URLs to prevent external connections
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_URL: '',
      REDIS_URL: '',

      NEXT_PUBLIC_IS_E2E: 'true',

      // Better Auth configuration for tests
      BETTER_AUTH_SECRET: 'test-secret-for-e2e-tests-only-not-secure',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_BETTER_AUTH_URL: 'http://localhost:3000',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
    },
  },
});
