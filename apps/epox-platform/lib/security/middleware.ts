/**
 * Security Middleware
 *
 * Composable middleware wrapper for API routes that applies
 * security checks consistently.
 *
 * @example
 * ```ts
 * // Basic usage - authentication only
 * export const POST = withSecurity(async (request, { clientId }) => {
 *   // clientId is guaranteed to be defined
 *   const result = await doSomething(clientId);
 *   return NextResponse.json(result);
 * });
 *
 * // With options
 * export const POST = withSecurity(
 *   async (request, { clientId }) => {
 *     return NextResponse.json({ ok: true });
 *   },
 *   { requireAuth: true, rateLimit: 'generation' }
 * );
 * ```
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authenticate, unauthorizedResponse, warnIfPlaceholderClient } from './auth';
import { logSecurityEvent } from './logging';
import { RATE_LIMITS } from './config';

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityContext {
  /** Authenticated client ID (null if auth not required and user is anonymous) */
  clientId: string | null;
  /** Request timestamp */
  timestamp: Date;
  /** Request ID for tracing */
  requestId: string;
}

export type SecureRouteHandler = (
  request: NextRequest,
  context: SecurityContext,
  routeContext: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse>;

export interface SecurityOptions {
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Rate limit category (default: 'default') */
  rateLimit?: keyof typeof RATE_LIMITS;
  /** Custom error handler */
  onError?: (error: Error, request: NextRequest) => NextResponse;
}

// ============================================================================
// IN-MEMORY RATE LIMITING (Simple implementation)
// For production, use a shared store if you need distributed rate limiting
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  identifier: string,
  category: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetAt: number } {
  const { requests: limit, windowMs } = RATE_LIMITS[category];
  const now = Date.now();
  const key = `${category}:${identifier}`;

  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Every minute

// ============================================================================
// MIDDLEWARE WRAPPER
// ============================================================================

/**
 * Wraps an API route handler with security middleware
 */
export function withSecurity(
  handler: SecureRouteHandler,
  options: SecurityOptions = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  const { requireAuth = true, rateLimit = 'default', onError } = options;

  return async (
    request: NextRequest,
    routeContext?: { params: Promise<{ [key: string]: string }> }
  ): Promise<NextResponse> => {
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date();

    try {
      // 1. Authentication
      const auth = await authenticate(request, { required: requireAuth });

      if (requireAuth && !auth.authenticated) {
        return unauthorizedResponse(auth.error);
      }

      // Warn about placeholder client IDs
      warnIfPlaceholderClient(auth.clientId, request.nextUrl.pathname);

      // 2. Rate limiting
      const rateLimitIdentifier = auth.clientId || getClientIp(request) || 'anonymous';
      const rateLimitResult = checkRateLimit(rateLimitIdentifier, rateLimit);

      if (!rateLimitResult.allowed) {
        logSecurityEvent('rate_limit_exceeded', {
          identifier: rateLimitIdentifier,
          category: rateLimit,
          path: request.nextUrl.pathname,
        });

        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            },
          }
        );
      }

      // 3. Build security context
      const context: SecurityContext = {
        clientId: auth.clientId,
        timestamp,
        requestId,
      };

      // 4. Execute handler
      // For non-dynamic routes, provide an empty params promise
      const effectiveRouteContext = routeContext || { params: Promise.resolve({}) };
      const response = await handler(request, context, effectiveRouteContext);

      // 5. Add security headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

      return response;
    } catch (error) {
      // Log error
      console.error(`[${requestId}] Route error:`, error);

      // Custom error handler
      if (onError && error instanceof Error) {
        return onError(error, request);
      }

      // Default error response (don't leak error details in production)
      const message =
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : 'Internal server error';

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Extracts client IP from request headers
 */
function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

// ============================================================================
// SPECIALIZED MIDDLEWARE WRAPPERS
// ============================================================================

/**
 * Middleware for public routes (no auth required)
 */
export function withPublicSecurity(
  handler: SecureRouteHandler,
  options: Omit<SecurityOptions, 'requireAuth'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withSecurity(handler, { ...options, requireAuth: false });
}

/**
 * Middleware for generation routes (auth + stricter rate limits)
 */
export function withGenerationSecurity(
  handler: SecureRouteHandler,
  options: Omit<SecurityOptions, 'rateLimit'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withSecurity(handler, { ...options, rateLimit: 'generation' });
}

/**
 * Middleware for upload routes
 */
export function withUploadSecurity(
  handler: SecureRouteHandler,
  options: Omit<SecurityOptions, 'rateLimit'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withSecurity(handler, { ...options, rateLimit: 'upload' });
}
