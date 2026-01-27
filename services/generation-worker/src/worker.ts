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
 * - Redis for distributed rate limiting across multiple workers
 */

import { Pool } from '@neondatabase/serverless';
import { getGeminiService } from 'visualizer-ai';
import { db, getDb, configureWebSocket } from 'visualizer-db';
import { GenerationJobRepository, type GenerationJob } from 'visualizer-db/repositories/generation-jobs';
import {
  type ImageEditPayload,
  type ImageGenerationPayload,
  type VideoGenerationPayload,
  type SyncProductPayload,
  type JobResult,
  generatedAsset,
  generatedAssetProduct,
  productImage,
} from 'visualizer-db/schema';
import { providers } from '@scenergy/erp-service';
import { storage, storagePaths } from 'visualizer-storage';
import { logger, logJobClaimed, logJobProgress, logJobSuccess, logJobFailed, logWorkerStarted, logWorkerStopped } from './logger';
import { DistributedRateLimiter } from './rate-limiter';

// ============================================================================
// CONFIG
// ============================================================================

export interface WorkerConfig {
  concurrency: number;
  maxJobsPerMinute: number;
  fallbackPollIntervalMs: number;
  workerId: string;
  enableListenNotify: boolean; // Set to false for Neon free tier
  redisUrl?: string; // Redis URL for distributed rate limiting
}

