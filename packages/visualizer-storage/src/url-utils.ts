/**
 * URL Utilities for Storage
 *
 * Provides centralized URL resolution for storage assets.
 * Supports CDN and custom base URLs for future flexibility.
 */

/**
 * Get the public base URL for storage assets
 * Priority: CDN_URL > R2_PUBLIC_URL > fallback
 */
export function getStorageBaseUrl(): string {
  // Check for CDN first (for future use)
  if (process.env.CDN_URL) {
    return process.env.CDN_URL;
  }

  // Fall back to R2 public URL
  if (process.env.R2_PUBLIC_URL) {
    return process.env.R2_PUBLIC_URL;
  }

  // Development fallback
  return 'https://pub-b173dd19ec2840a5b068d4748260373f.r2.dev';
}

/**
 * Convert a storage key to a public URL
 *
 * @param storageKey - The relative storage key (e.g., "clients/xxx/products/yyy/image.png")
 * @returns Full public URL
 *
 * @example
 * ```ts
 * const url = resolveStorageUrl('clients/123/products/456/image.png');
 * // Returns: "https://cdn.example.com/clients/123/products/456/image.png"
 * ```
 */
export function resolveStorageUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) {
    return null;
  }

  // If already a full URL, return as-is
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey;
  }

  const baseUrl = getStorageBaseUrl();

  // Ensure no double slashes
  const cleanKey = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${cleanBase}/${cleanKey}`;
}

/**
 * Convert multiple storage keys to public URLs
 *
 * @param storageKeys - Array of storage keys
 * @returns Array of full public URLs (filters out null values)
 */
export function resolveStorageUrls(storageKeys: (string | null | undefined)[]): string[] {
  return storageKeys
    .map(resolveStorageUrl)
    .filter((url): url is string => url !== null);
}

/**
 * Extract storage key from a full URL
 * Useful for reverse operations or migrations
 *
 * @param url - Full public URL
 * @returns Storage key without base URL
 */
export function extractStorageKey(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  // If it's already a relative path, return as-is
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }

  const baseUrl = getStorageBaseUrl();

  if (url.startsWith(baseUrl)) {
    return url.slice(baseUrl.length + 1); // +1 to remove leading slash
  }

  // Check against R2_PUBLIC_URL as well
  const r2Url = process.env.R2_PUBLIC_URL;
  if (r2Url && url.startsWith(r2Url)) {
    return url.slice(r2Url.length + 1);
  }

  // Can't extract - return original URL
  return url;
}
