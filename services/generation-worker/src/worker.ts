/**
 * Generation Worker
 *
 * Uses PostgreSQL LISTEN/NOTIFY for instant job pickup with zero idle queries.
 * Falls back to polling if notifications are missed.
 *
 * Architecture:
 * - One listener connection subscribes to 'new_generation_job' channel
 * - Worker loops wait on a shared signal (resolved by listener)
 * - Fallback polling every 30s ensures no jobs are missed
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { getGeminiService } from 'visualizer-ai';
import { getDb } from 'visualizer-db';
import { GenerationJobRepository, type GenerationJob } from 'visualizer-db/repositories/generation-jobs';
import {
  type ImageEditPayload,
  type ImageGenerationPayload,
  type VideoGenerationPayload,
  type JobResult,
  generatedAsset,
  generatedAssetProduct,
} from 'visualizer-db/schema';
import { storage, storagePaths } from 'visualizer-storage';
import {
  logger,
  logJobClaimed,
  logJobProgress,
  logJobSuccess,
  logJobFailed,
  logWorkerStarted,
  logWorkerStopped,
} from './logger';

// ============================================================================
// CONFIG
// ============================================================================

export interface WorkerConfig {
  concurrency: number;
  maxJobsPerMinute: number;
  fallbackPollIntervalMs: number;
  workerId: string;
  enableListenNotify: boolean; // Set to false for Neon free tier
}

const DEFAULT_CONFIG: WorkerConfig = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  maxJobsPerMinute: parseInt(process.env.MAX_JOBS_PER_MINUTE ?? '60', 10),
  fallbackPollIntervalMs: parseInt(process.env.FALLBACK_POLL_MS ?? '5000', 10), // 5s fallback (Neon free tier friendly)
  workerId: process.env.WORKER_ID ?? `worker_${process.pid}`,
  enableListenNotify: process.env.ENABLE_LISTEN_NOTIFY !== 'false', // Disable for Neon free tier
};

const VIDEO_POLL_INTERVAL_MS = 10000;

// ============================================================================
// WORKER
// ============================================================================

export class GenerationWorker {
  private config: WorkerConfig;
  private isRunning = false;
  private stopPromise: Promise<void> | null = null;
  private activeJobs = 0;
  private jobsThisMinute = 0;
  private minuteStart = Date.now();
  private db = getDb();
  private jobs: GenerationJobRepository;
  private gemini = getGeminiService();

  // LISTEN/NOTIFY state
  private listenerPool: Pool | null = null;
  private jobSignal: (() => void) | null = null;
  private waitForJob: Promise<void> | null = null;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.jobs = new GenerationJobRepository(this.db);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    const mode = this.config.enableListenNotify
      ? `LISTEN/NOTIFY with ${this.config.fallbackPollIntervalMs}ms fallback`
      : `Polling every ${this.config.fallbackPollIntervalMs}ms`;

    logWorkerStarted(this.config.workerId, {
      concurrency: this.config.concurrency,
      maxJobsPerMinute: this.config.maxJobsPerMinute,
      mode,
    });

    // Start the LISTEN connection (if enabled)
    const listenerPromise = this.config.enableListenNotify ? this.startListener() : Promise.resolve();

    // Start worker loops
    const workers = Array(this.config.concurrency)
      .fill(0)
      .map((_, i) => this.workerLoop(i));

    await Promise.all([listenerPromise, ...workers]);
  }

  async stop(): Promise<void> {
    if (this.stopPromise) {
      return this.stopPromise;
    }

    this.stopPromise = (async () => {
      logger.info({ workerId: this.config.workerId }, 'Stopping worker...');
      this.isRunning = false;

      // Signal any waiting workers
      if (this.jobSignal) {
        this.jobSignal();
      }

      while (this.activeJobs > 0) {
        logger.info({ activeJobs: this.activeJobs }, 'Waiting for active jobs to complete...');
        await this.sleep(1000);
      }

      // Close listener connection
      if (this.listenerPool) {
        await this.listenerPool.end();
        this.listenerPool = null;
      }

      logWorkerStopped(this.config.workerId);
    })();

    return this.stopPromise;
  }

  /**
   * Start the LISTEN connection for instant job notifications
   */
  private async startListener(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.warn('DATABASE_URL not set, falling back to polling only');
      return;
    }

    try {
      // Configure WebSocket for Node.js (eslint-disable-next-line to handle optional chain)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const isNode = typeof process !== 'undefined' && process.versions?.node;
      if (isNode && !neonConfig.webSocketConstructor) {
        const ws = await import('ws');
        neonConfig.webSocketConstructor = ws.default as unknown as typeof WebSocket;
      }

      // Create dedicated pool for LISTEN (single connection)
      this.listenerPool = new Pool({ connectionString: databaseUrl, max: 1 });

      const client = await this.listenerPool.connect();
      logger.info('LISTEN connection established');

      // Subscribe to job notifications
      await client.query('LISTEN new_generation_job');
      logger.info('Subscribed to new_generation_job channel');

      // Handle notifications
      client.on('notification', (msg) => {
        if (msg.channel === 'new_generation_job') {
          logger.debug({ jobId: msg.payload }, 'Received job notification');
          // Signal waiting workers
          if (this.jobSignal) {
            this.jobSignal();
            this.resetSignal();
          }
        }
      });

      // Handle connection errors
      client.on('error', (err) => {
        logger.error({ err: err.message }, 'Listener connection error');
        // Will be reconnected by the listener loop
      });

      // Keep connection alive
      while (this.isRunning) {
        await this.sleep(60_000); // Heartbeat every minute
      }

      client.release();
    } catch (err) {
      logger.error({ err }, 'Failed to start LISTEN, falling back to polling only');
    }
  }

  /**
   * Reset the shared signal for workers to wait on
   */
  private resetSignal(): void {
    this.waitForJob = new Promise((resolve) => {
      this.jobSignal = resolve;
    });
  }

  /**
   * Wait for either a notification or fallback timeout
   */
  private async waitForNotificationOrTimeout(): Promise<void> {
    if (!this.waitForJob) {
      this.resetSignal();
    }

    // Race between notification and fallback timeout
    await Promise.race([this.waitForJob, this.sleep(this.config.fallbackPollIntervalMs)]);
  }

  private async workerLoop(workerId: number): Promise<void> {
    // Initialize signal
    if (!this.waitForJob) {
      this.resetSignal();
    }

    while (this.isRunning) {
      if (!this.canProcessJob()) {
        await this.sleep(100);
        continue;
      }

      const job = await this.claimJob();

      if (!job) {
        // No job available - wait for notification or fallback timeout
        await this.waitForNotificationOrTimeout();
        continue;
      }

      this.activeJobs++;
      this.jobsThisMinute++;

      try {
        await this.processJob(job);
      } catch (err) {
        logger.error({ workerId, jobId: job.id, err }, 'Worker job processing failed');
      } finally {
        this.activeJobs--;
      }
    }
  }

  private canProcessJob(): boolean {
    const now = Date.now();
    if (now - this.minuteStart >= 60_000) {
      this.jobsThisMinute = 0;
      this.minuteStart = now;
    }
    return this.jobsThisMinute < this.config.maxJobsPerMinute;
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private async claimJob(): Promise<GenerationJob | null> {
    try {
      return await this.jobs.claimJob(this.config.workerId);
    } catch (err) {
      logger.error({ err }, 'Failed to claim job');
      return null;
    }
  }

  private async processJob(job: GenerationJob): Promise<void> {
    const startTime = Date.now();
    logJobClaimed(job.id, job.type, job.attempts, job.maxAttempts);

    try {
      let result: JobResult | null;

      switch (job.type) {
        case 'image_generation':
          result = await this.processImageGeneration(job);
          break;
        case 'image_edit':
          result = await this.processImageEdit(job);
          break;
        case 'video_generation':
          result = await this.processVideoGeneration(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      if (!result) {
        logger.debug({ jobId: job.id, jobType: job.type }, 'Job re-queued, awaiting completion');
        return;
      }

      const durationMs = Date.now() - startTime;

      // Mark completed using repository
      await this.jobs.complete(job.id, {
        ...result,
        duration: durationMs,
      });

      logJobSuccess(job.id, durationMs, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleJobError(job, errorMsg, error);
    }
  }

  private async processImageGeneration(job: GenerationJob): Promise<JobResult> {
    const payload = job.payload as ImageGenerationPayload;
    const savedImages: Array<{ url: string; id: string }> = [];
    const variants = payload.settings?.numberOfVariants ?? 1;

    // Debug log only (won't be sent to Better Stack in production)
    logger.debug({
      jobId: job.id,
      clientId: job.clientId,
      productCount: payload.productIds?.length ?? 0,
      variants,
    }, 'Processing image generation');

    for (let i = 0; i < variants; i++) {
      // Update progress using repository
      const progress = Math.round(((i + 1) / variants) * 90);
      await this.jobs.updateProgress(job.id, progress);
      logJobProgress(job.id, progress, { variant: i + 1, totalVariants: variants });

      // Generate image - pass product and inspiration images for reference
      const result = await this.gemini.generateImages({
        prompt: payload.prompt,
        aspectRatio: payload.settings?.aspectRatio,
        imageQuality: payload.settings?.imageQuality as '1k' | '2k' | '4k' | undefined,
        count: 1,
        productImageUrls: payload.productImageUrls,
        inspirationImageUrls: payload.inspirationImageUrls,
      });

      if (result.images[0]?.url) {
        const saved = await this.saveImage(job, result.images[0].url, payload);
        savedImages.push(saved);
      } else {
        logger.warn({ jobId: job.id, variant: i + 1 }, 'No image URL in Gemini result');
      }
    }

    if (savedImages.length === 0) {
      throw new Error('No images generated');
    }

    return {
      imageUrls: savedImages.map((s) => s.url),
      imageIds: savedImages.map((s) => s.id),
    };
  }

  private async processImageEdit(job: GenerationJob): Promise<JobResult> {
    const payload = job.payload as ImageEditPayload;

    const result = await this.gemini.editImage({
      baseImageDataUrl: payload.sourceImageUrl,
      prompt: payload.editPrompt,
      referenceImages: payload.referenceImages,
    });

    if (!result.editedImageDataUrl) {
      throw new Error('Edit returned no image');
    }

    const saved = await this.saveImage(job, result.editedImageDataUrl, payload);

    return {
      imageUrls: [saved.url],
      imageIds: [saved.id],
    };
  }

  private async processVideoGeneration(job: GenerationJob): Promise<JobResult | null> {
    const payload = job.payload as VideoGenerationPayload;

    if (!payload.prompt || !payload.sourceImageUrl) {
      throw new Error('Video generation requires prompt and source image.');
    }

    if (!payload.operationName) {
      logger.info({
        jobId: job.id,
        settings: payload.settings,
        aspectRatio: payload.settings?.aspectRatio,
        resolution: payload.settings?.resolution,
        model: payload.settings?.model,
      }, 'Starting video generation with settings');

      const operationName = await this.gemini.startVideoGeneration({
        prompt: payload.prompt,
        sourceImageUrl: payload.sourceImageUrl,
        aspectRatio: payload.settings?.aspectRatio,
        resolution: payload.settings?.resolution,
        model: payload.settings?.model,
      });

      await this.jobs.updateStatus(job.id, {
        status: 'pending',
        progress: Math.max(job.progress, 10),
        payload: { ...payload, operationName },
        scheduledFor: new Date(Date.now() + VIDEO_POLL_INTERVAL_MS),
        lockedBy: null,
        lockedAt: null,
        error: null,
      });

      return null;
    }

    logger.debug({ jobId: job.id }, 'Polling video operation');

    const result = await this.gemini.pollVideoGeneration({
      operationName: payload.operationName,
      prompt: payload.prompt,
      model: payload.settings?.model,
      aspectRatio: payload.settings?.aspectRatio,
      resolution: payload.settings?.resolution,
    });

    if (!result) {
      const nextProgress = Math.min(95, Math.max(job.progress, 10) + 5);
      await this.jobs.updateStatus(job.id, {
        status: 'pending',
        progress: nextProgress,
        // Preserve the payload (including operationName) during polling
        payload: job.payload,
        scheduledFor: new Date(Date.now() + VIDEO_POLL_INTERVAL_MS),
        lockedBy: null,
        lockedAt: null,
      });
      return null;
    }

    const saved = await this.saveVideo(job, result.videoBuffer, result.mimeType, payload);

    return {
      videoUrls: [saved.url],
      videoIds: [saved.id],
    };
  }

  private async saveImage(
    job: GenerationJob,
    base64Data: string,
    payload: ImageGenerationPayload | ImageEditPayload
  ): Promise<{ id: string; url: string }> {
    const clientId = job.clientId;

    // Convert base64 to buffer
    const { buffer, mimeType } = this.base64ToBuffer(base64Data);
    const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('jpeg') ? 'jpg' : 'png';

    // Generate asset ID
    const assetId = `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    // Determine storage path - use flowId or sessionId as the generation flow identifier
    const sessionId = payload.sessionId;
    const productIds = payload.productIds ?? [];
    const flowId = job.flowId ?? sessionId;

    // Use storagePaths for consistent path generation
    const storagePath = storagePaths.generationAsset(clientId, flowId, assetId, ext);

    // Upload to R2 storage
    await storage.upload(storagePath, buffer, mimeType);
    const assetUrl = storage.getPublicUrl(storagePath);

    // Create generatedAsset record in database
    const prompt = 'prompt' in payload ? payload.prompt : 'editPrompt' in payload ? payload.editPrompt : '';

    // Build settings from payload for storage with the asset
    const generationPayload = payload as ImageGenerationPayload;
    const settings =
      'settings' in payload
        ? {
            aspectRatio: generationPayload.settings?.aspectRatio ?? '1:1',
            imageQuality: generationPayload.settings?.imageQuality as '1k' | '2k' | '4k' | undefined,
            promptTags: generationPayload.promptTags,
            customPrompt: generationPayload.customPrompt,
            promptText: prompt,
          }
        : undefined;

    try {
      await this.db.insert(generatedAsset).values({
        id: assetId,
        clientId,
        generationFlowId: flowId, // Use generationFlowId instead of legacy chatSessionId
        assetUrl,
        assetType: 'image',
        status: 'completed',
        prompt,
        settings: settings as import('visualizer-types').FlowGenerationSettings | undefined,
        productIds,
        jobId: job.id,
        completedAt: new Date(),
      });
    } catch (dbError) {
      logger.error({ err: dbError, assetId, jobId: job.id }, 'Failed to create database record');
      throw dbError;
    }

    // Link to products via junction table
    if (productIds.length > 0) {
      try {
        const productLinks = productIds.map((pid, idx) => ({
          id: `${assetId}_${pid}`,
          generatedAssetId: assetId,
          productId: pid,
          isPrimary: idx === 0,
        }));
        await this.db.insert(generatedAssetProduct).values(productLinks);
      } catch (linkError) {
        logger.warn({ err: linkError, assetId, productIds }, 'Failed to create product links');
        // Don't fail the whole job if product links fail
      }
    }

    return { id: assetId, url: assetUrl };
  }

  private async saveVideo(
    job: GenerationJob,
    buffer: Buffer,
    mimeType: string,
    payload: VideoGenerationPayload
  ): Promise<{ id: string; url: string }> {
    const clientId = job.clientId;

    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    const assetId = `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const sessionId = payload.sessionId;
    const productIds = payload.productIds ?? [];
    const flowId = job.flowId ?? sessionId;

    const storagePath = storagePaths.generationAsset(clientId, flowId, assetId, ext);

    await storage.upload(storagePath, buffer, mimeType);
    const assetUrl = storage.getPublicUrl(storagePath);

    // Video assets don't use FlowGenerationSettings (which is for image generation)
    // Video metadata is stored in the prompt field
    try {
      await this.db.insert(generatedAsset).values({
        id: assetId,
        clientId,
        generationFlowId: flowId,
        assetUrl,
        assetType: 'video',
        status: 'completed',
        prompt: payload.prompt,
        settings: undefined,
        productIds,
        jobId: job.id,
        completedAt: new Date(),
      });
    } catch (dbError) {
      logger.error({ err: dbError, assetId, jobId: job.id }, 'Failed to create video database record');
      throw dbError;
    }

    if (productIds.length > 0) {
      try {
        const productLinks = productIds.map((pid, idx) => ({
          id: `${assetId}_${pid}`,
          generatedAssetId: assetId,
          productId: pid,
          isPrimary: idx === 0,
        }));
        await this.db.insert(generatedAssetProduct).values(productLinks);
      } catch (productLinkError) {
        // Don't fail the whole job if product links fail (consistent with saveImage behavior)
        logger.warn({ err: productLinkError, assetId, productIds }, 'Failed to create video product links');
      }
    }

    return { id: assetId, url: assetUrl };
  }

  private base64ToBuffer(base64: string): { buffer: Buffer; mimeType: string } {
    if (base64.startsWith('data:')) {
      const matches = /^data:(.+);base64,(.+)$/.exec(base64);
      if (!matches) {
        throw new Error('Invalid base64 data URL');
      }
      return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
    }
    return { buffer: Buffer.from(base64, 'base64'), mimeType: 'image/png' };
  }

  private async handleJobError(job: GenerationJob, errorMsg: string, error?: unknown): Promise<void> {
    const canRetry = job.attempts < job.maxAttempts;

    logJobFailed(
      job.id,
      error instanceof Error ? error : errorMsg,
      job.attempts,
      job.maxAttempts,
      canRetry
    );

    if (canRetry) {
      const payload =
        job.type === 'video_generation' ? { ...(job.payload as VideoGenerationPayload), operationName: undefined } : undefined;

      // Use repository for retry scheduling
      await this.jobs.scheduleRetry(job.id, errorMsg, job.attempts, payload);
    } else {
      // Use repository for failure
      await this.jobs.fail(job.id, errorMsg);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
