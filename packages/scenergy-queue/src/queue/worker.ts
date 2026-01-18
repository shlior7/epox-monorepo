/**
 * Queue Worker
 *
 * Processes AI jobs: Generate → Save to R2 → Write to DB → Update status
 */

import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { getGeminiService } from 'visualizer-ai';
import { saveGeneratedImage, type SavedImage } from '../persistence';
import { setJobStatus } from '../job-status';
import type {
  AIJobType,
  WorkerConfig,
  ImageGenerationPayload,
  ImageEditPayload,
  ImageGenerationResult,
  ImageEditResult,
  JobResult,
} from '../types';

const DEFAULT_QUEUE_NAME = 'ai-jobs';

export class QueueWorker {
  private worker: Worker;

  constructor(config: WorkerConfig) {
    // Convert RPM to BullMQ limiter format (max per duration in ms)
    const limiter = config.maxJobsPerMinute
      ? { max: config.maxJobsPerMinute, duration: 60_000 } // 60 seconds
      : undefined;

    this.worker = new Worker(
      config.queueName ?? DEFAULT_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: { url: config.redisUrl, maxRetriesPerRequest: null },
        concurrency: config.concurrency ?? 5,
        limiter,
      }
    );

    this.worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));
  }

  private async process(job: Job): Promise<JobResult<AIJobType>> {
    const type = job.name as AIJobType;
    const start = Date.now();

    console.log(`🚀 [${job.id}] ${type}`);

    // Mark as active
    await setJobStatus(job.id!, { id: job.id!, type, status: 'active', progress: 0 });

    try {
      let result: JobResult<AIJobType>;

      switch (type) {
        case 'image_generation':
          result = await this.generateImages(job);
          break;
        case 'image_edit':
          result = await this.editImage(job);
          break;
        default:
          throw new Error(`Unsupported job type: ${type}`);
      }

      result.duration = Date.now() - start;
      console.log(`✅ [${job.id}] Done in ${result.duration}ms`);

      // Mark as completed with result
      await setJobStatus(job.id!, {
        id: job.id!,
        type,
        status: 'completed',
        progress: 100,
        result,
      });

      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [${job.id}] ${msg}`);

      // Mark as failed
      await setJobStatus(job.id!, {
        id: job.id!,
        type,
        status: 'failed',
        progress: 0,
        error: msg,
      });

      throw error;
    }
  }

  /**
   * Generate images: Call Gemini → Save to R2 + DB
   *
   * One job = one generated asset (combining all products in productIds)
   * Variants setting generates multiple images, each combining all products
   */
  private async generateImages(job: Job<ImageGenerationPayload>): Promise<ImageGenerationResult> {
    const p = job.data;
    const gemini = getGeminiService();

    const saved: SavedImage[] = [];
    const variants = p.settings?.variants ?? 1;

    for (let i = 0; i < variants; i++) {
      const progress = Math.round((i / variants) * 100);
      await job.updateProgress(progress);
      await setJobStatus(job.id!, {
        id: job.id!,
        type: 'image_generation',
        status: 'active',
        progress,
      });

      try {
        // Generate ONE image that combines all products
        const res = await gemini.generateImages({
          prompt: p.prompt,
          aspectRatio: p.settings?.aspectRatio,
          imageQuality: p.settings?.imageQuality,
          count: 1,
          // TODO: Pass productImageUrls to Gemini for multi-product composition
        });

        if (res.images[0]?.url) {
          // Save with ALL productIds linked to this single asset
          const savedImage = await saveGeneratedImage({
            clientId: p.clientId,
            sessionId: p.sessionId,
            productIds: p.productIds, // All products linked to this asset
            prompt: p.prompt,
            jobId: job.id!,
            base64Data: res.images[0].url,
            settings: p.settings,
          });
          saved.push(savedImage);
        }
      } catch (err) {
        console.error(`Failed variant ${i + 1}/${variants}:`, err);
      }
    }

    await job.updateProgress(100);

    return {
      success: saved.length > 0,
      imageUrls: saved.map((s) => s.url),
      imageIds: saved.map((s) => s.id),
    };
  }

  /**
   * Edit image: Call Gemini → Save result to R2 + DB
   */
  private async editImage(job: Job): Promise<ImageEditResult> {
    const p = job.data as ImageEditPayload;
    const gemini = getGeminiService();

    await job.updateProgress(10);
    await setJobStatus(job.id!, { id: job.id!, type: 'image_edit', status: 'active', progress: 10 });

    const res = await gemini.editImage({
      baseImageDataUrl: p.sourceImageUrl,
      prompt: p.editPrompt,
    });

    if (!res.editedImageDataUrl) {
      return { success: false, error: 'Edit failed', imageUrl: '', imageId: '' };
    }

    await job.updateProgress(80);

    const saved = await saveGeneratedImage({
      clientId: p.clientId,
      sessionId: p.sessionId,
      prompt: p.editPrompt,
      jobId: job.id!,
      base64Data: res.editedImageDataUrl,
    });

    await job.updateProgress(100);

    return { success: true, imageUrl: saved.url, imageId: saved.id };
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
