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
  type JobResult,
  generatedAsset,
  generatedAssetProduct,
} from 'visualizer-db/schema';
import { storage, storagePaths } from 'visualizer-storage';

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

// ============================================================================
// WORKER
// ============================================================================

export class GenerationWorker {
  private config: WorkerConfig;
  private isRunning = false;
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
    console.log(`🚀 Worker started: ${this.config.workerId}`);
    console.log(`   Concurrency: ${this.config.concurrency}`);
    console.log(`   Rate limit: ${this.config.maxJobsPerMinute} jobs/min`);

    const mode = this.config.enableListenNotify
      ? `LISTEN/NOTIFY with ${this.config.fallbackPollIntervalMs}ms fallback`
      : `Polling every ${this.config.fallbackPollIntervalMs}ms`;
    console.log(`   Mode: ${mode}`);

    // Start the LISTEN connection (if enabled)
    const listenerPromise = this.config.enableListenNotify ? this.startListener() : Promise.resolve();

    // Start worker loops
    const workers = Array(this.config.concurrency)
      .fill(0)
      .map((_, i) => this.workerLoop(i));

    await Promise.all([listenerPromise, ...workers]);
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping worker...');
    this.isRunning = false;

    // Signal any waiting workers
    if (this.jobSignal) {
      this.jobSignal();
    }

    while (this.activeJobs > 0) {
      console.log(`   Waiting for ${this.activeJobs} active jobs...`);
      await this.sleep(1000);
    }

    // Close listener connection
    if (this.listenerPool) {
      await this.listenerPool.end();
      this.listenerPool = null;
    }

