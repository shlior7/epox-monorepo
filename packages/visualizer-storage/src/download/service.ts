/**
 * Download Service
 * Handles single and bulk downloads from storage
 */

import type { DownloadJob, DownloadJobStatus, CreateDownloadJobRequest, SingleDownloadResult, BulkDownloadResult } from './types';
import type { StorageFacade } from '../types';
import { storagePaths } from '../paths';

export interface DownloadServiceConfig {
  urlExpirySeconds?: number;
  maxFilesPerZip?: number;
}

// Simple ID generator
function generateJobId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class DownloadService {
  private readonly config: Required<DownloadServiceConfig>;
  private readonly jobs: Map<string, DownloadJob> = new Map();
  private storage: StorageFacade | null = null;

  constructor(config: DownloadServiceConfig = {}) {
    this.config = {
      urlExpirySeconds: config.urlExpirySeconds ?? 3600, // 1 hour
      maxFilesPerZip: config.maxFilesPerZip ?? 100,
    };
  }

  /**
   * Set the storage facade (allows lazy initialization)
   */
  setStorage(storage: StorageFacade): void {
    this.storage = storage;
  }

  /**
   * Generate a signed download URL for a single file
   */
  async getSignedDownloadUrl(key: string, filename?: string): Promise<SingleDownloadResult> {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call setStorage() first.');
    }

    const url = await this.storage.getDownloadUrl(key, this.config.urlExpirySeconds);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.config.urlExpirySeconds);

    return {
      url,
      filename: filename ?? key.split('/').pop() ?? 'download',
      expiresAt,
    };
  }

  /**
   * Get download URL for a generated asset
   */
  async getAssetDownloadUrl(
    clientId: string,
    generationFlowId: string,
    assetId: string,
    productName?: string
  ): Promise<SingleDownloadResult> {
    const key = storagePaths.generationAsset(clientId, generationFlowId, assetId);

    // Build filename: product_name_timestamp.webp
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeName = (productName ?? 'image').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const filename = `${safeName}_${timestamp}.webp`;

    return this.getSignedDownloadUrl(key, filename);
  }

  /**
   * Create a bulk download job
   */
  async createBulkDownloadJob(request: CreateDownloadJobRequest): Promise<DownloadJob> {
    if (request.assetIds.length > this.config.maxFilesPerZip) {
      throw new Error(`Maximum ${this.config.maxFilesPerZip} files per download`);
    }

    const job: DownloadJob = {
      id: generateJobId(),
      clientId: request.clientId,
      status: 'pending',
      fileCount: request.assetIds.length,
      processedCount: 0,
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);

    // In a real implementation, this would enqueue a background job
    // to create the ZIP file asynchronously
    return job;
  }

  /**
   * Get bulk download job status
   */
  async getDownloadJob(jobId: string): Promise<DownloadJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  /**
   * Update download job status
   */
  async updateDownloadJob(
    jobId: string,
    updates: Partial<Pick<DownloadJob, 'status' | 'processedCount' | 'zipUrl' | 'zipSizeBytes' | 'error'>>
  ): Promise<DownloadJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    if (updates.status !== undefined) job.status = updates.status;
    if (updates.processedCount !== undefined) job.processedCount = updates.processedCount;
    if (updates.zipUrl !== undefined) job.zipUrl = updates.zipUrl;
    if (updates.zipSizeBytes !== undefined) job.zipSizeBytes = updates.zipSizeBytes;
    if (updates.error !== undefined) job.error = updates.error;

    if (updates.status === 'completed' || updates.status === 'error') {
      job.completedAt = new Date();
      if (updates.status === 'completed') {
        // ZIP expires in 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        job.expiresAt = expiresAt;
      }
    }

    return job;
  }

  /**
   * Get download progress for a job
   */
  async getDownloadProgress(jobId: string): Promise<BulkDownloadResult | null> {
    const job = await this.getDownloadJob(jobId);
    if (!job) return null;

    const progress = job.fileCount > 0 ? Math.round((job.processedCount / job.fileCount) * 100) : 0;

    // Estimate: 2 seconds per file
    const remainingFiles = job.fileCount - job.processedCount;
    const estimatedSeconds = job.status === 'processing' ? remainingFiles * 2 : undefined;

    return {
      jobId: job.id,
      status: job.status,
      zipUrl: job.zipUrl,
      progress,
      estimatedSeconds,
    };
  }

  /**
   * Cleanup expired jobs
   */
  async cleanupExpiredJobs(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (job.expiresAt && job.expiresAt < now) {
        // In production, also delete the ZIP from storage
        this.jobs.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

// Singleton instance
let _downloadService: DownloadService | null = null;

export function getDownloadService(): DownloadService {
  if (!_downloadService) {
    _downloadService = new DownloadService();
  }
  return _downloadService;
}

export function resetDownloadService(): void {
  _downloadService = null;
}
