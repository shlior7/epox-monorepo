import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { getLocalFsRoot, isFsDriver } from '@/lib/services/s3/adapter';
import { resolveS3Bucket } from '@/lib/services/s3/config';

const DEFAULT_LOCAL_DIR = process.env.NEXT_PUBLIC_LOCAL_S3_DIR || getLocalFsRoot() || path.join(process.cwd(), '.local-s3');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
};

function sanitizePath(segments: string[] = []) {
  const safeSegments = segments.filter(Boolean).map((segment) => segment.replace(/\.\./g, ''));
  return path.join(...safeSegments);
}

function getMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function sanitizeBucketName(name?: string | null) {
  if (!name) return null;
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function GET(_request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  if (!isFsDriver) {
    return NextResponse.json({ error: 'Local S3 driver is not enabled' }, { status: 404 });
  }

  const { path: pathSegments } = await ctx.params;

  const safeRelativePath = sanitizePath(pathSegments);
  if (!safeRelativePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const rootDir = path.resolve(DEFAULT_LOCAL_DIR);
  const bucketDir =
    sanitizeBucketName(
      process.env.S3_BUCKET ||
        process.env.NEXT_PUBLIC_S3_BUCKET_NAME ||
        process.env.NEXT_PUBLIC_TESTING_S3_BUCKET_NAME ||
        (() => {
          try {
            return resolveS3Bucket();
          } catch {
            return null;
          }
        })()
    ) || null;

  const candidatePaths = [
    path.resolve(rootDir, safeRelativePath),
    bucketDir ? path.resolve(rootDir, bucketDir, safeRelativePath) : null,
  ].filter(Boolean) as string[];

  try {
    for (const absolutePath of candidatePaths) {
      if (!absolutePath.startsWith(rootDir)) continue;

      try {
        const stats = await fs.stat(absolutePath);
        if (stats.isDirectory()) {
          continue;
        }

        const fileBuffer = await fs.readFile(absolutePath);
        const contentType = getMimeType(absolutePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-store',
          },
        });
      } catch (err: any) {
        if (err?.code === 'ENOENT') {
          continue;
        }
        if (err?.code === 'EISDIR') {
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to read local S3 file', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
