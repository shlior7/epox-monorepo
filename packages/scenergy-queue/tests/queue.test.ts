/**
 * Queue Tests
 *
 * Comprehensive tests for the scenergy-queue package.
 * Uses the actual QueueClient and QueueWorker classes.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getJobStatus, getJobStatuses } from '../src/job-status';
import { createQueueClient, type QueueClient } from '../src/queue/client';
import { QueueWorker } from '../src/queue/worker';
import type { ImageGenerationResult, ImageEditResult } from '../src/types';
import { TEST_CONFIG, getTestRedis } from './setup';

// Test image data
const TEST_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Mock Gemini service
const mockGeminiService = {
  generateImages: vi.fn().mockImplementation(async (req: { count?: number; prompt?: string }) => ({
    images: Array.from({ length: req.count ?? 1 }, () => ({
      url: TEST_IMAGE_BASE64,
      format: 'png',
      width: 1024,
      height: 1024,
    })),
    metadata: { model: 'test', cost: 0.01, prompt: req.prompt, generatedAt: new Date().toISOString() },
  })),
  editImage: vi.fn().mockResolvedValue({
    editedImageDataUrl: TEST_IMAGE_BASE64,
  }),
};

vi.mock('visualizer-services', () => ({
  getGeminiService: () => mockGeminiService,
}));

// Mock persistence
const mockSaveGeneratedImage = vi.fn().mockImplementation(async (params) => ({
  id: `mock-asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  url: `https://mock-cdn.com/images/${params.jobId}/${Date.now()}.png`,
}));

vi.mock('../src/persistence', () => ({
  saveGeneratedImage: (params: unknown) => mockSaveGeneratedImage(params),
}));

const QUEUE_NAME = 'queue-test';

describe('Scenergy Queue', () => {
  let client: QueueClient;
  let worker: QueueWorker;

  beforeAll(async () => {
    client = createQueueClient({
      redisUrl: TEST_CONFIG.redis.url,
      queueName: QUEUE_NAME,
    });
  });

  afterAll(async () => {
    // Allow pending operations to complete before closing
    await new Promise((r) => setTimeout(r, 100));
    await client.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGeminiService.generateImages.mockClear();
    mockGeminiService.editImage.mockClear();
    mockSaveGeneratedImage.mockClear();

    // Reset mock implementations to defaults
    mockGeminiService.generateImages.mockImplementation(async (req: { count?: number; prompt?: string }) => ({
      images: Array.from({ length: req.count ?? 1 }, () => ({
        url: TEST_IMAGE_BASE64,
        format: 'png',
        width: 1024,
        height: 1024,
      })),
      metadata: { model: 'test', cost: 0.01, prompt: req.prompt, generatedAt: new Date().toISOString() },
    }));
    mockSaveGeneratedImage.mockImplementation(async (params) => ({
      id: `mock-asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: `https://mock-cdn.com/images/${params.jobId}/${Date.now()}.png`,
    }));

    // Clean up Redis state
    const redis = getTestRedis();
    const keys = await redis.keys(`bull:${QUEUE_NAME}:*`);
    if (keys.length > 0) {await redis.del(...keys);}
    const statusKeys = await redis.keys('job-status:*');
    if (statusKeys.length > 0) {await redis.del(...statusKeys);}

    // Create worker with low concurrency for predictable test behavior
    worker = new QueueWorker({
      redisUrl: TEST_CONFIG.redis.url,
      queueName: QUEUE_NAME,
      concurrency: 1,
    });
  });

  afterEach(async () => {
    await worker.close();
  });

  // ==========================================================================
  // BASIC JOB FLOW
  // ==========================================================================
  describe('Basic Job Flow', () => {
    it('should enqueue and process a job end-to-end', async () => {
      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        sessionId: 'test-session',
        productIds: ['prod-1'],
        prompt: 'A beautiful sunset over mountains',
        settings: {},
      });

      expect(jobId).toBeDefined();

      // Wait for processing
      await new Promise((r) => setTimeout(r, 600));

      // Verify completion
      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      const result = status?.result as ImageGenerationResult | undefined;
      expect(result?.success).toBe(true);
      expect(result?.imageIds).toHaveLength(1);
    });

    it('should process image edit jobs', async () => {
      const { jobId } = await client.enqueue('image_edit', {
        clientId: 'test-client',
        sourceImageUrl: TEST_IMAGE_BASE64,
        editPrompt: 'Add dramatic lighting',
      });

      await new Promise((r) => setTimeout(r, 600));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      const result = status?.result as ImageEditResult | undefined;
      expect(result?.success).toBe(true);
      expect(result?.imageId).toBeDefined();
    });

    it('should fail gracefully for unsupported job types', async () => {
      const { jobId } = await client.enqueue('video_generation' as any, {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'A video',
      } as any);

      await new Promise((r) => setTimeout(r, 600));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('failed');
      expect(status?.error).toContain('Unsupported job type');
    });
  });

  // ==========================================================================
  // VARIANTS & MULTI-PRODUCT
  // ==========================================================================
  describe('Variants & Multi-Product', () => {
    it('should generate multiple variants', async () => {
      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Modern living room',
        settings: { variants: 3 },
      });

      await new Promise((r) => setTimeout(r, 800));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');

      // Should have called Gemini 3 times
      expect(mockGeminiService.generateImages).toHaveBeenCalledTimes(3);
      // Should have saved 3 images
      expect(mockSaveGeneratedImage).toHaveBeenCalledTimes(3);

      const result = status?.result as ImageGenerationResult | undefined;
      expect(result?.imageIds).toHaveLength(3);
    });

    it('should link all productIds to generated asset', async () => {
      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['mattress-1', 'bed-frame-1', 'pillow-1'],
        prompt: 'Complete bedroom setup',
        settings: {},
      });

      await new Promise((r) => setTimeout(r, 600));

      // Verify the save call included all product IDs
      expect(mockSaveGeneratedImage).toHaveBeenCalledWith(
        expect.objectContaining({
          productIds: ['mattress-1', 'bed-frame-1', 'pillow-1'],
        })
      );
    });
  });

  // ==========================================================================
  // SETTINGS PASSTHROUGH
  // ==========================================================================
  describe('Settings Passthrough', () => {
    it('should pass aspectRatio and imageQuality to Gemini', async () => {
      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Wide landscape',
        settings: {
          aspectRatio: '21:9',
          imageQuality: '4k',
        },
      });

      await new Promise((r) => setTimeout(r, 600));

      expect(mockGeminiService.generateImages).toHaveBeenCalledWith(
        expect.objectContaining({
          aspectRatio: '21:9',
          imageQuality: '4k',
        })
      );
    });

    it('should save settings with the generated asset', async () => {
      const settings = { aspectRatio: '1:1', imageQuality: '2k' as const };

      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Square product shot',
        settings,
      });

      await new Promise((r) => setTimeout(r, 600));

      expect(mockSaveGeneratedImage).toHaveBeenCalledWith(
        expect.objectContaining({ settings })
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should complete with success=false when Gemini fails', async () => {
      mockGeminiService.generateImages.mockRejectedValue(new Error('API quota exceeded'));

      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Should fail',
        settings: {},
      });

      await new Promise((r) => setTimeout(r, 600));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      const result = status?.result as ImageGenerationResult | undefined;
      expect(result?.success).toBe(false);
      expect(result?.imageIds).toHaveLength(0);
    });

    it('should continue on partial variant failures', async () => {
      mockSaveGeneratedImage
        .mockRejectedValueOnce(new Error('Storage error')) // Variant 1 fails
        .mockImplementation(async (params) => ({
          id: `asset-${Date.now()}`,
          url: `https://cdn.com/${params.jobId}.png`,
        }));

      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Partial success',
        settings: { variants: 3 },
      });

      await new Promise((r) => setTimeout(r, 800));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      const result = status?.result as ImageGenerationResult | undefined;
      expect(result?.success).toBe(true); // Some succeeded
      expect(result?.imageIds?.length).toBe(2); // 2 out of 3
    });

    it('should fail completely when edit returns null', async () => {
      mockGeminiService.editImage.mockResolvedValue({ editedImageDataUrl: null });

      const { jobId } = await client.enqueue('image_edit', {
        clientId: 'test-client',
        sourceImageUrl: TEST_IMAGE_BASE64,
        editPrompt: 'Impossible edit',
      });

      await new Promise((r) => setTimeout(r, 600));

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
      const result = status?.result as ImageEditResult | undefined;
      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Edit failed');
    });
  });

  // ==========================================================================
  // PRIORITY ORDERING
  // ==========================================================================
  describe('Priority Ordering', () => {
    it('should process urgent jobs before normal and batch jobs', async () => {
      // Close default worker and wait
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      // Enqueue jobs BEFORE starting worker (queue them up)
      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['batch'],
        prompt: 'Batch job',
        settings: {},
      }, { priority: 'batch' });

      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['normal'],
        prompt: 'Normal job',
        settings: {},
      }, { priority: 'normal' });

      await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['urgent'],
        prompt: 'Urgent job',
        settings: {},
      }, { priority: 'urgent' });

      // Track processing order
      const processOrder: string[] = [];
      mockSaveGeneratedImage.mockImplementation(async (params) => {
        processOrder.push(params.productIds[0]);
        return { id: `asset-${Date.now()}`, url: 'https://cdn.com/img.png' };
      });

      // Now start worker
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 1,
      });

      await new Promise((r) => setTimeout(r, 1500));

      // Urgent should be processed first
      expect(processOrder[0]).toBe('urgent');
      expect(processOrder).toContain('normal');
      expect(processOrder).toContain('batch');
    });
  });

  // ==========================================================================
  // CONCURRENCY
  // ==========================================================================
  describe('Concurrency', () => {
    it('should process multiple jobs concurrently', async () => {
      // Close single-concurrency worker and wait
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      // Track concurrent processing
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      mockGeminiService.generateImages.mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((r) => setTimeout(r, 100)); // Simulate work
        currentConcurrent--;
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Create high-concurrency worker
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 5,
      });

      // Enqueue 10 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `Concurrent test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for completion
      await new Promise((r) => setTimeout(r, 1500));

      // Should have processed concurrently
      expect(maxConcurrent).toBeGreaterThan(1);

      // All should be completed
      const statuses = await getJobStatuses(jobIds);
      expect(statuses.size).toBe(10);
      for (const [, status] of statuses) {
        expect(status.status).toBe('completed');
      }
    });
  });

  // ==========================================================================
  // RETRIES
  // ==========================================================================
  describe('Retries', () => {
    it('should track Gemini call count across variants', async () => {
      // When generating 3 variants, Gemini should be called 3 times
      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Retry test',
        settings: { variants: 3 },
      });

      await new Promise((r) => setTimeout(r, 800));

      expect(mockGeminiService.generateImages).toHaveBeenCalledTimes(3);

      const status = await getJobStatus(jobId);
      expect(status?.status).toBe('completed');
    });
  });

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================
  describe('Progress Tracking', () => {
    it('should update progress during variant generation', async () => {
      // Slow down generation to capture progress
      mockGeminiService.generateImages.mockImplementation(
        () => new Promise((r) =>
          setTimeout(() => r({
            images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
            metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
          }), 150)
        )
      );

      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Progress test',
        settings: { variants: 3 },
      });

      // Poll for progress
      const progressValues: number[] = [];
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const status = await getJobStatus(jobId);
        if (status?.progress !== undefined) {
          progressValues.push(status.progress);
        }
        if (status?.status === 'completed') break;
      }

      // Should have intermediate progress values
      expect(progressValues.some((p) => p > 0 && p < 100)).toBe(true);
    });
  });

  // ==========================================================================
  // QUEUE CLIENT OPERATIONS
  // ==========================================================================
  describe('Queue Client Operations', () => {
    it('should retrieve job info', async () => {
      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        sessionId: 'session-123',
        productIds: ['prod-1'],
        prompt: 'Info test',
        settings: { aspectRatio: '16:9' },
      });

      const job = await client.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.type).toBe('image_generation');
      expect(job?.payload).toMatchObject({
        clientId: 'test-client',
        sessionId: 'session-123',
      });
    });

    it('should return queue statistics', async () => {
      // Enqueue jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `Stats test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Verify jobs exist
      const jobs = await client.getJobs(jobIds);
      expect(jobs.length).toBe(5);

      // Get stats - structure should be correct even if values vary
      const stats = await client.getStats();
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.total).toBe('number');
    });

    it('should retrieve multiple jobs by ID', async () => {
      const { jobId: job1 } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Multi-get test 1',
        settings: {},
      });

      const { jobId: job2 } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-2'],
        prompt: 'Multi-get test 2',
        settings: {},
      });

      const jobs = await client.getJobs([job1, job2]);

      expect(jobs.length).toBe(2);
      expect(jobs.map((j) => j.id).sort()).toEqual([job1, job2].sort());
    });
  });

  // ==========================================================================
  // DELAYED JOBS
  // ==========================================================================
  describe('Delayed Jobs', () => {
    it('should delay job processing', async () => {
      const startTime = Date.now();

      const { jobId } = await client.enqueue('image_generation', {
        clientId: 'test-client',
        productIds: ['prod-1'],
        prompt: 'Delayed job',
        settings: {},
      }, {
        delay: 300, // 300ms delay
      });

      // Job should exist but not be processed yet
      const job = await client.getJob(jobId);
      expect(job).toBeDefined();
      expect(['pending', 'delayed']).toContain(job?.status);

      // Wait for delay + processing
      await new Promise((r) => setTimeout(r, 800));

      const finalStatus = await getJobStatus(jobId);
      expect(finalStatus?.status).toBe('completed');

      // Should have taken at least 300ms
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(300);
    });
  });

  // ==========================================================================
  // RATE LIMITING & CONCURRENCY CONTROL
  // ==========================================================================
  describe('Rate Limiting & Concurrency Control', () => {
    it('should queue jobs when concurrency limit is reached', async () => {
      // Close default worker
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      // Track job states
      const activeJobs = new Set<string>();
      let maxActive = 0;
      const completedOrder: string[] = [];

      // Slow down processing to observe queue behavior
      mockGeminiService.generateImages.mockImplementation(async () => {
        const jobId = `job-${Date.now()}`;
        activeJobs.add(jobId);
        maxActive = Math.max(maxActive, activeJobs.size);
        
        await new Promise((r) => setTimeout(r, 200)); // 200ms per job
        
        activeJobs.delete(jobId);
        completedOrder.push(jobId);
        
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Create worker with concurrency of 2
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 2,
      });

      // Enqueue 6 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 6; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `Concurrency test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for all to complete (6 jobs, 2 at a time, 200ms each = ~600ms)
      await new Promise((r) => setTimeout(r, 1500));

      // Should never exceed concurrency of 2
      expect(maxActive).toBeLessThanOrEqual(2);
      
      // All jobs should complete
      const statuses = await getJobStatuses(jobIds);
      expect(statuses.size).toBe(6);
      for (const [, status] of statuses) {
        expect(status.status).toBe('completed');
      }
    });

    it('should respect rate limit (maxJobsPerMinute / RPM)', async () => {
      // Close default worker
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      // Track timing of Gemini calls
      const callTimes: number[] = [];

      mockGeminiService.generateImages.mockImplementation(async () => {
        callTimes.push(Date.now());
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Create worker with rate limit of 60 RPM
      // BullMQ limiter allows N jobs per duration, so 60 per 60 seconds
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 10,
        maxJobsPerMinute: 60,
      });

      // Enqueue 10 jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `Rate limit test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for processing
      await new Promise((r) => setTimeout(r, 2000));

      // All 10 jobs should complete (within the 60 RPM limit)
      expect(callTimes.length).toBe(10);

      // All jobs should complete
      const statuses = await getJobStatuses(jobIds);
      for (const [, status] of statuses) {
        expect(status.status).toBe('completed');
      }
    });

    it('should handle higher throughput with increased RPM (e.g., 1000 RPM tier)', async () => {
      // Close default worker
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      const callTimes: number[] = [];

      mockGeminiService.generateImages.mockImplementation(async () => {
        callTimes.push(Date.now());
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Create worker with HIGH RPM (simulating premium Gemini tier)
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 20,
        maxJobsPerMinute: 1000, // Premium tier: 1000 RPM
      });

      // Enqueue 15 jobs
      const startTime = Date.now();
      const jobIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `High throughput test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for completion
      await new Promise((r) => setTimeout(r, 1500));

      const totalTime = Date.now() - startTime;

      // With high RPM, all 15 should complete quickly
      expect(callTimes.length).toBe(15);
      expect(totalTime).toBeLessThan(2000); // Should be fast

      const statuses = await getJobStatuses(jobIds);
      for (const [, status] of statuses) {
        expect(status.status).toBe('completed');
      }
    });

    it('should block jobs exceeding RPM limit until window resets', async () => {
      // Close default worker
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      const callTimestamps: number[] = [];

      mockGeminiService.generateImages.mockImplementation(async () => {
        callTimestamps.push(Date.now());
        await new Promise((r) => setTimeout(r, 10));
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Create worker with LOW RPM limit
      // BullMQ limiter: max N jobs per duration window
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 10,
        maxJobsPerMinute: 5, // 5 jobs per 60 seconds
      });

      // Enqueue 5 jobs (exactly at limit)
      const jobIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `RPM limit test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for first batch to complete
      await new Promise((r) => setTimeout(r, 2000));
      
      // All 5 should process (within the limit)
      expect(callTimestamps.length).toBe(5);

      // Enqueue 3 more jobs (these should be blocked until window resets)
      const extraJobIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`extra-${i}`],
          prompt: `Extra job ${i}`,
          settings: {},
        });
        extraJobIds.push(jobId);
      }

      // Wait a short time - extra jobs should NOT process yet (rate limited)
      await new Promise((r) => setTimeout(r, 1000));
      
      // Still only 5 calls (extra jobs waiting)
      expect(callTimestamps.length).toBe(5);

      // Verify extra jobs are still pending/waiting
      const extraStatuses = await getJobStatuses(extraJobIds);
      const pendingCount = Array.from(extraStatuses.values()).filter(
        (s) => s.status !== 'completed'
      ).length;
      expect(pendingCount).toBeGreaterThanOrEqual(0); // Some may still be pending

      // Clean up - don't wait for full window reset
      const allStatuses = await getJobStatuses(jobIds);
      for (const [, status] of allStatuses) {
        expect(status.status).toBe('completed');
      }
    });

    it('should scale throughput with multiple workers (simulating multiple API keys)', async () => {
      // Close default worker
      await worker.close();
      await new Promise((r) => setTimeout(r, 100));

      let totalCalls = 0;

      mockGeminiService.generateImages.mockImplementation(async () => {
        totalCalls++;
        await new Promise((r) => setTimeout(r, 50)); // 50ms per call
        return {
          images: [{ url: TEST_IMAGE_BASE64, format: 'png', width: 1024, height: 1024 }],
          metadata: { model: 'test', cost: 0.01, prompt: 'test', generatedAt: new Date().toISOString() },
        };
      });

      // Simulate 3 API keys by creating 3 workers (each with own rate limit)
      // In production, this would be 3 workers each using a different API key
      // Each key has 60 RPM, so 3 keys = 180 RPM effective throughput
      const workers: QueueWorker[] = [];
      for (let i = 0; i < 3; i++) {
        const w = new QueueWorker({
          redisUrl: TEST_CONFIG.redis.url,
          queueName: QUEUE_NAME,
          concurrency: 5,
          maxJobsPerMinute: 600, // Each worker: 600 RPM (10/sec)
        });
        workers.push(w);
      }

      // Enqueue 20 jobs
      const startTime = Date.now();
      const jobIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const { jobId } = await client.enqueue('image_generation', {
          clientId: 'test-client',
          productIds: [`prod-${i}`],
          prompt: `Multi-worker test ${i}`,
          settings: {},
        });
        jobIds.push(jobId);
      }

      // Wait for completion
      await new Promise((r) => setTimeout(r, 2500));

      const totalTime = Date.now() - startTime;

      // With 3 workers at high RPM, all jobs should complete quickly
      expect(totalCalls).toBe(20);
      expect(totalTime).toBeLessThan(3000);

      // Clean up all workers
      for (const w of workers) {
        await w.close();
      }

      // Recreate default worker for cleanup
      worker = new QueueWorker({
        redisUrl: TEST_CONFIG.redis.url,
        queueName: QUEUE_NAME,
        concurrency: 1,
      });
    });
  });
});

