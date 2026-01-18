/**
 * Download Service Types
 */

export type DownloadJobStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface DownloadJob {
  id: string;
  clientId: string;
  status: DownloadJobStatus;
  fileCount: number;
  processedCount: number;
  zipUrl?: string;
  zipSizeBytes?: number;
  error?: string;
  expiresAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateDownloadJobRequest {
  clientId: string;
  assetIds: string[];
  filename?: string;
}

export interface SingleDownloadResult {
  url: string;
  filename: string;
  expiresAt: Date;
}

export interface BulkDownloadResult {
  jobId: string;
  status: DownloadJobStatus;
  zipUrl?: string;
  progress: number;
  estimatedSeconds?: number;
}