const DEFAULT_CONFIG: WorkerConfig = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  maxJobsPerMinute: parseInt(process.env.MAX_JOBS_PER_MINUTE ?? '60', 10),
  fallbackPollIntervalMs: parseInt(process.env.FALLBACK_POLL_MS ?? '5000', 10), // 5s fallback (Neon free tier friendly)
  workerId: process.env.WORKER_ID ?? `worker_${process.pid}`,
  enableListenNotify: process.env.ENABLE_LISTEN_NOTIFY !== 'false', // Disable for Neon free tier
  redisUrl: process.env.REDIS_URL, // Redis for distributed rate limiting
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
  private db = getDb();
  private jobs: GenerationJobRepository;
  private gemini = getGeminiService();
  private rateLimiter: DistributedRateLimiter;

  // LISTEN/NOTIFY state
  private listenerPool: Pool | null = null;
  private jobSignal: (() => void) | null = null;
  private waitForJob: Promise<void> | null = null;

  constructor(config: Partial<WorkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.jobs = new GenerationJobRepository(this.db);
    this.rateLimiter = new DistributedRateLimiter({
      redisUrl: this.config.redisUrl ?? '',
      fallbackRpm: this.config.maxJobsPerMinute,
    });
  }

  async start(): Promise<void> {
    this.isRunning = true;

    // Configure WebSocket before any database operations
    await configureWebSocket();

    // Connect to Redis for distributed rate limiting
    const redisConnected = await this.rateLimiter.connect();
    const rateLimitMode = redisConnected ? 'Redis (distributed)' : 'In-memory (single worker)';

    const mode = this.config.enableListenNotify
      ? `LISTEN/NOTIFY with ${this.config.fallbackPollIntervalMs}ms fallback`
      : `Polling every ${this.config.fallbackPollIntervalMs}ms`;

    logWorkerStarted(this.config.workerId, {
      concurrency: this.config.concurrency,
      maxJobsPerMinute: this.config.maxJobsPerMinute,
      mode,
      rateLimitMode,
    });

    // Start the LISTEN connection (if enabled) - run in background, don't await
    if (this.config.enableListenNotify) {
      this.startListener().catch((err) => {
        logger.error({ err }, 'Listener failed');
      });
    }

    // Start worker loops in background - don't await (they run forever)
    for (let i = 0; i < this.config.concurrency; i++) {
      this.workerLoop(i).catch((err) => {
        logger.error({ err, workerId: i }, 'Worker loop failed');
      });
    }

    // Return immediately so healthcheck can report healthy
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

      // Disconnect from Redis
      await this.rateLimiter.disconnect();

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
      // WebSocket is already configured in start() method
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
      // Check distributed rate limit before attempting to claim
      if (!(await this.canProcessJob())) {
        await this.sleep(100);
        continue;
      }

      const job = await this.claimJob();

      if (!job) {
        // No job available - wait for notification or fallback timeout
        await this.waitForNotificationOrTimeout();
        continue;
      }

      // Consume rate limit token after successful claim
      await this.rateLimiter.consume();
      this.activeJobs++;

      try {
        await this.processJob(job);
      } catch (err) {
        logger.error({ workerId, jobId: job.id, err }, 'Worker job processing failed');
      } finally {
        this.activeJobs--;
      }
    }
  }

  private async canProcessJob(): Promise<boolean> {
    const { allowed, remaining, limit } = await this.rateLimiter.canProcess();
    if (!allowed) {
      logger.debug({ remaining, limit }, 'Rate limit reached, waiting...');
    }
    return allowed;
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
        case 'sync_product':
          result = await this.processSyncProduct(job);
          break;
        case 'sync_all_products':
          // Not implemented yet - would iterate over all products
          throw new Error('sync_all_products not implemented');
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
    logger.debug(
      {
        jobId: job.id,
        clientId: job.clientId,
        productCount: payload.productIds?.length ?? 0,
        variants,
      },
      'Processing image generation'
    );

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

    // Check if collection is complete and update status
    if (job.flowId) {
      await this.checkAndUpdateCollectionStatus(job.flowId);
    }

    return {
      imageUrls: savedImages.map((s) => s.url),
      imageIds: savedImages.map((s) => s.id),
    };
  }

  private async processImageEdit(job: GenerationJob): Promise<JobResult> {
    const payload = job.payload as ImageEditPayload;

    const isR2Url = !payload.sourceImageUrl.startsWith('data:');

    logger.info(
      {
        jobId: job.id,
        promptLength: payload.editPrompt?.length,
        sourceUrlLength: payload.sourceImageUrl?.length,
        isR2Url,
        aspectRatio: payload.aspectRatio,
        quality: payload.settings?.imageQuality ?? '2k',
        previewOnly: payload.previewOnly ?? true,
        hasTempStoragePrefix: !!payload.tempStoragePrefix,
      },
      'Processing image edit'
    );

    // Update progress
    await this.jobs.updateProgress(job.id, 10);

    // If source is R2 URL, fetch and convert to data URL for processing
    let sourceDataUrl: string;
    if (isR2Url) {
      logger.debug({ jobId: job.id, url: payload.sourceImageUrl }, 'Fetching source image from R2');
      sourceDataUrl = await this.fetchImageAsDataUrl(payload.sourceImageUrl);
    } else {
      sourceDataUrl = payload.sourceImageUrl;
    }

    // Get the source image dimensions to calculate aspect ratio
    const sourceDimensions = await this.getImageDimensions(sourceDataUrl);
    const aspectRatio = payload.aspectRatio || this.calculateAspectRatio(sourceDimensions.width, sourceDimensions.height);

    logger.debug(
      {
        jobId: job.id,
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        aspectRatio,
      },
      'Source image dimensions'
    );

    await this.jobs.updateProgress(job.id, 30);

    // Call Gemini to edit the image
    const result = await this.gemini.editImage({
      baseImageDataUrl: sourceDataUrl,
      prompt: payload.editPrompt,
      referenceImages: payload.referenceImages,
    });

    if (!result.editedImageDataUrl) {
      throw new Error('Edit returned no image');
    }

    await this.jobs.updateProgress(job.id, 70);

    // Resize to 2K quality while preserving aspect ratio
    const resizedImage = await this.resizeTo2K(result.editedImageDataUrl, aspectRatio);

    await this.jobs.updateProgress(job.id, 90);

    // Preview mode (default) - upload to temp storage if prefix provided
    if (payload.previewOnly !== false) {
      // If temp storage prefix is provided, upload to R2 and return URL
      if (payload.tempStoragePrefix) {
        const revisionId = `rev_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
        const tempKey = `${payload.tempStoragePrefix}${revisionId}.webp`;

        const { buffer } = this.base64ToBuffer(resizedImage);
        await storage.upload(tempKey, buffer, 'image/webp');
        const editedImageUrl = storage.getPublicUrl(tempKey);

        logger.info({ jobId: job.id, tempKey, editedImageUrl }, 'Preview mode - uploaded to R2 temp storage');
        return {
          editedImageUrl,
        };
      }

      // Fallback: return data URL (for backwards compatibility)
      logger.info({ jobId: job.id }, 'Preview mode - returning data URL (no temp storage prefix)');
      return {
        editedImageDataUrl: resizedImage,
      };
    }

    // Non-preview mode - save to R2 (used when applying edit)
    const saved = await this.saveImage(job, resizedImage, payload);

    return {
      imageUrls: [saved.url],
      imageIds: [saved.id],
    };
  }

  /**
   * Get dimensions from a base64 image
   */
  private async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    try {
      // Dynamically import sharp
      const { default: sharp } = await import('sharp');

      const { buffer } = this.base64ToBuffer(dataUrl);
      const metadata = await sharp(buffer).metadata();

      return {
        width: metadata.width ?? 1024,
        height: metadata.height ?? 1024,
      };
    } catch (err) {
      logger.warn({ err }, 'Failed to get image dimensions, using defaults');
      return { width: 1024, height: 1024 };
    }
  }

  /**
   * Calculate aspect ratio string from dimensions
   */
  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    const ratioW = width / divisor;
    const ratioH = height / divisor;

    // Common aspect ratios
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.05) return '1:1';
    if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';
    if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4';
    if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
    if (Math.abs(ratio - 2 / 3) < 0.05) return '2:3';

    return `${ratioW}:${ratioH}`;
  }

  /**
   * Resize image to 2K quality while preserving aspect ratio
   * 2K = 2048px on the longest side
   */
  private async resizeTo2K(dataUrl: string, aspectRatio: string): Promise<string> {
    try {
      const { default: sharp } = await import('sharp');

      const { buffer, mimeType } = this.base64ToBuffer(dataUrl);
      const metadata = await sharp(buffer).metadata();

      const currentWidth = metadata.width ?? 1024;
      const currentHeight = metadata.height ?? 1024;

      // Calculate 2K dimensions (2048px on longest side)
      const targetLongSide = 2048;
      let newWidth: number;
      let newHeight: number;

      if (currentWidth >= currentHeight) {
        // Landscape or square
        newWidth = targetLongSide;
        newHeight = Math.round((currentHeight / currentWidth) * targetLongSide);
      } else {
        // Portrait
        newHeight = targetLongSide;
        newWidth = Math.round((currentWidth / currentHeight) * targetLongSide);
      }

      logger.debug(
        {
          originalWidth: currentWidth,
          originalHeight: currentHeight,
          newWidth,
          newHeight,
          aspectRatio,
        },
        'Resizing to 2K'
      );

      // Resize the image
      const resizedBuffer = await sharp(buffer)
        .resize(newWidth, newHeight, {
          fit: 'fill',
          withoutEnlargement: false, // Allow upscaling if needed
        })
        .png({ quality: 90 })
        .toBuffer();

      // Convert back to base64 data URL
      const base64 = resizedBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (err) {
      logger.warn({ err }, 'Failed to resize image to 2K, using original');
      return dataUrl;
    }
  }

  private async processVideoGeneration(job: GenerationJob): Promise<JobResult | null> {
    const payload = job.payload as VideoGenerationPayload;

    if (!payload.prompt || !payload.sourceImageUrl) {
      throw new Error('Video generation requires prompt and source image.');
    }

    if (!payload.operationName) {
      logger.info(
        {
          jobId: job.id,
          settings: payload.settings,
          aspectRatio: payload.settings?.aspectRatio,
          resolution: payload.settings?.resolution,
          model: payload.settings?.model,
        },
        'Starting video generation with settings'
      );

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

  /**
   * Process sync_product job - sync images from store to local DB
   */
  private async processSyncProduct(job: GenerationJob): Promise<JobResult> {
    // Type guard to ensure this is a sync_product job
    if (job.type !== 'sync_product') {
      throw new Error(`Invalid job type for processSyncProduct: ${job.type}`);
    }
    const payload = job.payload as SyncProductPayload;

    // TODO: Implement credential decryption
    // This feature requires implementing a decryptCredentials function
    throw new Error(
      'Product sync not yet implemented. ' +
      'Need to implement credential decryption for store connections.'
    );

    /* Implementation skeleton (commented out until credential decryption is available):

    logger.info(
      {
        jobId: job.id,
        connectionId: payload.connectionId,
        externalProductId: payload.externalProductId,
      },
      'Processing product sync'
    );

    await this.jobs.updateProgress(job.id, 10);

    // 1. Get the store connection
    const connection = await db.storeConnections.getById(payload.connectionId);
    if (!connection) {
      throw new Error(`Store connection not found: ${payload.connectionId}`);
    }

    // 2. Get credentials and provider
    const encryptedCreds = db.storeConnections.getEncryptedCredentials(connection);
    // const { credentials, provider: providerType } = decryptCredentials(encryptedCreds);
    // const provider = providers.require(providerType);

    await this.jobs.updateProgress(job.id, 20);

    // 3. Get current images from store
    // const storeImages = await provider.getProductImages(credentials, payload.externalProductId);

    logger.debug(
      {
        jobId: job.id,
        storeImageCount: storeImages.length,
        storeImageIds: storeImages.map((i) => i.id),
      },
      'Fetched images from store'
    );

    await this.jobs.updateProgress(job.id, 40);

    // 4. Find our product by external ID (storeId)
    const product = await db.products.findByStoreConnection(payload.connectionId, payload.externalProductId);

    if (!product) {
      logger.warn(
        {
          jobId: job.id,
          connectionId: payload.connectionId,
          externalProductId: payload.externalProductId,
        },
        'Product not found in database, skipping sync'
      );
      return { imageUrls: [], imageIds: [] };
    }

    // 5. Get existing product images
    const existingImages = await db.productImages.list(product.id);
    const existingExternalIds = new Set(
      existingImages.map((i: { externalImageId: string | null }) => i.externalImageId).filter(Boolean) as string[]
    );

    logger.debug(
      {
        jobId: job.id,
        productId: product.id,
        existingImageCount: existingImages.length,
        existingExternalIds: Array.from(existingExternalIds),
      },
      'Existing images in database'
    );

    await this.jobs.updateProgress(job.id, 50);

    // 6. Find new images (in store but not in our DB)
    const newImages = storeImages.filter((img) => !existingExternalIds.has(img.id));

    if (newImages.length === 0) {
      logger.info({ jobId: job.id, productId: product.id }, 'No new images to sync');
      return { imageUrls: [], imageIds: [] };
    }

    logger.info(
      {
        jobId: job.id,
        productId: product.id,
        newImageCount: newImages.length,
        newImageIds: newImages.map((i) => i.id),
      },
      'Found new images to sync'
    );

    // 7. Download and save new images
    const syncedImages: Array<{ id: string; url: string }> = [];
    const progressPerImage = 40 / newImages.length;

    for (let i = 0; i < newImages.length; i++) {
      const storeImage = newImages[i];

      try {
        // Download image from store
        const imageBuffer = await provider.downloadImage(storeImage.url);

        // Generate storage path
        const imageId = `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const storagePath = storagePaths.productImageBase(product.clientId, product.id, imageId);

        // Upload to R2
        await storage.upload(storagePath, imageBuffer, 'image/webp');
        const imageUrl = storage.getPublicUrl(storagePath);

        // Create product_image record
        await this.db.insert(productImage).values({
          id: imageId,
          productId: product.id,
          r2KeyBase: storagePath,
          sortOrder: existingImages.length + i,
          isPrimary: existingImages.length === 0 && i === 0 && storeImage.isPrimary,
          syncStatus: 'synced',
          originalStoreUrl: storeImage.url,
          externalImageId: storeImage.id,
        });

        syncedImages.push({ id: imageId, url: imageUrl });

        logger.debug(
          {
            jobId: job.id,
            imageId,
            externalImageId: storeImage.id,
          },
          'Synced image from store'
        );
      } catch (error) {
        logger.error(
          {
            jobId: job.id,
            externalImageId: storeImage.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to sync image'
        );
        // Continue with other images
      }

      await this.jobs.updateProgress(job.id, 50 + Math.round((i + 1) * progressPerImage));
    }

    logger.info(
      {
        jobId: job.id,
        productId: product.id,
        syncedCount: syncedImages.length,
      },
      'Product sync complete'
    );

    return {
      imageUrls: syncedImages.map((i) => i.url),
      imageIds: syncedImages.map((i) => i.id),
    };
    */
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
    // Handle both productIds array and single productId (from image edit)
    const editPayload = payload as ImageEditPayload;
    const productIds = payload.productIds ?? (editPayload.productId ? [editPayload.productId] : []);

    // For database FK: only use job.flowId (null for standalone edits)
    // For storage path: use flowId or sessionId for organization
    const dbFlowId = job.flowId; // This is the actual generation_flow ID or null
    const storageFlowId = (job.flowId ?? sessionId) || 'adhoc';
    const storagePath = storagePaths.generationAsset(clientId, storageFlowId, assetId, ext);

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
      // Try to update existing placeholder asset for this job
      const existingAssetId = await db.generatedAssets.completePendingByJobId(job.id, {
        assetUrl,
        prompt,
        settings,
      });

      if (existingAssetId) {
        // Placeholder was updated - use existing asset ID for product links
        return { id: existingAssetId, url: assetUrl };
      }

      // No placeholder - create new asset
      await this.db.insert(generatedAsset).values({
        id: assetId,
        clientId,
        generationFlowId: dbFlowId || null, // Use null if no valid flow ID (standalone edits)
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

    // For database FK: only use job.flowId (null for standalone operations)
    // For storage path: use flowId or sessionId for organization
    const dbFlowId = job.flowId;
    const storageFlowId = (job.flowId ?? sessionId) || 'adhoc';
    const storagePath = storagePaths.generationAsset(clientId, storageFlowId, assetId, ext);

    await storage.upload(storagePath, buffer, mimeType);
    const assetUrl = storage.getPublicUrl(storagePath);

    // Video assets don't use FlowGenerationSettings (which is for image generation)
    // Video metadata is stored in the prompt field
    try {
      await this.db.insert(generatedAsset).values({
        id: assetId,
        clientId,
        generationFlowId: dbFlowId || null, // Use null if no valid flow ID (standalone operations)
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

  /**
   * Check if all assets in a collection are completed and update collection status
   */
  private async checkAndUpdateCollectionStatus(flowId: string): Promise<void> {
    try {
      // Get the flow to find the collection ID
      const flow = await db.generationFlows.getById(flowId);
      if (!flow?.collectionSessionId) {
        return; // Not part of a collection
      }

      const collectionId = flow.collectionSessionId;

      // Get all flows in this collection
      const flows = await db.generationFlows.listByCollectionSession(collectionId);
      const flowIds = flows.map((f) => f.id);

      if (flowIds.length === 0) {
        return;
      }

      // Count assets by status for all flows in the collection using facade method
      const stats = await db.generatedAssets.getStatusCountsByFlowIds(flowIds);

      if (stats.total === 0) {
        logger.debug({ collectionId, flowIds }, 'No assets found for collection');
        return;
      }

      logger.debug(
        {
          collectionId,
          total: stats.total,
          completed: stats.completed,
          generating: stats.generating,
        },
        'Collection asset stats'
      );

      // If all assets are completed, update collection status
      if (stats.total > 0 && stats.completed === stats.total && stats.generating === 0) {
        await db.collectionSessions.update(collectionId, { status: 'completed' });
        logger.info(
          { collectionId, totalAssets: stats.total },
          'Collection generation completed - updated status'
        );
      }
    } catch (error) {
      // Don't fail the job if status update fails
      logger.warn({ err: error, flowId }, 'Failed to check/update collection status');
    }
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

  private bufferToDataUrl(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  /**
   * Fetch image from URL and convert to data URL
   * Used for R2 URLs that need to be converted for Gemini
   */
  private async fetchImageAsDataUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    return this.bufferToDataUrl(buffer, contentType);
  }

  private async handleJobError(job: GenerationJob, errorMsg: string, error?: unknown): Promise<void> {
    const canRetry = job.attempts < job.maxAttempts;

    logJobFailed(job.id, error instanceof Error ? error : errorMsg, job.attempts, job.maxAttempts, canRetry);

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
