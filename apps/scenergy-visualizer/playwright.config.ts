import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const PLAYWRIGHT_LOCAL_S3_DIR = path.join(
  os.tmpdir(),
  `scenergy-playwright-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
);

console.log(`🗂️  Playwright Local S3 Directory: ${PLAYWRIGHT_LOCAL_S3_DIR}`);

export default defineConfig({
  timeout: 60_000,
  testDir: './__tests__',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
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

  // Run your local server before starting the tests
  // Uses production build for stability and to avoid dev server lock conflicts
  // IMPORTANT: Build happens before start, allowing multiple isolated server instances.
  // IMPORTANT: fast build injects NEXT_PUBLIC_RECORD_VISUAL=true automatically
  webServer: {
    command: 'yarn build && yarn start:test',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // Allow time for build to complete
    env: {
      RECORD_VISUAL: 'false', // Disable recording during tests (NEXT_PUBLIC_RECORD_VISUAL is baked into build)
      NEXT_PUBLIC_S3_DRIVER: 'fs',
      NEXT_PUBLIC_LOCAL_S3_DIR: PLAYWRIGHT_LOCAL_S3_DIR,
      S3_FS_DISABLE_CLEANUP: 'false',
    },
  },
});
