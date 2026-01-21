/**
 * Unified S3 client factory that can target AWS, a local filesystem mock, or future emulators.
 */

import { createS3Client, isFsDriver, type S3Like } from './adapter';
import { resolveS3BucketWithFallback } from './config';
import { S3Paths } from './paths';

let s3Client: S3Like | null = null;

export function getS3Client(): S3Like {
  if (!s3Client) {
    if (!isFsDriver) {
      const endpoint =
        process.env.S3_ENDPOINT || process.env.NEXT_PUBLIC_S3_ENDPOINT || process.env.R2_ENDPOINT || process.env.NEXT_PUBLIC_R2_ENDPOINT;
      const usesR2 =
        Boolean(endpoint && endpoint.includes('r2.cloudflarestorage.com')) ||
        Boolean(process.env.R2_ENDPOINT || process.env.NEXT_PUBLIC_R2_ENDPOINT);
      const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
      const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;
      const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
      const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

      if (usesR2) {
        if (!r2AccessKeyId || !r2SecretAccessKey) {
          throw new Error(
            'R2 credentials not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY (or use NEXT_PUBLIC_S3_DRIVER=fs).'
          );
        }
      } else if (!awsAccessKeyId || !awsSecretAccessKey) {
        throw new Error(
          'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or use NEXT_PUBLIC_S3_DRIVER=fs).'
        );
      }
    }

    s3Client = createS3Client();
  }

  return s3Client;
}

export function getS3Bucket(): string {
  return resolveS3BucketWithFallback();
}

export { S3Paths };
