/**
 * Shared configuration helpers for S3 adapters.
 * These utilities are intentionally browser-safe (no Node imports).
 */

function pickEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

/**
 * Resolve the active S3 bucket.
 * Supports both server-only env vars and the NEXT_PUBLIC_* variants used by the UI.
 */
export function resolveS3Bucket(): string {
  const direct = pickEnv('S3_BUCKET', 'AWS_S3_BUCKET', 'SCENERGY_S3_BUCKET', 'R2_BUCKET');
  if (direct) return direct;

  const useTestBucket = pickEnv('USE_TEST_BUCKET', 'NEXT_PUBLIC_USE_TEST_BUCKET') === 'true';

  const primary = pickEnv('S3_BUCKET_NAME', 'NEXT_PUBLIC_S3_BUCKET_NAME', 'NEXT_PUBLIC_R2_BUCKET');
  const test = pickEnv('TESTING_S3_BUCKET_NAME', 'NEXT_PUBLIC_TESTING_S3_BUCKET_NAME');

  const bucket = useTestBucket ? test ?? primary : primary ?? test;

  if (!bucket) {
    throw new Error(
      'S3 bucket not configured. Set S3_BUCKET or NEXT_PUBLIC_S3_BUCKET_NAME / NEXT_PUBLIC_TESTING_S3_BUCKET_NAME.'
    );
  }

  return bucket;
}

/**
 * Safely resolve the S3 bucket with a fallback.
 * Returns a default bucket if environment variables are not configured (e.g., during build).
 */
export function resolveS3BucketWithFallback(defaultBucket = 'scenergy-imaginator'): string {
  try {
    return resolveS3Bucket();
  } catch (error) {
    console.warn('S3 bucket not configured, using default:', error);
    return defaultBucket;
  }
}