    console.log('✅ Worker stopped');
  }

  /**
   * Start the LISTEN connection for instant job notifications
   */
  private async startListener(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️ DATABASE_URL not set, falling back to polling only');
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
      console.log('👂 LISTEN connection established');

      // Subscribe to job notifications
      await client.query('LISTEN new_generation_job');
      console.log('📡 Subscribed to new_generation_job channel');

      // Handle notifications
      client.on('notification', (msg) => {
        if (msg.channel === 'new_generation_job') {
          console.log(`📬 Notification: new job ${msg.payload}`);
          // Signal waiting workers
          if (this.jobSignal) {
            this.jobSignal();
            this.resetSignal();
          }
        }
      });

      // Handle connection errors
      client.on('error', (err) => {
        console.error('❌ Listener connection error:', err.message);
        // Will be reconnected by the listener loop
      });

      // Keep connection alive
      while (this.isRunning) {
        await this.sleep(60_000); // Heartbeat every minute
      }

      client.release();
    } catch (err) {
      console.error('❌ Failed to start LISTEN:', err);
      console.log('⚠️ Falling back to polling only');
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
        console.error(`❌ Worker ${workerId} job ${job.id} failed:`, err);
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
      console.error('❌ Failed to claim job:', err);
      return null;
    }
  }

  private async processJob(job: GenerationJob): Promise<void> {
    const startTime = Date.now();
    console.log(`🎨 Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      let result: JobResult;

      switch (job.type) {
        case 'image_generation':
          result = await this.processImageGeneration(job);
          break;
        case 'image_edit':
          result = await this.processImageEdit(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark completed using repository
      await this.jobs.complete(job.id, {
        ...result,
        duration: Date.now() - startTime,
      });

      console.log(`✅ Job ${job.id} completed in ${Date.now() - startTime}ms`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.handleJobError(job, errorMsg);
    }
  }

  private async processImageGeneration(job: GenerationJob): Promise<JobResult> {
    const payload = job.payload as ImageGenerationPayload;
    const savedImages: Array<{ url: string; id: string }> = [];
    const variants = payload.settings?.numberOfVariants ?? 1;

    console.log(`📋 Job payload:`, {
      jobId: job.id,
      clientId: job.clientId,
      productIds: payload.productIds,
      sessionId: payload.sessionId,
      variants,
      aspectRatio: payload.settings?.aspectRatio,
      productImageUrls: payload.productImageUrls?.length ?? 0,
      inspirationImageUrls: payload.inspirationImageUrls?.length ?? 0,
      prompt: `${payload.prompt.substring(0, 100)}...`,
    });

    for (let i = 0; i < variants; i++) {
      console.log(`🎨 Generating variant ${i + 1}/${variants}...`);

      // Update progress using repository
      const progress = Math.round(((i + 1) / variants) * 90);
      await this.jobs.updateProgress(job.id, progress);

      // Generate image - pass product and inspiration images for reference
      const result = await this.gemini.generateImages({
        prompt: payload.prompt,
        aspectRatio: payload.settings?.aspectRatio,
        imageQuality: payload.settings?.imageQuality as '1k' | '2k' | '4k' | undefined,
        count: 1,
        productImageUrls: payload.productImageUrls,
        inspirationImageUrls: payload.inspirationImageUrls,
      });

      const images = result.images;
      console.log(`✨ Gemini result:`, {
        imagesCount: images.length,
        hasUrl: !!images[0]?.url,
        urlLength: images[0]?.url?.length ?? 0,
      });

      if (result.images[0]?.url) {
        console.log(`💾 Saving image to storage and database...`);
        const saved = await this.saveImage(job, result.images[0].url, payload);
        savedImages.push(saved);
        console.log(`✅ Image saved: ${saved.id} -> ${saved.url}`);
      } else {
        console.warn(`⚠️ No image URL in Gemini result for variant ${i + 1}`);
      }
    }

    if (savedImages.length === 0) {
      throw new Error('No images generated');
    }

    console.log(`🎉 Generation complete: ${savedImages.length} images saved`);
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

  private async saveImage(
    job: GenerationJob,
    base64Data: string,
    payload: ImageGenerationPayload | ImageEditPayload
  ): Promise<{ id: string; url: string }> {
    // Validate clientId - use fallback if missing
    const clientId = job.clientId ?? 'test-client';
    if (!job.clientId) {
      console.warn(`⚠️ Job ${job.id} missing clientId, using fallback: ${clientId}`);
    }

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

    console.log(`📤 Uploading to storage: ${storagePath}`);

    // Upload to R2 storage
    await storage.upload(storagePath, buffer, mimeType);
    const assetUrl = storage.getPublicUrl(storagePath);
    console.log(`✅ Uploaded: ${assetUrl}`);

    // Create generatedAsset record in database
    const prompt = 'prompt' in payload ? payload.prompt : 'editPrompt' in payload ? payload.editPrompt : '';

    console.log(`📝 Creating database record:`, {
      assetId,
      clientId,
      flowId,
      productIds,
      jobId: job.id,
    });

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
      console.log(`✅ Database record created: ${assetId}`);
    } catch (dbError) {
      console.error(`❌ Failed to create database record:`, dbError);
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
        console.log(`✅ Product links created: ${productIds.join(', ')}`);
      } catch (linkError) {
        console.error(`❌ Failed to create product links:`, linkError);
        // Don't fail the whole job if product links fail
      }
    }

    console.log(`💾 Saved generated asset ${assetId} -> ${assetUrl}`);
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

  private async handleJobError(job: GenerationJob, errorMsg: string): Promise<void> {
    console.error(`❌ Job ${job.id} error:`, errorMsg);

    const canRetry = job.attempts < job.maxAttempts;

    if (canRetry) {
      // Use repository for retry scheduling
      await this.jobs.scheduleRetry(job.id, errorMsg, job.attempts);
      const delaySeconds = Math.pow(job.attempts, 2) * 10;
      console.log(`⏳ Job ${job.id} failed, scheduling retry in ${delaySeconds}s (attempt ${job.attempts}/${job.maxAttempts})`);
    } else {
      // Use repository for failure
      await this.jobs.fail(job.id, errorMsg);
      console.log(`❌ Job ${job.id} failed permanently after ${job.attempts} attempts: ${errorMsg}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
