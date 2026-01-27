/**
 * Admin Security Middleware
 *
 * Composable middleware wrapper for admin API routes that applies
 * security checks consistently.
 *
 * @example
 * ```ts
 * // Basic usage
 * export const GET = withAdminSecurity(async (request, { adminSession }) => {
 *   // adminSession is guaranteed to be defined
 *   const data = await getAdminData();
 *   return NextResponse.json(data);
 * });
 *
 * // With custom rate limit
 * export const DELETE = withAdminSecurity(
 *   async (request, { adminSession }) => {
 *     await deleteClient(clientId);
 *     return NextResponse.json({ ok: true });
 *   },
 *   { rateLimit: 'admin-write' }
 * );
 * ```
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminSession, type AdminAuthSession } from '@/lib/auth/admin-auth';

// ============================================================================
// TYPES
// ============================================================================

export interface AdminSecurityContext {
  /** Authenticated admin session */
  adminSession: AdminAuthSession;
  /** Request timestamp */
  timestamp: Date;
  /** Request ID for tracing */
  requestId: string;
}

export type SecureAdminRouteHandler = (
  request: NextRequest,
  context: AdminSecurityContext,
  routeContext: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse>;

export interface AdminSecurityOptions {
  /** Rate limit category (default: 'admin-default') */
  rateLimit?: keyof typeof ADMIN_RATE_LIMITS;
  /** Custom error handler */
  onError?: (error: Error, request: NextRequest) => NextResponse;
}

// ============================================================================
// RATE LIMIT CONFIGURATION
// ============================================================================

export const ADMIN_RATE_LIMITS = {
  /** Default admin operations: 100 requests per minute */
  'admin-default': { requests: 100, windowMs: 60 * 1000 },
  /** Read operations: 200 requests per minute */
  'admin-read': { requests: 200, windowMs: 60 * 1000 },
  /** Write operations: 50 requests per minute */
  'admin-write': { requests: 50, windowMs: 60 * 1000 },
  /** Dangerous operations (delete): 10 requests per minute */
  'admin-dangerous': { requests: 10, windowMs: 60 * 1000 },
} as const;

// ============================================================================
// IN-MEMORY RATE LIMITING
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  adminId: string,
  category: keyof typeof ADMIN_RATE_LIMITS
): { allowed: boolean; remaining: number; resetAt: number } {
  const { requests: limit, windowMs } = ADMIN_RATE_LIMITS[category];
  const now = Date.now();
  const key = `admin:${category}:${adminId}`;

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
 * Wraps an API route handler with admin security middleware
 */
export function withAdminSecurity(
  handler: SecureAdminRouteHandler,
  options: AdminSecurityOptions = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  const { rateLimit = 'admin-default', onError } = options;

  return async (
    request: NextRequest,
    routeContext?: { params: Promise<{ [key: string]: string }> }
  ): Promise<NextResponse> => {
    const requestId = `admin_req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date();

    try {
      // 1. Authentication - require admin session
      const adminSession = await getAdminSession();

      if (!adminSession) {
        logSecurityEvent('admin_unauthorized_access', {
          path: request.nextUrl.pathname,
          ip: getClientIp(request),
          userAgent: request.headers.get('user-agent'),
        });

        return NextResponse.json({ error: 'Unauthorized - Admin authentication required' }, { status: 401 });
      }

      // 2. Rate limiting
      const rateLimitResult = checkRateLimit(adminSession.id, rateLimit);

      if (!rateLimitResult.allowed) {
        logSecurityEvent('admin_rate_limit_exceeded', {
          adminId: adminSession.id,
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

      // 3. Log admin action
      logSecurityEvent('admin_action', {
        adminId: adminSession.id,
        adminEmail: adminSession.email,
        path: request.nextUrl.pathname,
        method: request.method,
      });

      // 4. Build security context
      const context: AdminSecurityContext = {
        adminSession,
        timestamp,
        requestId,
      };

      // 5. Execute handler
      const effectiveRouteContext = routeContext || { params: Promise.resolve({}) };
      const response = await handler(request, context, effectiveRouteContext);

      // 6. Add security headers
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

      return response;
    } catch (error) {
      // Log error
      console.error(`[${requestId}] Admin route error:`, error);

      // Custom error handler
      if (onError && error instanceof Error) {
        return onError(error, request);
      }

      // Default error response (don't leak error details in production)
      const message =
        process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Internal server error';

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extracts client IP from request headers
 */
function getClientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

/**
 * Logs a security event (console for now, could be enhanced to DB/logging service)
 */
function logSecurityEvent(event: string, data: Record<string, unknown>): void {
  console.log(`[SECURITY] ${event}:`, JSON.stringify(data, null, 2));
}

// ============================================================================
// SPECIALIZED MIDDLEWARE WRAPPERS
// ============================================================================

/**
 * Middleware for read operations (higher rate limit)
 */
export function withAdminReadSecurity(
  handler: SecureAdminRouteHandler,
  options: Omit<AdminSecurityOptions, 'rateLimit'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withAdminSecurity(handler, { ...options, rateLimit: 'admin-read' });
}

/**
 * Middleware for write operations (lower rate limit)
 */
export function withAdminWriteSecurity(
  handler: SecureAdminRouteHandler,
  options: Omit<AdminSecurityOptions, 'rateLimit'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withAdminSecurity(handler, { ...options, rateLimit: 'admin-write' });
}

/**
 * Middleware for dangerous operations like delete (strictest rate limit)
 */
export function withAdminDangerousSecurity(
  handler: SecureAdminRouteHandler,
  options: Omit<AdminSecurityOptions, 'rateLimit'> = {}
): (
  request: NextRequest,
  routeContext?: { params: Promise<{ [key: string]: string }> }
) => Promise<NextResponse> {
  return withAdminSecurity(handler, { ...options, rateLimit: 'admin-dangerous' });
}
