import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client as AwsS3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Upload as AwsUpload } from '@aws-sdk/lib-storage';
import * as fssync from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import os from 'node:os';

export interface S3Like {
  send(command: any): Promise<any>;
}

export interface UploadLike {
  done(): Promise<unknown>;
}

const DRIVER = (process.env.NEXT_PUBLIC_S3_DRIVER ?? 'aws').toLowerCase();
const ENDPOINT =
  process.env.S3_ENDPOINT ??
  process.env.NEXT_PUBLIC_S3_ENDPOINT ??
  process.env.R2_ENDPOINT ??
  process.env.NEXT_PUBLIC_R2_ENDPOINT;
const isFsDriver = DRIVER === 'fs';

let resolvedFsRoot: string | null = null;

const fsRoot = isFsDriver
  ? process.env.NEXT_PUBLIC_LOCAL_S3_DIR
    ? path.resolve(process.env.NEXT_PUBLIC_LOCAL_S3_DIR)
    : fssync.mkdtempSync(path.join(os.tmpdir(), 'scenergy-local-s3-'))
  : null;

if (isFsDriver && fsRoot) {
  resolvedFsRoot = fsRoot;
  process.env.NEXT_PUBLIC_LOCAL_S3_DIR = process.env.NEXT_PUBLIC_LOCAL_S3_DIR ?? fsRoot;
  ensureDir(fsRoot);
  registerCleanup(fsRoot);
}

function registerCleanup(rootDir: string) {
  const shouldCleanup = process.env.S3_FS_DISABLE_CLEANUP !== 'true';
  if (!shouldCleanup) return;

  const cleanup = () => {
    try {
      if (fssync.existsSync(rootDir)) {
        fssync.rmSync(rootDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn('Failed to cleanup local S3 directory:', err);
    }
  };

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  let cleaned = false;
  const shutdown = () => {
    if (cleaned) return;
    cleaned = true;
    cleanup();
    console.info(`🧹 Cleaned local S3 directory (${rootDir})`);
  };
  for (const signal of signals) {
    process.once(signal, shutdown);
  }
}

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('The fs-based S3 driver can only run in a Node.js environment.');
  }
}

function ensureDir(dir: string) {
  fssync.mkdirSync(dir, { recursive: true });
}

function bucketPath(bucket: string) {
  if (!fsRoot) {
    throw new Error('LOCAL_S3_DIR not configured for fs driver');
  }
  const safeBucket = bucket.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fullPath = path.join(fsRoot, safeBucket);
  ensureDir(fullPath);
  return fullPath;
}

