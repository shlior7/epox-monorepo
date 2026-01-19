/**
 * Next.js Instrumentation
 *
 * This file is called once when the Next.js server starts.
 * Perfect place to initialize global services like Sentry and Redis rate limiting.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Initialize Sentry for server-side error tracking
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    const { initAIServices } = await import('./lib/services/ai-init');
    initAIServices();
  }

  // Initialize Sentry for edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
