/**
 * Security Configuration
 *
 * Centralized configuration for all security features.
 * Toggle features via environment variables for dev/staging/production.
 */

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Security feature flags - controlled by environment variables
 */
export const SECURITY_FLAGS = {
  /** Enforce URL domain allowlist for SSRF protection */
  ENFORCE_URL_ALLOWLIST: process.env.SECURITY_ENFORCE_URL_ALLOWLIST !== 'false',

  /** Require authentication on all protected routes */
  REQUIRE_AUTH: process.env.SECURITY_REQUIRE_AUTH !== 'false', // Default: true

  /** Enable rate limiting */
  ENABLE_RATE_LIMITING: process.env.SECURITY_ENABLE_RATE_LIMITING === 'true',

  /** Log security events */
  ENABLE_SECURITY_LOGGING: process.env.SECURITY_ENABLE_LOGGING !== 'false', // Default: true

  /** Block private/internal IP addresses in URLs */
  BLOCK_PRIVATE_IPS: process.env.SECURITY_BLOCK_PRIVATE_IPS !== 'false', // Default: true
} as const;

// ============================================================================
// URL ALLOWLIST CONFIGURATION
// ============================================================================

/**
 * Allowed URL protocols
 */
export const ALLOWED_PROTOCOLS = ['https:'] as const;

/**
 * Allowed protocols for development (includes http for localhost)
 */
export const DEV_ALLOWED_PROTOCOLS = ['https:', 'http:'] as const;

/**
 * Get allowed protocols based on environment
 */
export function getAllowedProtocols(): readonly string[] {
  return process.env.NODE_ENV === 'development' ? DEV_ALLOWED_PROTOCOLS : ALLOWED_PROTOCOLS;
}

/**
 * Explicitly allowed domains for external URLs
 * Add your trusted CDN, storage, and API domains here
 */
export const ALLOWED_DOMAINS: readonly string[] = [
  // Cloudflare R2 storage
  'pub-5cb0d6bfdf524f9cb1c47e52bbe80f74.r2.dev',

  // Google Cloud Storage
  'storage.googleapis.com',

  // Unsplash images
  'images.unsplash.com',

  // Add other trusted domains as needed
];

/**
 * Domain patterns (regex) for dynamic subdomains
 */
export const ALLOWED_DOMAIN_PATTERNS: readonly RegExp[] = [
  // Cloudflare R2 public buckets: pub-{hash}.r2.dev
  /^pub-[a-f0-9]+\.r2\.dev$/,

  // Vercel blob storage
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/,
];

/**
 * Domains allowed in development and test only
 */
export const DEV_ALLOWED_DOMAINS: readonly string[] = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'example.com', // For tests
];

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration by route category
 */
export const RATE_LIMITS = {
  /** Default rate limit for API routes */
  default: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min

  /** Rate limit for authentication routes */
  auth: { requests: 10, windowMs: 60 * 1000 }, // 10 req/min

  /** Rate limit for AI/generation routes (expensive operations) */
  generation: { requests: 20, windowMs: 60 * 1000 }, // 20 req/min

  /** Rate limit for file uploads */
  upload: { requests: 30, windowMs: 60 * 1000 }, // 30 req/min
} as const;

// ============================================================================
// INPUT VALIDATION LIMITS
// ============================================================================

/**
 * Maximum lengths for common input fields
 */
export const INPUT_LIMITS = {
  /** Maximum length for text prompts */
  PROMPT_MAX_LENGTH: 10000,

  /** Maximum length for names (product, collection, etc.) */
  NAME_MAX_LENGTH: 255,

  /** Maximum length for descriptions */
  DESCRIPTION_MAX_LENGTH: 5000,

  /** Maximum file size in bytes (10MB) */
  FILE_MAX_SIZE: 10 * 1024 * 1024,

  /** Maximum number of items in batch operations */
  BATCH_MAX_SIZE: 100,

  /** Maximum URL length */
  URL_MAX_LENGTH: 2048,
} as const;

// ============================================================================
// PRIVATE IP RANGES (for SSRF protection)
// ============================================================================

/**
 * Private/internal IP ranges that should be blocked
 * These are used to prevent SSRF attacks targeting internal services
 */
export const PRIVATE_IP_RANGES = [
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,

  // Loopback
  /^127\./,
  /^0\./,

  // Link-local
  /^169\.254\./,

  // IPv6 private ranges
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,

  // Metadata endpoints (cloud providers)
  /^169\.254\.169\.254$/,
  /^metadata\.google\.internal$/,
] as const;
