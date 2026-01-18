/**
 * Hook for polling job status
 *
 * Features:
 * - Exponential backoff (1s → 5s max)
 * - Auto-stops on completion/failure
 * - 2 minute timeout
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export type JobState = 'pending' | 'active' | 'completed' | 'failed' | 'timeout';

export interface JobStatusResult {
  id: string;
  type: string;
  status: JobState;
  progress: number;
  result?: unknown;
  error?: string;
}

interface UseJobStatusOptions {
  enabled?: boolean;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
  maxAttempts?: number;
}

export function useJobStatus(jobId: string | null, options: UseJobStatusOptions = {}) {
  const { enabled = true, onComplete, onError, maxAttempts = 60 } = options;
  
  const [status, setStatus] = useState<JobStatusResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const poll = useCallback(async () => {
    if (!jobId || !enabled) return;

    setIsPolling(true);
    let attempts = 0;

    const fetchStatus = async (): Promise<void> => {
      try {
        const data = await apiClient.getJobStatus(jobId);
        
        const jobResult: JobStatusResult = {
          id: data.id,
          type: 'image_generation',
          status: data.status as JobState,
          progress: data.progress ?? 0,
          result: data.result,
          error: data.error,
        };
        
        setStatus(jobResult);

        if (jobResult.status === 'completed') {
          setIsPolling(false);
          onComplete?.(jobResult.result);
          return;
        }

        if (jobResult.status === 'failed') {
          setIsPolling(false);
          onError?.(jobResult.error ?? 'Job failed');
          return;
        }

        // Continue polling with backoff
        attempts++;
        if (attempts >= maxAttempts) {
          setStatus((prev) => prev ? { ...prev, status: 'timeout' } : null);
          setIsPolling(false);
          onError?.('Job timed out');
          return;
        }

        // Exponential backoff: 1s, 2s, 3s, 4s, 5s (max)
        const delay = Math.min(1000 * Math.ceil(attempts / 5), 5000);
        await new Promise((r) => setTimeout(r, delay));
        return fetchStatus();
      } catch (err: any) {
        // Handle 404 - Job not found yet, might still be queuing
        if (err.message?.includes('404') || err.message?.includes('not found')) {
          if (attempts < 5) {
            attempts++;
            const delay = Math.min(1000 * attempts, 5000);
            await new Promise((r) => setTimeout(r, delay));
            return fetchStatus();
          }
        }
        console.error('Polling error:', err);
        setIsPolling(false);
        onError?.('Failed to poll job status');
      }
    };

    await fetchStatus();
  }, [jobId, enabled, onComplete, onError, maxAttempts]);

  useEffect(() => {
    if (jobId && enabled) {
      poll();
    }
    return () => setIsPolling(false);
  }, [jobId, enabled, poll]);

  return {
    status,
    isPolling,
    refetch: poll,
  };
}

/**
 * Simple function for one-time job waiting (non-hook)
 */
export async function waitForJob(
  jobId: string,
  options: { maxAttempts?: number; onProgress?: (progress: number) => void } = {}
): Promise<JobStatusResult> {
  const { maxAttempts = 60, onProgress } = options;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const data = await apiClient.getJobStatus(jobId);
      onProgress?.(data.progress ?? 0);

      const jobResult: JobStatusResult = {
        id: data.id,
        type: 'image_generation',
        status: data.status as JobState,
        progress: data.progress ?? 0,
        result: data.result,
        error: data.error,
      };

      if (jobResult.status === 'completed') return jobResult;
      if (jobResult.status === 'failed') throw new Error(jobResult.error ?? 'Job failed');
    } catch (err: any) {
      // Handle 404 - Job not found yet, might still be queuing
      if (!err.message?.includes('404') && !err.message?.includes('not found')) {
        throw err;
      }
    }

    attempts++;
    const delay = Math.min(1000 * Math.ceil(attempts / 5), 5000);
    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error('Job timed out');
}

