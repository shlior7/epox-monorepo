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
 * Pattern for valid image data URL prefix
 * Allows any image/* MIME type with base64 encoding
 * More permissive to handle browser variations and modern formats (avif, heic, etc.)
 */
const DATA_URL_PREFIX_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

/**
 * Pattern for valid base64 characters (used for sampling validation)
 * Allows whitespace since some encoders add line breaks
 */
const BASE64_CHARS_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

/**
 * Validates a data URL
 * Uses prefix check + sampling to avoid regex catastrophic backtracking on large strings
 */
function isValidDataUrl(url: string): boolean {
  // Limit data URL size to prevent memory attacks (10MB)
  if (url.length > INPUT_LIMITS.FILE_MAX_SIZE) {
    console.warn('[URL Validator] Data URL exceeds size limit:', url.length, '>', INPUT_LIMITS.FILE_MAX_SIZE);
    return false;
  }

  // Check prefix (mime type and base64 declaration)
  if (!DATA_URL_PREFIX_PATTERN.test(url)) {
    const prefix = url.substring(0, 100);
    const hasDataPrefix = url.startsWith('data:');
    const hasImagePrefix = url.startsWith('data:image/');
    const hasBase64 = url.includes(';base64,');
    console.warn('[URL Validator] Data URL prefix validation failed:', {
      prefix,
      hasDataPrefix,
      hasImagePrefix,
      hasBase64,
      urlLength: url.length,
    });
    return false;
  }

  // Find where base64 data starts
  const commaIndex = url.indexOf(',');
  if (commaIndex === -1) {
    console.warn('Data URL missing comma separator');
    return false;
  }

  const base64Data = url.slice(commaIndex + 1);

  // For small data, validate the whole thing
  if (base64Data.length <= 1000) {
    const isValid = BASE64_CHARS_PATTERN.test(base64Data);
    if (!isValid) {
      // Find the first invalid character
      const invalidChar = base64Data.split('').find(c => !/[A-Za-z0-9+/=\s]/.test(c));
      console.warn('Data URL contains invalid base64 character:', invalidChar, 'charCode:', invalidChar?.charCodeAt(0));
    }
    return isValid;
  }

  // For large data, sample beginning and end to avoid regex perf issues
  const sampleStart = base64Data.slice(0, 500);
  const sampleEnd = base64Data.slice(-500);

  const startValid = BASE64_CHARS_PATTERN.test(sampleStart);
  const endValid = BASE64_CHARS_PATTERN.test(sampleEnd);

  if (!startValid || !endValid) {
    console.warn('Data URL base64 sampling validation failed. startValid:', startValid, 'endValid:', endValid);
  }

  return startValid && endValid;
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

  // Check dev/test-only domains
  if (
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    DEV_ALLOWED_DOMAINS.includes(hostname)
  ) {
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

  // Handle relative URLs (e.g. /api/local-s3/...) — allowed in development
  if (urlString.startsWith('/')) {
    if (process.env.NODE_ENV === 'development') {
      return { valid: true };
    }
    return { valid: false, error: `${errorPrefix}: Relative URLs are not allowed in production` };
  }

  // Handle data URLs FIRST (they have different length limits)
  if (urlString.startsWith('data:')) {
    if (!allowDataUrls) {
      return { valid: false, error: `${errorPrefix}: Data URLs are not allowed` };
    }
    // Data URLs use FILE_MAX_SIZE limit (checked in isValidDataUrl)
    if (!isValidDataUrl(urlString)) {
      return { valid: false, error: `${errorPrefix}: Invalid data URL format or exceeds size limit` };
    }
    return { valid: true };
  }

  // Length check for regular URLs only (data URLs have separate size limit)
  if (urlString.length > INPUT_LIMITS.URL_MAX_LENGTH) {
    return { valid: false, error: `${errorPrefix}: URL exceeds maximum length` };
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
