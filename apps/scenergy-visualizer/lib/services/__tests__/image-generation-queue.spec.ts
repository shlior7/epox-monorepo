import { describe, it, expect, beforeEach, afterAll, vi, type MockInstance } from 'vitest';
import type { ImageGenerationJob } from '../image-generation/queue';
import { buildSystemImageGenerationPrompt } from '../prompt-builder';

const {
  redisStore,
  redisTTL,
  redisSet,
  redisGet,
  redisKeys,
  redisMget,
  redisDel,
  redisExpire,
} = vi.hoisted(() => {
  const redisStore = new Map<string, string>();
  const redisTTL = new Map<string, number>();

  const redisSet = vi.fn(async (key: string, value: string) => {
    redisStore.set(key, value);
    return 'OK';
  });

  const redisGet = vi.fn(async (key: string) => redisStore.get(key) ?? null);

  const redisKeys = vi.fn(async (pattern: string) => {
    if (!pattern.endsWith('*')) return [];
    const prefix = pattern.slice(0, -1);
    return Array.from(redisStore.keys()).filter((key) => key.startsWith(prefix));
  });

  const redisMget = vi.fn(async (...keys: string[]) => keys.map((key) => redisStore.get(key) ?? null));

  const redisDel = vi.fn(async (key: string) => {
    const existed = redisStore.delete(key);
    redisTTL.delete(key);
    return existed ? 1 : 0;
  });

  const redisExpire = vi.fn(async (key: string, ttlSeconds: number) => {
    redisTTL.set(key, ttlSeconds);
    return 1;
  });

  return { redisStore, redisTTL, redisSet, redisGet, redisKeys, redisMget, redisDel, redisExpire };
});

vi.mock('../redis/client', () => ({
  redis: {
    set: redisSet,
    get: redisGet,
    keys: redisKeys,
    mget: redisMget,
    del: redisDel,
    expire: redisExpire,
  },
}));

const { generateImagesMock, GeminiServiceMock } = vi.hoisted(() => {
  const generateImagesMock = vi.fn();
  const GeminiServiceMock = vi.fn().mockImplementation(() => ({
    generateImages: generateImagesMock,
  }));
  return { generateImagesMock, GeminiServiceMock };
});

vi.mock('../gemini', () => ({
  GeminiService: GeminiServiceMock,
  getGeminiService: () => new GeminiServiceMock(),
}));

const { uploadFileMock, downloadFileMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  downloadFileMock: vi.fn(),
}));

vi.mock('../r2/media-service', async () => {
  const actual = await vi.importActual<typeof import('../r2/media-service')>('../r2/media-service');
  return {
    ...actual,
    uploadFile: uploadFileMock,
    downloadFile: downloadFileMock,
  };
});

const { uuidValues, uuidMock, resetUuidCounter } = vi.hoisted(() => {
  const uuidValues: string[] = [];
  let counter = 0;
  const uuidMock = vi.fn(() => uuidValues.shift() ?? `uuid-${++counter}`);
  return {
    uuidValues,
    uuidMock,
    resetUuidCounter: () => {
      counter = 0;
      uuidValues.length = 0;
    },
  };
});

vi.mock('uuid', () => ({
  v4: uuidMock,
}));

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

const setIntervalSpy: MockInstance<typeof setInterval> = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0 as any);

