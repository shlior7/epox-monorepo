/**
 * Security Module
 *
 * Centralized security layer for API routes providing:
 * - Authentication & authorization
 * - URL validation / SSRF protection
 * - Rate limiting
 * - Security event logging
 *
 * @example
 * ```ts
 * import {
 *   withSecurity,
 *   validateImageUrl,
 *   verifyOwnership,
 *   forbiddenResponse
 * } from '@/lib/security';
 *
 * export const POST = withSecurity(async (request, { clientId }) => {
 *   const body = await request.json();
 *
 *   // Validate URL inputs
 *   const urlResult = validateImageUrl(body.imageUrl);
 *   if (!urlResult.valid) {
 *     return NextResponse.json({ error: urlResult.error }, { status: 400 });
 *   }
 *
 *   // Verify resource ownership
 *   const resource = await db.getById(body.resourceId);
 *   if (!verifyOwnership({ clientId, resourceClientId: resource.clientId })) {
 *     return forbiddenResponse();
 *   }
 *
 *   // ... handle request
 * });
 * ```
 */

// Configuration
export {
  SECURITY_FLAGS,
  ALLOWED_DOMAINS,
  ALLOWED_DOMAIN_PATTERNS,
  ALLOWED_PROTOCOLS,
  RATE_LIMITS,
  INPUT_LIMITS,
  getAllowedProtocols,
} from './config';

// URL Validation (SSRF Protection)
export {
  validateUrl,
  validateUrls,
  validateImageUrl,
  validateWebhookUrl,
  isValidUrl,
  type UrlValidationResult,
  type UrlValidationOptions,
} from './url-validator';

// Authentication & Authorization
export {
  authenticate,
  verifyOwnership,
  validateResourceId,
  unauthorizedResponse,
  forbiddenResponse,
  isPlaceholderClientId,
  warnIfPlaceholderClient,
  type AuthResult,
  type AuthOptions,
  type ResourceOwnershipOptions,
} from './auth';

// Security Logging
export {
  logSecurityEvent,
  logSecurityAlert,
  type SecurityEventType,
  type SecurityEvent,
} from './logging';

// Middleware
export {
  withSecurity,
  withPublicSecurity,
  withGenerationSecurity,
  withUploadSecurity,
  type SecurityContext,
  type SecureRouteHandler,
  type SecurityOptions,
} from './middleware';
