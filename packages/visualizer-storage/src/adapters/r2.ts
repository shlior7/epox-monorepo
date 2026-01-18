import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignedUrl, StorageAdapter, StorageObject, UploadOptions } from '../types';

export interface R2AdapterConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  region?: string;
}

function normalizePublicUrl(url?: string): string | null {
  if (!url) {
    return null;
  }
  return url.replace(/\/+$/, '');
}

async function toBuffer(data: Buffer | Blob | File): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer);
  }
  if (typeof (data as Blob).arrayBuffer === 'function') {
    return Buffer.from(await (data as Blob).arrayBuffer());
  }
  return Buffer.from(String(data));
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (typeof (body as any)?.transformToByteArray === 'function') {
    const bytes = await (body as any).transformToByteArray();
    return Buffer.from(bytes);
  }
  if (typeof (body as any)?.arrayBuffer === 'function') {
    return Buffer.from(await (body as any).arrayBuffer());
  }
  if (typeof (body as any)?.getReader === 'function') {
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        chunks.push(value);
      }
    }
    return Buffer.from(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  }
  if (typeof (body as any)?.[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of body as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return Buffer.from(String(body));
}

export function createR2Adapter(config: R2AdapterConfig): StorageAdapter {
  const client = new S3Client({
    region: config.region ?? 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const bucket = config.bucket;
  const publicUrl = normalizePublicUrl(config.publicUrl) ?? null;

  async function getUploadUrl(key: string, options?: UploadOptions): Promise<PresignedUrl> {
    const expiresIn = options?.expiresIn ?? 60;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options?.contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return {
      url,
      key,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async function getDownloadUrl(key: string, expiresIn = 60): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  }

  async function upload(key: string, data: Buffer | Blob | File, contentType?: string): Promise<void> {
    const body = await toBuffer(data);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async function download(key: string): Promise<Buffer> {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return bodyToBuffer(response.Body);
  }

  async function remove(key: string): Promise<void> {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async function exists(key: string): Promise<boolean> {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async function list(prefix: string): Promise<StorageObject[]> {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      })
    );

    return (
      response.Contents?.map((entry) => ({
        key: entry.Key ?? '',
        size: entry.Size ?? 0,
        lastModified: entry.LastModified ?? new Date(0),
      })) ?? []
    );
  }

  function getPublicUrl(key: string): string {
    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    return `https://${bucket}.r2.cloudflarestorage.com/${key}`;
  }

  return {
    getUploadUrl,
    getDownloadUrl,
    upload,
    download,
    delete: remove,
    exists,
    list,
    getPublicUrl,
  };
}