import { ImageGenerationQueue } from '../image-generation/queue';
import { S3Paths } from '../s3';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('image-generation queue', () => {
  beforeEach(() => {
    redisStore.clear();
    redisTTL.clear();
    redisSet.mockClear();
    redisGet.mockClear();
    redisKeys.mockClear();
    redisMget.mockClear();
    redisDel.mockClear();
    redisExpire.mockClear();
    uploadFileMock.mockReset();
    downloadFileMock.mockReset();
    generateImagesMock.mockReset();
    GeminiServiceMock.mockClear();
    uuidMock.mockClear();
    resetUuidCounter();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      blob: async () => new Blob(['generated'], { type: 'image/jpeg' }),
    });
    (globalThis as any).__scenergy_image_generation_queue = undefined;
  });

  afterAll(() => {
    setIntervalSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  it('enqueue stores pending job and triggers processing', async () => {
    uuidValues.push('alpha', 'beta');
    const queue = new ImageGenerationQueue();
    const startSpy = vi.spyOn(queue as unknown as { start: (jobId: string) => Promise<void> }, 'start').mockResolvedValue();

    const result = await queue.enqueue({
      clientId: 'client-1',
      productId: 'product-1',
      sessionId: 'session-1',
      prompt: 'Generate an image',
      settings: { numberOfVariants: 2 },
    });

    expect(result.expectedImageIds).toEqual(['generated-alpha.jpg', 'generated-beta.jpg']);
    await new Promise((resolve) => setImmediate(resolve));
    expect(startSpy).toHaveBeenCalledWith(result.jobId);
    const stored = redisStore.get(`job:${result.jobId}`);
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored as string) as ImageGenerationJob;
    expect(parsed.status).toBe('pending');
    expect(parsed.progress).toBe(0);
    expect(parsed.imageIds).toEqual(['generated-alpha.jpg', 'generated-beta.jpg']);
  });

  it('get returns job information', async () => {
    const queue = new ImageGenerationQueue();
    const job: ImageGenerationJob = {
      id: 'job-test',
      request: {
        clientId: 'client',
        productId: 'product',
        sessionId: 'session',
        prompt: 'Prompt',
        settings: {},
      },
      status: 'pending',
      imageIds: [],
      error: null,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    redisStore.set('job:job-test', JSON.stringify(job));

    await expect(queue.get('missing')).resolves.toBeNull();
    await expect(queue.get('job-test')).resolves.toEqual(job);
  });

  it('list returns jobs in reverse chronological order', async () => {
    const queue = new ImageGenerationQueue();
    const jobA: ImageGenerationJob = {
      id: 'job-A',
      request: { clientId: 'c', productId: 'p', sessionId: 's', prompt: '', settings: {} },
      status: 'pending',
      imageIds: [],
      error: null,
      progress: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const jobB: ImageGenerationJob = {
      ...jobA,
      id: 'job-B',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };
    redisStore.set('job:job-A', JSON.stringify(jobA));
    redisStore.set('job:job-B', JSON.stringify(jobB));

    const jobs = await queue.list();
    expect(jobs.map((job) => job.id)).toEqual(['job-B', 'job-A']);
  });

  it('start processes job, uploads image, and marks completion', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-success',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Make it stylish',
        settings: {
          numberOfVariants: 1,
          scene: 'Studio',
          style: 'Modern',
          lighting: 'Soft',
          surroundings: 'Minimal',
        },
        productImageId: 'product-image-1',
      },
      status: 'pending',
      imageIds: ['generated-success.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    downloadFileMock.mockResolvedValueOnce(new Blob(['png'], { type: 'image/png' }));
    generateImagesMock.mockResolvedValue({
      images: [
        {
          url: 'data:image/jpeg;base64,SGVsbG8=',
          format: 'jpeg',
          width: 1024,
          height: 1024,
        },
      ],
      metadata: {},
    });
    uploadFileMock.mockResolvedValue('https://example.com/generated-success.jpg');

    redisStore.set('job:job-success', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-success');
    await flushPromises();

    const stored = JSON.parse(redisStore.get('job:job-success') as string) as ImageGenerationJob;
    expect(stored.status).toBe('completed');
    expect(stored.progress).toBe(100);
    expect(stored.imageIds).toEqual(['generated-success.jpg']);
    expect(redisExpire).toHaveBeenCalledWith('job:job-success', 600);

    expect(downloadFileMock).toHaveBeenCalledWith(
      S3Paths.getProductImageBasePath('client-1', 'product-1', 'product-image-1')
    );
    expect(uploadFileMock).toHaveBeenCalledWith(
      S3Paths.getMediaFilePath('client-1', 'product-1', 'session-1', 'generated-success.jpg'),
      expect.any(File)
    );

    const geminiArgs = generateImagesMock.mock.calls[0][0];
    expect(geminiArgs.prompt).toContain('Scene: Studio');
    expect(geminiArgs.productImages?.[0]).toBeInstanceOf(File);
    expect(geminiArgs.productImages?.[0].type).toBe('image/png');
    expect(geminiArgs.inspirationImages).toBeUndefined();
  });

  it('start falls back to legacy image path when new structure misses', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-fallback',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 1 },
        productImageId: 'legacy-image',
      },
      status: 'pending',
      imageIds: ['generated-fallback.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const noSuchKeyError = Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
    downloadFileMock.mockRejectedValueOnce(noSuchKeyError);
    downloadFileMock.mockResolvedValueOnce(new Blob(['png'], { type: 'image/png' }));
    generateImagesMock.mockResolvedValue({
      images: [{ url: 'data:image/jpeg;base64,SGVsbG8=' }],
      metadata: {},
    });
    uploadFileMock.mockResolvedValue('https://example.com/generated-fallback.jpg');

    redisStore.set('job:job-fallback', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-fallback');
    await flushPromises();

    expect(downloadFileMock).toHaveBeenNthCalledWith(
      1,
      S3Paths.getProductImageBasePath('client-1', 'product-1', 'legacy-image')
    );
    expect(downloadFileMock).toHaveBeenNthCalledWith(
      2,
      S3Paths.getProductImagePath('client-1', 'product-1', 'legacy-image.png')
    );
    const stored = JSON.parse(redisStore.get('job:job-fallback') as string) as ImageGenerationJob;
    expect(stored.status).toBe('completed');
  });

  it('start includes inspiration image when provided', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-inspiration',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 1 },
        productImageId: 'product-image-1',
        inspirationImageId: 'inspiration.jpg',
      },
      status: 'pending',
      imageIds: ['generated-inspiration.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    downloadFileMock
      .mockResolvedValueOnce(new Blob(['png'], { type: 'image/png' }))
      .mockResolvedValueOnce(new Blob(['jpg'], { type: 'image/jpeg' }));
    generateImagesMock.mockResolvedValue({
      images: [{ url: 'data:image/jpeg;base64,SGVsbG8=' }],
      metadata: {},
    });
    uploadFileMock.mockResolvedValue('https://example.com/generated-inspiration.jpg');

    redisStore.set('job:job-inspiration', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-inspiration');
    await flushPromises();

    expect(downloadFileMock).toHaveBeenNthCalledWith(
      1,
      S3Paths.getProductImageBasePath('client-1', 'product-1', 'product-image-1')
    );
    expect(downloadFileMock).toHaveBeenNthCalledWith(
      2,
      S3Paths.getMediaFilePath('client-1', 'product-1', 'session-1', 'inspiration.jpg')
    );

    const args = generateImagesMock.mock.calls.at(-1)?.[0];
    expect(args?.productImages?.[0]).toBeInstanceOf(File);
    expect(args?.productImages?.[0].type).toBe('image/png');
    expect(args?.inspirationImages?.[0]).toBeInstanceOf(File);
    expect(args?.inspirationImages?.[0].type).toBe('image/jpeg');
  });

  it('start marks job as error when generation fails', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-error',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 1 },
      },
      status: 'pending',
      imageIds: ['generated-error.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    generateImagesMock.mockResolvedValue({ images: [] });
    redisStore.set('job:job-error', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-error');
    await flushPromises();

    const stored = JSON.parse(redisStore.get('job:job-error') as string) as ImageGenerationJob;
    expect(stored.status).toBe('error');
    expect(stored.error).toBe('Failed to generate any images');
    expect(redisExpire).toHaveBeenCalledWith('job:job-error', 600);
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it('start completes with partial success when some variants fail', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-partial',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 2 },
      },
      status: 'pending',
      imageIds: ['generated-1.jpg', 'generated-2.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    generateImagesMock
      .mockResolvedValueOnce({
        images: [{ url: 'data:image/jpeg;base64,AAAA' }],
        metadata: {},
      })
      .mockRejectedValueOnce(new Error('Gemini failure'));

    uploadFileMock.mockResolvedValue('https://example.com/generated-1.jpg');
    redisStore.set('job:job-partial', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-partial');
    await flushPromises();

    const stored = JSON.parse(redisStore.get('job:job-partial') as string) as ImageGenerationJob;
    expect(stored.status).toBe('completed');
    expect(stored.imageIds).toEqual(['generated-1.jpg']);
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
    expect(redisExpire).toHaveBeenCalledWith('job:job-partial', 600);
  });

  it('start uploads to client session media path when specified', async () => {
    const queue = new ImageGenerationQueue();
    const now = new Date().toISOString();
    const job: ImageGenerationJob = {
      id: 'job-client-session',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 1 },
        isClientSession: true,
      },
      status: 'pending',
      imageIds: ['generated-session.jpg'],
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    generateImagesMock.mockResolvedValue({
      images: [{ url: 'data:image/jpeg;base64,AAAA' }],
      metadata: {},
    });
    uploadFileMock.mockResolvedValue('https://example.com/generated-session.jpg');

    redisStore.set('job:job-client-session', JSON.stringify(job));

    await (queue as unknown as { start: (id: string) => Promise<void> }).start('job-client-session');
    await flushPromises();

    expect(uploadFileMock).toHaveBeenCalledWith(
      S3Paths.getClientSessionMediaFilePath('client-1', 'session-1', 'generated-session.jpg'),
      expect.any(File)
    );
  });

  it('start propagates errors when Redis update fails', async () => {
    const queue = new ImageGenerationQueue();
    const job: ImageGenerationJob = {
      id: 'job-redis-error',
      request: {
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: { numberOfVariants: 1 },
      },
      status: 'pending',
      imageIds: ['generated.jpg'],
      error: null,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    redisStore.set('job:job-redis-error', JSON.stringify(job));
    redisSet.mockRejectedValueOnce(new Error('Redis down'));

    await expect(
      (queue as unknown as { start: (id: string) => Promise<void> }).start('job-redis-error')
    ).rejects.toThrow('Redis down');
  });

  it('enqueue propagates Redis set failures', async () => {
    const queue = new ImageGenerationQueue();
    redisSet.mockRejectedValueOnce(new Error('Redis unavailable'));

    await expect(
      queue.enqueue({
        clientId: 'client-1',
        productId: 'product-1',
        sessionId: 'session-1',
        prompt: 'Prompt',
        settings: {},
      })
    ).rejects.toThrow('Redis unavailable');
  });

  it('cleanupOldJobs handles Redis errors gracefully', async () => {
    const queue = new ImageGenerationQueue();
    redisKeys.mockRejectedValueOnce(new Error('Redis failure'));

    await expect((queue as unknown as { cleanupOldJobs: () => Promise<void> }).cleanupOldJobs()).resolves.toBeUndefined();
  });

  it('cleanupOldJobs removes expired completed jobs', async () => {
    const queue = new ImageGenerationQueue();
    const recentJob: ImageGenerationJob = {
      id: 'job-recent',
      request: { clientId: 'c', productId: 'p', sessionId: 's', prompt: '', settings: {} },
      status: 'completed',
      imageIds: [],
      error: null,
      progress: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    const oldDate = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const oldJob: ImageGenerationJob = { ...recentJob, id: 'job-old', completedAt: oldDate, updatedAt: oldDate };

    redisStore.set('job:job-recent', JSON.stringify(recentJob));
    redisStore.set('job:job-old', JSON.stringify(oldJob));

    await (queue as unknown as { cleanupOldJobs: () => Promise<void> }).cleanupOldJobs();

    expect(redisDel).toHaveBeenCalledWith('job:job-old');
    expect(redisStore.has('job:job-old')).toBe(false);
    expect(redisStore.has('job:job-recent')).toBe(true);
  });

  it('buildPrompt assembles prompt with settings and guidelines', () => {
    const prompt = buildSystemImageGenerationPrompt('custom instructions', {
      scene: 'Studio',
      style: 'Minimalist',
      lighting: 'Soft',
      surroundings: 'Clean',
    });

    expect(prompt).toContain('custom instructions');
    expect(prompt).toContain('Scene: Studio');
    expect(prompt).toContain('IMPORTANT GUIDELINES');
  });

  it('dataUrlToBlob fetches data URL and returns blob', async () => {
    const queue = new ImageGenerationQueue();
    fetchMock.mockResolvedValueOnce({
      blob: async () => new Blob(['hello'], { type: 'image/jpeg' }),
    });

    const blob = await (queue as unknown as { dataUrlToBlob: (url: string) => Promise<Blob> }).dataUrlToBlob(
      'data:image/jpeg;base64,SGVsbG8='
    );

    expect(fetchMock).toHaveBeenCalledWith('data:image/jpeg;base64,SGVsbG8=');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });
});
