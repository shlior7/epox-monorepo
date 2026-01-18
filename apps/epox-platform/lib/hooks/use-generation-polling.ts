'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

type PollingStatus = 'idle' | 'polling' | 'completed' | 'failed' | 'timeout';

interface GenerationJob {
  jobId: string;
  sessionId: string;
  startedAt: number;
  status: PollingStatus;
  progress: number;
  error?: string;
}

interface UseGenerationPollingOptions {
  sessionId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  pollInterval?: number;
  maxAttempts?: number;
}

const STORAGE_KEY_PREFIX = 'epox_generation_job_';

export function useGenerationPolling({
  sessionId,
  onComplete,
  onError,
  pollInterval = 3000,
  maxAttempts = 120, // 6 minutes max
}: UseGenerationPollingOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<PollingStatus>('idle');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef(0);
  const isVisibleRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Storage key for this session
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;

  // Load persisted job on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const job: GenerationJob = JSON.parse(stored);
        // Only restore if job is still potentially active (within last 10 minutes)
        const isRecent = Date.now() - job.startedAt < 10 * 60 * 1000;
        if (isRecent && (job.status === 'polling' || job.status === 'idle')) {
          console.log('🔄 Resuming polling for job:', job.jobId);
          setCurrentJobId(job.jobId);
          setIsGenerating(true);
          setProgress(job.progress);
          setStatus('polling');
          // Start polling immediately
          startPolling(job.jobId);
        } else {
          // Clear stale job
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.warn('Failed to restore generation state:', e);
      localStorage.removeItem(storageKey);
    }

    // Handle visibility changes
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      // Resume polling if visible and we have an active job
      if (isVisibleRef.current && currentJobId && status === 'polling') {
        console.log('👁️ Tab visible, resuming polling');
        startPolling(currentJobId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [sessionId]);

  const persistJob = useCallback(
    (job: Partial<GenerationJob>) => {
      if (typeof window === 'undefined') return;
      try {
        const existing = localStorage.getItem(storageKey);
        const current: GenerationJob = existing
          ? JSON.parse(existing)
          : { jobId: '', sessionId, startedAt: Date.now(), status: 'idle', progress: 0 };
        const updated = { ...current, ...job };
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist generation state:', e);
      }
    },
    [storageKey, sessionId]
  );

  const clearPersistedJob = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // Ignore
    }
  }, [storageKey]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (!isVisibleRef.current) {
        console.log('⏸️ Tab hidden, pausing polling');
        return;
      }

      attemptRef.current += 1;

      if (attemptRef.current > maxAttempts) {
        console.warn('⏰ Polling timeout reached');
        setStatus('timeout');
        setIsGenerating(false);
        persistJob({ status: 'timeout' });
        onError?.('Generation is taking too long. Check back later.');
        return;
      }

      try {
        abortControllerRef.current = new AbortController();
        const jobData = await apiClient.getJobStatus(jobId);

        if (attemptRef.current % 5 === 0) {
          console.log(`📊 Job ${jobId} status: ${jobData.status} (attempt ${attemptRef.current})`);
        }

        if (jobData.status === 'completed') {
          console.log('✅ Generation completed!');
          setStatus('completed');
          setProgress(100);
          setIsGenerating(false);
          clearPersistedJob();
          onComplete?.();
          return;
        }

        if (jobData.status === 'failed') {
          console.error('❌ Generation failed:', jobData.error);
          setStatus('failed');
          setIsGenerating(false);
          clearPersistedJob();
          onError?.(jobData.error || 'Generation failed');
          return;
        }

        // Update progress
        if (jobData.progress) {
          setProgress(Math.min(jobData.progress, 95));
          persistJob({ progress: jobData.progress });
        }

        // Schedule next poll
        pollingRef.current = setTimeout(() => pollJobStatus(jobId), pollInterval);
      } catch (error) {
        // Only log network errors periodically
        if (attemptRef.current % 5 === 0) {
          console.warn(`⚠️ Polling error (attempt ${attemptRef.current}):`, error);
        }
        // Continue polling on transient errors
        pollingRef.current = setTimeout(() => pollJobStatus(jobId), pollInterval);
      }
    },
    [maxAttempts, pollInterval, onComplete, onError, persistJob, clearPersistedJob]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      attemptRef.current = 0;
      pollJobStatus(jobId);
    },
    [stopPolling, pollJobStatus]
  );

  const startGeneration = useCallback(
    (jobId: string) => {
      console.log('🚀 Starting generation polling for:', jobId);
      setCurrentJobId(jobId);
      setIsGenerating(true);
      setProgress(0);
      setStatus('polling');
      persistJob({
        jobId,
        sessionId,
        startedAt: Date.now(),
        status: 'polling',
        progress: 0,
      });
      startPolling(jobId);
    },
    [sessionId, persistJob, startPolling]
  );

  const cancelGeneration = useCallback(() => {
    console.log('🛑 Cancelling generation');
    stopPolling();
    setIsGenerating(false);
    setProgress(0);
    setStatus('idle');
    setCurrentJobId(null);
    clearPersistedJob();
  }, [stopPolling, clearPersistedJob]);

  return {
    isGenerating,
    progress,
    status,
    currentJobId,
    startGeneration,
    cancelGeneration,
  };
}