function keyPath(bucket: string, key: string) {
  const safeParts = key.split('/').map((segment) => segment.replace(/[*?"<>|\\]/g, '_'));
  const filePath = path.join(bucketPath(bucket), ...safeParts);
  ensureDir(path.dirname(filePath));
  return filePath;
}

async function bufferFromBody(body: unknown): Promise<Buffer> {
  if (body == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer);
  if (body instanceof ArrayBuffer) return Buffer.from(body);

  // Support Node Readable streams.
  if (typeof (body as any)?.pipe === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of body as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (typeof (body as any)?.getReader === 'function') {
    const reader = (body as ReadableStream<any>).getReader();
    const chunks: Buffer[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  // Browser Blob (when running through serverless adapters/tests)
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }

  return Buffer.from(String(body));
}

function makeBody(buffer: Buffer) {
  return {
    transformToString: async () => buffer.toString('utf-8'),
    transformToByteArray: async () => new Uint8Array(buffer),
    async *[Symbol.asyncIterator]() {
      yield buffer;
    },
  };
}

class FsS3Client implements S3Like {
  async send(command: any) {
    assertServerOnly();

    if (command instanceof PutObjectCommand) {
      const { Bucket, Key, Body, Metadata } = command.input;
      if (!Bucket || !Key) throw new Error('PutObjectCommand requires Bucket and Key');
      const file = keyPath(Bucket, Key);
      const buffer = await bufferFromBody(Body);
      await fsp.writeFile(file, buffer);
      if (Metadata && Object.keys(Metadata).length) {
        await fsp.writeFile(`${file}.meta.json`, JSON.stringify(Metadata, null, 2));
      }
      return {
        ETag: `"${Buffer.from(Key).toString('hex').slice(0, 32)}"`,
      };
    }

    if (command instanceof GetObjectCommand) {
      const { Bucket, Key } = command.input;
      if (!Bucket || !Key) throw new Error('GetObjectCommand requires Bucket and Key');
      const file = keyPath(Bucket, Key);
      try {
        const buffer = await fsp.readFile(file);
        return {
          Body: makeBody(buffer),
          ContentLength: buffer.length,
          ContentType: command.input.ResponseContentType,
        };
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          const error = new Error(`NoSuchKey: ${Key}`);
          (error as any).name = 'NoSuchKey';
          throw error;
        }
        throw err;
      }
    }

    if (command instanceof HeadObjectCommand) {
      const { Bucket, Key } = command.input;
      if (!Bucket || !Key) throw new Error('HeadObjectCommand requires Bucket and Key');
      const file = keyPath(Bucket, Key);
      try {
        const stats = await fsp.stat(file);
        return {
          ContentLength: stats.size,
          ETag: `"${Buffer.from(Key).toString('hex').slice(0, 32)}"`,
        };
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          const error = new Error(`NotFound: ${Key}`);
          (error as any).$metadata = { httpStatusCode: 404 };
          throw error;
        }
        throw err;
      }
    }

    if (command instanceof ListObjectsV2Command) {
      const { Bucket, Prefix = '' } = command.input;
      if (!Bucket) throw new Error('ListObjectsV2Command requires Bucket');
      const base = bucketPath(Bucket);
      const contents: Array<{ Key: string; Size: number }> = [];

      async function walk(current: string, relative = '') {
        const entries = await fsp.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(current, entry.name);
          const relPath = path.posix.join(relative, entry.name);

          if (entry.isDirectory()) {
            await walk(entryPath, relPath);
          } else if (!relPath.endsWith('.meta.json')) {
            const key = relPath;
            if (!Prefix || key.startsWith(Prefix)) {
              const stat = await fsp.stat(entryPath);
              contents.push({ Key: key, Size: stat.size });
            }
          }
        }
      }

      if (fssync.existsSync(base)) {
        await walk(base);
      }

      return {
        IsTruncated: false,
        KeyCount: contents.length,
        Contents: contents,
      };
    }

    if (command instanceof DeleteObjectCommand) {
      const { Bucket, Key } = command.input;
      if (!Bucket || !Key) throw new Error('DeleteObjectCommand requires Bucket and Key');
      const file = keyPath(Bucket, Key);
      await fsp.rm(file, { force: true }).catch(() => undefined);
      await fsp.rm(`${file}.meta.json`, { force: true }).catch(() => undefined);
      return {};
    }

    throw new Error(`FsS3Client: unsupported command ${command?.constructor?.name}`);
  }
}

class FsUpload implements UploadLike {
  private client: S3Like;
  private params: any;

  constructor(options: { client: S3Like; params: any }) {
    this.client = options.client;
    this.params = options.params;
  }

  async done() {
    await this.client.send(new PutObjectCommand(this.params));
    return { ETag: 'fs-upload' };
  }
}

function createAwsClient(): S3Like {
  const normalizedEndpoint = ENDPOINT ? normalizeEndpoint(ENDPOINT) : undefined;
  const isR2Endpoint = Boolean(normalizedEndpoint && normalizedEndpoint.includes('r2.cloudflarestorage.com'));
  const region =
    process.env.AWS_REGION ||
    process.env.R2_REGION ||
    process.env.NEXT_PUBLIC_AWS_REGION ||
    process.env.NEXT_PUBLIC_R2_REGION ||
    (isR2Endpoint ? 'auto' : 'us-east-1');

  const config: S3ClientConfig = {
    region,
    requestChecksumCalculation: 'WHEN_REQUIRED',
  };

  if (normalizedEndpoint) {
    config.endpoint = normalizedEndpoint;
    config.forcePathStyle = true;
    const preferR2 = isR2Endpoint || hasR2Config();
    const r2AccessKeyId =
      process.env.R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
    const r2SecretAccessKey =
      process.env.R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;
    const awsAccessKeyId =
      process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

    config.credentials = {
      accessKeyId: (preferR2 ? r2AccessKeyId || awsAccessKeyId : awsAccessKeyId || r2AccessKeyId) || 'minio',
      secretAccessKey:
        (preferR2 ? r2SecretAccessKey || awsSecretAccessKey : awsSecretAccessKey || r2SecretAccessKey) || 'minio123',
    };
  }

  return new AwsS3Client(config);
}

export function createS3Client(): S3Like {
  return isFsDriver ? new FsS3Client() : (createAwsClient() as unknown as S3Like);
}

export function createUpload(options: { client: S3Like; params: any }): UploadLike {
  return isFsDriver ? new FsUpload(options) : new (AwsUpload as any)(options);
}

export { isFsDriver };

export function getLocalFsRoot(): string | null {
  return resolvedFsRoot;
}

function normalizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.origin;
  } catch {
    return endpoint.replace(/\/+$/, '');
  }
}

function hasR2Config(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT ||
      process.env.NEXT_PUBLIC_R2_ENDPOINT ||
      process.env.R2_BUCKET ||
      process.env.NEXT_PUBLIC_R2_BUCKET ||
      process.env.R2_ACCESS_KEY_ID ||
      process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID
  );
}
