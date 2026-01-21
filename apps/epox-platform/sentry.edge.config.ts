/**
 * Sentry Edge Runtime Configuration
 *
 * This configuration is used for Next.js middleware and edge functions.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture all errors
  sampleRate: 1.0,

  // Lower trace sample rate for edge
  tracesSampleRate: 0.05,

  // Don't send PII
  sendDefaultPii: false,

  // Tag environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
