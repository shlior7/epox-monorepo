/**
 * Sentry Server-Side Configuration
 *
 * This configuration is used for API routes, server components,
 * and background job errors (Railway worker).
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors (Free tier allows 5k/month)
  sampleRate: 1.0,

  // Performance: Only monitor 10% of successful requests to save quota
  // Asset generation can be noisy, so we don't want to pay for every transaction
  tracesSampleRate: 0.1,

  // Ignore expected errors that don't need alerting
  ignoreErrors: [
    'User cancelled upload',
    'Network request aborted',
    'ECONNRESET',
    'ETIMEDOUT',
  ],

  // Don't send PII
  sendDefaultPii: false,

  // Tag environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Add custom tags for filtering
  initialScope: {
    tags: {
      service: 'epox-platform',
    },
  },
});
