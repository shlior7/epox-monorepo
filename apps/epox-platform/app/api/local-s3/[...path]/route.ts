import { NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const LOCAL_STORAGE_ROOT = path.resolve(
  process.env.LOCAL_STORAGE_DIR || process.env.NEXT_PUBLIC_LOCAL_S3_DIR || '.local-storage'
);

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;

  const safeParts = segments.filter(Boolean).map((s) => s.replace(/\.\./g, ''));
  if (safeParts.length === 0) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const absolutePath = path.resolve(LOCAL_STORAGE_ROOT, ...safeParts);
  if (!absolutePath.startsWith(LOCAL_STORAGE_ROOT)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('Failed to read local storage file:', err);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
