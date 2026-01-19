/**
 * URL Validation & SSRF Protection
 *
 * Provides secure URL validation to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * SSRF Risks:
 * - Accessing internal services (localhost, 10.x.x.x, 192.168.x.x)
 * - Cloud metadata endpoints (169.254.169.254)
 * - Port scanning internal networks
 * - Data exfiltration via DNS rebinding
 *
 * Protection layers:
 * 1. Protocol validation (only https, http in dev)
 * 2. Domain allowlist enforcement
 * 3. Private IP blocking
 * 4. URL length limits
 */

import {
  SECURITY_FLAGS,
  ALLOWED_DOMAINS,
  ALLOWED_DOMAIN_PATTERNS,
  DEV_ALLOWED_DOMAINS,
  PRIVATE_IP_RANGES,
  INPUT_LIMITS,
  getAllowedProtocols,
} from './config';

// ============================================================================
// TYPES
// ============================================================================

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

export interface UrlValidationOptions {
  /** Allow data URLs (data:image/...) */
  allowDataUrls?: boolean;
  /** Skip domain allowlist check (use with caution) */
  skipDomainCheck?: boolean;
  /** Additional domains to allow for this specific validation */
  additionalAllowedDomains?: string[];
  /** Custom error prefix for better debugging */
  errorPrefix?: string;
}

// ============================================================================
// DATA URL VALIDATION
// ============================================================================

/**
 * Strict pattern for valid image data URLs
 * Only allows common image MIME types with base64 encoding
 */
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Validates a data URL
 */
function isValidDataUrl(url: string): boolean {
  // Limit data URL size to prevent memory attacks
  if (url.length > INPUT_LIMITS.FILE_MAX_SIZE) {
    return false;
  }
  return DATA_URL_PATTERN.test(url);
}

// ============================================================================
// IP ADDRESS VALIDATION
// ============================================================================

/**
 * Checks if a hostname is a private/internal IP address
 */
function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname));
}

/**
 * Attempts to resolve hostname and check for private IPs
 * Note: This is a best-effort check; DNS rebinding attacks may bypass this
 */
function isHostnamePrivate(hostname: string): boolean {
  // Direct IP check
  if (isPrivateIp(hostname)) {
    return true;
  }

  // Check for localhost variations
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    // Allow localhost in development
    return process.env.NODE_ENV !== 'development';
  }

  return false;
}

// ============================================================================
// DOMAIN VALIDATION
// ============================================================================

/**
 * Checks if a domain is in the allowlist
 */
function isDomainAllowed(hostname: string, additionalDomains?: string[]): boolean {
  // Check explicit allowlist
  if (ALLOWED_DOMAINS.includes(hostname)) {
    return true;
  }

  // Check additional domains for this request
  if (additionalDomains?.includes(hostname)) {
    return true;
  }

  // Check dev-only domains
  if (process.env.NODE_ENV === 'development' && DEV_ALLOWED_DOMAINS.includes(hostname)) {
    return true;
  }

  // Check domain patterns
  if (ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return true;
  }

  return false;
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validates a URL for security (SSRF protection)
 *
 * @example
 * ```ts
 * const result = validateUrl(userProvidedUrl, { allowDataUrls: true });
 * if (!result.valid) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export function validateUrl(
  urlString: string,
  options: UrlValidationOptions = {}
): UrlValidationResult {
  const {
    allowDataUrls = false,
    skipDomainCheck = false,
    additionalAllowedDomains,
    errorPrefix = 'Invalid URL',
  } = options;

  // Empty check
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: `${errorPrefix}: URL is required` };
  }

  // Length check
  if (urlString.length > INPUT_LIMITS.URL_MAX_LENGTH) {
    return { valid: false, error: `${errorPrefix}: URL exceeds maximum length` };
  }

  // Handle data URLs
  if (urlString.startsWith('data:')) {
    if (!allowDataUrls) {
      return { valid: false, error: `${errorPrefix}: Data URLs are not allowed` };
    }
    if (!isValidDataUrl(urlString)) {
      return { valid: false, error: `${errorPrefix}: Invalid data URL format` };
    }
    return { valid: true };
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: `${errorPrefix}: Malformed URL` };
  }

  // Protocol check
  const allowedProtocols = getAllowedProtocols();
  if (!allowedProtocols.includes(url.protocol)) {
    return {
      valid: false,
      error: `${errorPrefix}: Only ${allowedProtocols.join(', ')} protocols are allowed`,
    };
  }

  // Private IP check (always enforced for security)
  if (SECURITY_FLAGS.BLOCK_PRIVATE_IPS && isHostnamePrivate(url.hostname)) {
    return {
      valid: false,
      error: `${errorPrefix}: Private/internal addresses are not allowed`,
    };
  }

  // Domain allowlist check
  if (
    !skipDomainCheck &&
    SECURITY_FLAGS.ENFORCE_URL_ALLOWLIST &&
    !isDomainAllowed(url.hostname, additionalAllowedDomains)
  ) {
    return {
      valid: false,
      error: `${errorPrefix}: Domain '${url.hostname}' is not in the allowlist`,
    };
  }

  return { valid: true, url };
}

/**
 * Simple boolean check for URL validity
 * Use validateUrl() for detailed error messages
 */
export function isValidUrl(urlString: string, options?: UrlValidationOptions): boolean {
  return validateUrl(urlString, options).valid;
}

/**
 * Validates multiple URLs
 */
export function validateUrls(
  urls: string[],
  options?: UrlValidationOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const result = validateUrl(urls[i], {
      ...options,
      errorPrefix: `URL[${i}]`,
    });
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// SPECIALIZED VALIDATORS
// ============================================================================

/**
 * Validates an image URL (allows data URLs)
 */
export function validateImageUrl(urlString: string): UrlValidationResult {
  return validateUrl(urlString, {
    allowDataUrls: true,
    errorPrefix: 'Invalid image URL',
  });
}

/**
 * Validates a webhook/callback URL (stricter - no data URLs, must be HTTPS)
 */
export function validateWebhookUrl(urlString: string): UrlValidationResult {
  const result = validateUrl(urlString, {
    allowDataUrls: false,
    errorPrefix: 'Invalid webhook URL',
  });

  if (result.valid && result.url && result.url.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Webhook URL must use HTTPS',
    };
  }

  return result;
}
