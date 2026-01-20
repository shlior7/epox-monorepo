/**
 * AI Services Initialization
 *
 * Initializes all AI-related services on app startup:
 * - Distributed rate limiting via Redis
 * - Structured logging with Sentry
 * - Cost tracking per client/tenant
 */

import { initRedisRateLimiter, initSentry, initCostTracking } from 'visualizer-ai';
import { redis } from './redis';
import { db } from './db';

let initialized = false;

/**
 * Initialize AI services
 * Call this once on app startup (e.g., in middleware or instrumentation.ts)
 */
export function initAIServices(): void {
  if (initialized) {
    console.log('⚠️ AI services already initialized');
    return;
  }

  console.log('🚀 Initializing AI services...');

  // Initialize Redis-based distributed rate limiting
  try {
    initRedisRateLimiter(redis);
    console.log('✅ Distributed rate limiting enabled');
  } catch (error) {
    console.error('❌ Failed to initialize Redis rate limiting:', error);
    console.log('⚠️ Falling back to in-memory rate limiting (NOT safe for multi-instance)');
  }

  // Initialize Sentry for error tracking (if SENTRY_DSN is set)
  if (process.env.SENTRY_DSN) {
    try {
      // Dynamic import to avoid bundling Sentry if not configured
      import('@sentry/node').then((Sentry) => {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV ?? 'development',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        });
        initSentry(Sentry);
        console.log('✅ Sentry error tracking enabled');
      }).catch((error) => {
        console.error('❌ Failed to initialize Sentry:', error);
      });
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  } else {
    console.log('ℹ️ Sentry not configured (set SENTRY_DSN to enable)');
  }

  // Initialize cost tracking
  try {
    initCostTracking(db);
    console.log('✅ Cost tracking enabled');
  } catch (error) {
    console.error('❌ Failed to initialize cost tracking:', error);
    console.log('⚠️ Cost tracking disabled');
  }

  // Future: Initialize monitoring dashboard

  initialized = true;
  console.log('✅ AI services initialized');
}

/**
 * Check if AI services are initialized
 */
export function isAIServicesInitialized(): boolean {
  return initialized;
}
