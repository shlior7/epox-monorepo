/**
 * Image Generation Queue - Job system with polling support
 * Now with Redis persistence for job survival across restarts
 */

import { getGeminiService, GeminiService } from '../gemini';
import * as R2Media from '../r2/media-service';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../redis/client';
import { buildImageGenerationPrompt } from '../prompt-builder';

type JobStatus = 'pending' | 'generating' | 'completed' | 'error';

interface ImageGenerationRequest {
  clientId: string;
  productId: string;
  sessionId: string;
  prompt: string;
  settings: any;
  productImageId?: string;
  productImageIds?: Array<{ productId: string; imageId: string }>;
  inspirationImageId?: string; // S3 image ID (file in session media folder)
  inspirationImageUrl?: string; // Full URL (e.g., from scene library, Unsplash)
  isClientSession?: boolean;
  modelOverrides?: {
    imageModel?: string;
    fallbackImageModel?: string;
  };
}

interface ImageGenerationJob {
  id: string;
  request: ImageGenerationRequest;
  status: JobStatus;
  imageIds: string[];
  error: string | null;
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

const generateJobId = () => `img_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

// Redis key prefix for job storage
const REDIS_JOB_PREFIX = 'job:';
const REDIS_JOB_TTL = 600; // 10 minutes TTL for completed jobs

export class ImageGenerationQueue {
  private readonly gemini: GeminiService;
  private readonly JOB_RETENTION_MS = 10 * 60 * 1000; // Keep completed jobs for 10 minutes

  constructor() {
    this.gemini = getGeminiService();

    // Periodically clean up old completed jobs
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get Redis key for a job
   */
  private getJobKey(jobId: string): string {
    return `${REDIS_JOB_PREFIX}${jobId}`;
  }

  /**
   * Convert Redis payload into ImageGenerationJob
   */
  private deserializeJob(payload: unknown): ImageGenerationJob {
    if (typeof payload === 'string') {
      return JSON.parse(payload) as ImageGenerationJob;
    }

    if (payload && typeof payload === 'object') {
      return payload as ImageGenerationJob;
    }

    throw new Error('Invalid job payload');
  }

  /**
   * Clean up old completed/error jobs to prevent memory buildup
   * Now handled by Redis TTL, but we keep this for extra cleanup
   */
  private async cleanupOldJobs() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Get all job keys
      const jobKeys = await redis.keys(`${REDIS_JOB_PREFIX}*`);

      for (const key of jobKeys) {
        const jobData = await redis.get<string>(key);
        if (jobData) {
          const job = this.deserializeJob(jobData);
          if (job.status === 'completed' || job.status === 'error') {
            const jobTime = new Date(job.completedAt || job.updatedAt).getTime();
            if (now - jobTime > this.JOB_RETENTION_MS) {
              await redis.del(key);
              cleanedCount++;
            }
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old job(s) from Redis`);
      }
    } catch (error) {
      console.error('❌ Failed to clean up old jobs:', error);
    }
  }

  /**
   * Enqueue a new image generation job
   */
  async enqueue(request: ImageGenerationRequest) {
    const jobId = generateJobId();
    const now = new Date().toISOString();

    // Pre-generate expected image IDs based on numberOfVariants
    const numberOfVariants = request.settings?.numberOfVariants || 1;
    const expectedImageIds: string[] = [];
    for (let i = 0; i < numberOfVariants; i++) {
      expectedImageIds.push(`generated-${uuidv4()}.jpg`);
    }

    const job: ImageGenerationJob = {
      id: jobId,
      request,
      status: 'pending',
      imageIds: expectedImageIds, // Pre-populate with expected IDs
      error: null,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Store job in Redis (no TTL for pending jobs, will be set on completion)
    await redis.set(this.getJobKey(jobId), JSON.stringify(job));

    console.log(`✅ Job ${jobId} enqueued successfully, starting processing...`);

    // Start processing asynchronously (immediately, not waiting)
    setImmediate(() => {
      this.start(jobId).catch((error) => {
        console.error(`❌ Image generation job ${jobId} failed to start:`, error);
      });
    });

    return { jobId, expectedImageIds };
  }

  /**
   * Get job status by ID
   */
  async get(jobId: string): Promise<ImageGenerationJob | null> {
    try {
      const jobData = await redis.get(this.getJobKey(jobId));
      if (!jobData) return null;
      return this.deserializeJob(jobData);
    } catch (error) {
      console.error('❌ Failed to get job from Redis:', error);
      return null;
    }
  }

  /**
   * List all jobs
   */
  async list(): Promise<ImageGenerationJob[]> {
    try {
      const jobKeys = await redis.keys(`${REDIS_JOB_PREFIX}*`);
      if (jobKeys.length === 0) return [];

      const jobDataArray = await redis.mget(...jobKeys);
      const jobs: ImageGenerationJob[] = [];

      for (const jobData of jobDataArray) {
        if (typeof jobData === 'string') {
          try {
            jobs.push(this.deserializeJob(jobData));
          } catch (error) {
            console.error('❌ Failed to parse job data:', error);
          }
        }
      }

      return jobs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch (error) {
      console.error('❌ Failed to list jobs from Redis:', error);
      return [];
    }
  }

  /**
   * Update job in Redis
   */
  private async updateJob(job: ImageGenerationJob, setTTL: boolean = false): Promise<void> {
    try {
      const key = this.getJobKey(job.id);
      await redis.set(key, JSON.stringify(job));

      // Set TTL for completed or error jobs
      if (setTTL && (job.status === 'completed' || job.status === 'error')) {
        await redis.expire(key, REDIS_JOB_TTL);
      }
    } catch (error) {
      console.error('❌ Failed to update job in Redis:', error);
      throw error;
    }
  }

  /**
   * Start processing a job
   */
  private async start(jobId: string) {
    console.log(`🚀 Starting job processing for: ${jobId}`);

    const job = await this.get(jobId);
    if (!job) {
      console.error(`❌ Job ${jobId} not found in Redis!`);
      return;
    }

    console.log(`📋 Job ${jobId} retrieved, current status: ${job.status}`);

    job.status = 'generating';
    job.updatedAt = new Date().toISOString();
    await this.updateJob(job);

    console.log(`✅ Job ${jobId} status updated to 'generating'`);

    try {
      const { clientId, productId, sessionId, prompt, settings } = job.request;
      const numberOfVariants = settings?.numberOfVariants || 1;

      console.log(`🎨 Starting image generation job ${jobId}`);
      console.log(`📋 Generating ${numberOfVariants} variants`);
      console.log(`📦 Job request details:`, {
        productImageId: job.request.productImageId,
        productImageIdsCount: job.request.productImageIds?.length || 0,
        inspirationImageId: job.request.inspirationImageId,
        isClientSession: job.request.isClientSession,
      });

      // Build the comprehensive prompt
      const fullPrompt = buildImageGenerationPrompt(prompt, settings);

      // Load product BASE image(s) from S3 if provided (PNG with transparency for AI)
      const productImageFiles: File[] = [];
      const productImageRequests =
        job.request.productImageIds && job.request.productImageIds.length > 0
          ? job.request.productImageIds
          : job.request.productImageId
          ? [{ productId, imageId: job.request.productImageId }]
          : [];

      const loadProductImage = async (targetProductId: string, imageId: string): Promise<File | null> => {
        console.log(`📦 Product image ID provided: ${imageId}`);
        try {
          // Try new folder structure first: media/images/base/{imageId}.png
          const newPath = R2Media.MediaPaths.getProductImageBasePath(clientId, targetProductId, imageId);
          console.log('🔍 Trying new path:', newPath);

          let blob: Blob;
          let mimeType = 'image/png';
          let fileName = `${imageId}.png`;

          try {
            blob = await R2Media.downloadFile(newPath);
            console.log('✅ Found image in new location (media/images/base/)');
          } catch (error: any) {
            if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
              // Fall back to legacy path: media/{imageId}.png
              console.log('⚠️ Not found in new location, trying legacy path...');
              const legacyPath = R2Media.MediaPaths.getProductImagePath(clientId, targetProductId, `${imageId}.png`);
              console.log('🔍 Trying legacy path:', legacyPath);

              try {
                blob = await R2Media.downloadFile(legacyPath);
                console.log('✅ Found image in legacy location (media/)');
              } catch (legacyError: any) {
                if (legacyError.name === 'NoSuchKey' || legacyError.Code === 'NoSuchKey') {
                  // Try without extension as final fallback
                  const legacyPathNoExt = R2Media.MediaPaths.getProductImagePath(clientId, targetProductId, imageId);
                  console.log('🔍 Trying legacy path without extension:', legacyPathNoExt);
                  blob = await R2Media.downloadFile(legacyPathNoExt);
                  console.log('✅ Found image in legacy location without extension');
                } else {
                  throw legacyError;
                }
              }
            } else {
              throw error;
            }
          }

          const file = new File([blob], fileName, { type: mimeType });

          console.log(`✅ Loaded product image from S3:`);
          console.log(`   - Product ID: ${targetProductId}`);
          console.log(`   - Image ID: ${imageId}`);
          console.log(`   - File name: ${fileName}`);
          console.log(`   - MIME type: ${mimeType}`);
          console.log(`   - File size: ${blob.size} bytes`);
          console.log(`   - File.type: ${file.type}`);

          return file;
        } catch (error) {
          console.warn(`⚠️ Failed to load product image ${imageId} for product ${targetProductId}:`, error);
          return null;
        }
      };

      if (productImageRequests.length > 0) {
        for (const productImage of productImageRequests) {
          const loaded = await loadProductImage(productImage.productId, productImage.imageId);
          if (loaded) {
            productImageFiles.push(loaded);
          }
        }
      } else {
        console.log('⚠️  No product image ID provided - generating without reference image');
      }

      // Load inspiration image from S3 (by ID) or from URL
      let inspirationImageFile: File | undefined;
      if (job.request.inspirationImageUrl) {
        // Load inspiration from external URL (e.g., scene library, Unsplash)
        console.log(`🎨 Inspiration image URL provided: ${job.request.inspirationImageUrl}`);
        try {
          const response = await fetch(job.request.inspirationImageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
          }
          const blob = await response.blob();

          // Determine MIME type from response or URL
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const urlParts = job.request.inspirationImageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1].split('?')[0] || 'inspiration.jpg';

          inspirationImageFile = new File([blob], fileName, { type: contentType });

          console.log(`✅ Loaded inspiration image from URL successfully:`);
          console.log(`   - Job ID: ${jobId}`);
          console.log(`   - URL: ${job.request.inspirationImageUrl}`);
          console.log(`   - File name: ${fileName}`);
          console.log(`   - MIME type: ${contentType}`);
          console.log(`   - File size: ${blob.size} bytes`);
        } catch (error) {
          console.error(`❌ Failed to load inspiration image from URL for job ${jobId}:`, error);
        }
      } else if (job.request.inspirationImageId) {
        // Load inspiration from S3 by file ID
        console.log(`🎨 Inspiration image ID provided: ${job.request.inspirationImageId}`);
        console.log(
          `🎨 Job details: clientId=${clientId}, productId=${productId}, sessionId=${sessionId}, isClientSession=${job.request.isClientSession}`
        );
        try {
          const inspirationPath = job.request.isClientSession
            ? R2Media.MediaPaths.getClientSessionMediaFilePath(clientId, sessionId, job.request.inspirationImageId)
            : R2Media.MediaPaths.getMediaFilePath(clientId, productId, sessionId, job.request.inspirationImageId);

          console.log('🔍 Loading inspiration image from:', inspirationPath);
          const blob = await R2Media.downloadFile(inspirationPath);

          // Determine MIME type from file extension
          const extension = job.request.inspirationImageId.toLowerCase().split('.').pop();
          const mimeTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
          };
          const mimeType = mimeTypes[extension || 'jpg'] || 'image/jpeg';

          inspirationImageFile = new File([blob], job.request.inspirationImageId, { type: mimeType });

          console.log(`✅ Loaded inspiration image from R2 successfully:`);
          console.log(`   - Job ID: ${jobId}`);
          console.log(`   - Product ID: ${productId}`);
          console.log(`   - Image ID: ${job.request.inspirationImageId}`);
          console.log(`   - File name: ${job.request.inspirationImageId}`);
          console.log(`   - MIME type: ${mimeType}`);
          console.log(`   - File size: ${blob.size} bytes`);
        } catch (error) {
          console.error(`❌ Failed to load inspiration image for job ${jobId}, product ${productId}:`, error);
          console.error(
            `   - Expected path: ${job.request.isClientSession ? R2Media.MediaPaths.getClientSessionMediaFilePath(clientId, sessionId, job.request.inspirationImageId) : R2Media.MediaPaths.getMediaFilePath(clientId, productId, sessionId, job.request.inspirationImageId)}`
          );
        }
      } else {
        console.log(`ℹ️  No inspiration image provided for job ${jobId}, product ${productId}`);
      }

      const normalizeImageFile = async (file: File): Promise<File> => {
        if (
          !file.type ||
          file.type === 'application/xml' ||
          file.type === 'application/octet-stream'
        ) {
          const extension = file.name.toLowerCase().split('.').pop();
          const mimeTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
          };
          const correctMimeType = mimeTypes[extension || 'jpg'] || 'image/jpeg';

          console.log(`🔧 Fixing File object MIME type from '${file.type}' to '${correctMimeType}'`);

          const blob = new Blob([await file.arrayBuffer()], { type: correctMimeType });
          return new File([blob], file.name, { type: correctMimeType });
        }

        return file;
      };

      const normalizedProductImages = await Promise.all(productImageFiles.map(normalizeImageFile));

      // Use pre-generated image IDs from job
      const actualGeneratedIds: string[] = [];

      // Generate images sequentially to track progress
      for (let i = 0; i < numberOfVariants; i++) {
        try {
          console.log(`🖼️  Generating variant ${i + 1}/${numberOfVariants}...`);

          // Prepare structured image arrays for Gemini
          const productImages = normalizedProductImages;
          const inspirationImages = inspirationImageFile ? [inspirationImageFile] : [];

          console.log(`📋 Calling Gemini with:`);
          console.log(`   - Job ID: ${jobId}`);
          console.log(`   - Product ID: ${productId}`);
          console.log(`   - Variant: ${i + 1}/${numberOfVariants}`);
          console.log(`   - Product images: ${productImages.length}`);
          console.log(`   - Inspiration images: ${inspirationImages.length}`);
          console.log(`   - Prompt length: ${fullPrompt.length} chars`);
          if (inspirationImages.length > 0) {
            console.log(
              `   - Inspiration image file: ${inspirationImageFile?.name}, size: ${inspirationImageFile?.size}, type: ${inspirationImageFile?.type}`
            );
          }

          // Call Gemini with structured product and inspiration images
          const geminiResponse = await this.gemini.generateImages({
            prompt: fullPrompt,
            productImages: productImages.length > 0 ? productImages : undefined,
            inspirationImages: inspirationImages.length > 0 ? inspirationImages : undefined,
            count: 1,
            aspectRatio: settings?.aspectRatio || '1:1 (Square)',
            imageQuality: settings?.imageQuality,
            modelOverrides: job.request.modelOverrides,
          });

          if (geminiResponse.images.length > 0) {
            // Convert data URL to blob
            const imageDataUrl = geminiResponse.images[0].url;
            const imageBlob = await this.dataUrlToBlob(imageDataUrl);

            // Use pre-generated image ID from job.imageIds
            const imageId = job.imageIds[i];
            console.log(`📝 Using pre-generated image ID: ${imageId}`);

            // Upload to R2 - use correct path based on session type
            const key = job.request.isClientSession
              ? R2Media.MediaPaths.getClientSessionMediaFilePath(clientId, sessionId, imageId)
              : R2Media.MediaPaths.getMediaFilePath(clientId, productId, sessionId, imageId);
            const file = new File([imageBlob], imageId, { type: 'image/jpeg' });

            await R2Media.uploadFile(key, file);

            console.log(`✅ Uploaded image ${i + 1} to R2: ${imageId}`);

            // Track actually generated IDs
            actualGeneratedIds.push(imageId);

            // Update progress
            job.progress = Math.round(((i + 1) / numberOfVariants) * 100);
            job.updatedAt = new Date().toISOString();
            await this.updateJob(job);
          } else {
            throw new Error('No images generated');
          }

          // Small delay between generations
          if (i < numberOfVariants - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`❌ Failed to generate variant ${i + 1}:`, error);
          // Continue with other variants
        }
      }

      // Update job with only the actually generated IDs
      job.imageIds = actualGeneratedIds;

      // Mark job as completed
      if (job.imageIds.length > 0) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date().toISOString();
        console.log(`✅ Job ${jobId} completed with ${job.imageIds.length} images`);
      } else {
        throw new Error('Failed to generate any images');
      }

      job.updatedAt = new Date().toISOString();
      await this.updateJob(job, true); // Set TTL for completed job
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Generation failed';
      job.updatedAt = new Date().toISOString();
      await this.updateJob(job, true); // Set TTL for failed job

      console.error(`❌ Job ${jobId} failed:`, error);
    }
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }
}

// Singleton instance
declare global {
  // eslint-disable-next-line no-var
  var __scenergy_image_generation_queue: ImageGenerationQueue | undefined;
}

const globalForQueue = globalThis as unknown as { __scenergy_image_generation_queue?: ImageGenerationQueue };

export const imageGenerationQueue = globalForQueue.__scenergy_image_generation_queue ?? new ImageGenerationQueue();

if (!globalForQueue.__scenergy_image_generation_queue) {
  globalForQueue.__scenergy_image_generation_queue = imageGenerationQueue;
}

export type { ImageGenerationJob, ImageGenerationRequest };
