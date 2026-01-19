/**
 * Sentry Client-Side Configuration
 *
 * This configuration is used for browser errors and frontend performance.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors (Free tier allows 5k/month)
  sampleRate: 1.0,

  // Performance: Only monitor 10% of transactions to save quota
  tracesSampleRate: 0.1,

  // Enable replay for debugging (1% of sessions, 100% on error)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Ignore expected/handled errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Network request aborted',
    'Failed to fetch',
    'Load failed',
    'User cancelled',
  ],

  // Don't send PII to Sentry
  sendDefaultPii: false,

  // Tag environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
