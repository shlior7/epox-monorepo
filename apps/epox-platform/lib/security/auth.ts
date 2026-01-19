/**
 * Authentication & Authorization Security Layer
 *
 * Provides consistent authentication and authorization across all API routes.
 *
 * Security concerns addressed:
 * - Missing authentication on protected routes
 * - Client ID spoofing/impersonation
 * - Missing resource ownership verification
 * - Session hijacking protection
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getClientId } from '@/lib/services/get-auth';
import { SECURITY_FLAGS } from './config';
import { logSecurityEvent } from './logging';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthResult {
  authenticated: boolean;
  clientId: string | null;
  error?: string;
}

export interface AuthOptions {
  /** Whether authentication is required (default: true based on SECURITY_FLAGS) */
  required?: boolean;
  /** Custom error message for auth failures */
  errorMessage?: string;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Authenticates a request and returns the client ID
 *
 * @example
 * ```ts
 * const auth = await authenticate(request);
 * if (!auth.authenticated) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 });
 * }
 * const clientId = auth.clientId!;
 * ```
 */
export async function authenticate(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const { required = SECURITY_FLAGS.REQUIRE_AUTH, errorMessage = 'Authentication required' } =
    options;

  try {
    const clientId = await getClientId(request);

    if (!clientId && required) {
      logSecurityEvent('auth_failure', {
        reason: 'missing_client_id',
        path: request.nextUrl.pathname,
        ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      });

      return {
        authenticated: false,
        clientId: null,
        error: errorMessage,
      };
    }

    return {
      authenticated: !!clientId,
      clientId,
    };
  } catch (error) {
    logSecurityEvent('auth_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname,
    });

    return {
      authenticated: false,
      clientId: null,
      error: 'Authentication failed',
    };
  }
}

/**
 * Returns 401 response for unauthenticated requests
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns 403 response for unauthorized access
 */
export function forbiddenResponse(message = 'Access denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ============================================================================
// AUTHORIZATION (Resource Ownership)
// ============================================================================

export interface ResourceOwnershipOptions {
  /** The authenticated client ID */
  clientId: string;
  /** The resource's owner client ID */
  resourceClientId: string | null | undefined;
  /** Resource type for logging */
  resourceType?: string;
  /** Resource ID for logging */
  resourceId?: string;
}

/**
 * Verifies that the authenticated user owns a resource
 *
 * @example
 * ```ts
 * const product = await db.products.getById(id);
 * if (!product) return notFoundResponse();
 *
 * if (!verifyOwnership({ clientId, resourceClientId: product.clientId })) {
 *   return forbiddenResponse();
 * }
 * ```
 */
export function verifyOwnership(options: ResourceOwnershipOptions): boolean {
  const { clientId, resourceClientId, resourceType, resourceId } = options;

  if (!resourceClientId) {
    logSecurityEvent('ownership_check_failed', {
      reason: 'resource_has_no_owner',
      resourceType,
      resourceId,
    });
    return false;
  }

  const isOwner = clientId === resourceClientId;

  if (!isOwner) {
    logSecurityEvent('unauthorized_access_attempt', {
      clientId,
      resourceClientId,
      resourceType,
      resourceId,
    });
  }

  return isOwner;
}

// ============================================================================
// PLACEHOLDER CLIENT ID DETECTION
// ============================================================================

/**
 * Detects usage of placeholder/test client IDs in production
 * This helps identify routes that haven't been properly secured
 */
const PLACEHOLDER_CLIENT_IDS = ['test-client', 'placeholder', 'demo', 'test'];

export function isPlaceholderClientId(clientId: string | null | undefined): boolean {
  if (!clientId) {
    return false;
  }
  return PLACEHOLDER_CLIENT_IDS.some(
    (placeholder) =>
      clientId.toLowerCase() === placeholder || clientId.toLowerCase().startsWith(`${placeholder}-`)
  );
}

/**
 * Warns if using placeholder client ID in production
 */
export function warnIfPlaceholderClient(
  clientId: string | null | undefined,
  context?: string
): void {
  if (process.env.NODE_ENV === 'production' && isPlaceholderClientId(clientId)) {
    console.warn(
      `⚠️ SECURITY WARNING: Placeholder client ID "${clientId}" used in production${context ? ` (${context})` : ''}`
    );
    logSecurityEvent('placeholder_client_in_production', {
      clientId,
      context,
    });
  }
}

// ============================================================================
// REQUEST VALIDATION HELPERS
// ============================================================================

/**
 * Extracts and validates a resource ID from route params
 */
export function validateResourceId(id: string | undefined): { valid: boolean; error?: string } {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Resource ID is required' };
  }

  // Basic UUID/ID format validation
  if (id.length > 128) {
    return { valid: false, error: 'Invalid resource ID format' };
  }

  // Check for path traversal attempts
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    logSecurityEvent('path_traversal_attempt', { id });
    return { valid: false, error: 'Invalid resource ID' };
  }

  return { valid: true };
}
