/**
 * Unit Tests: Job Status Cache
 *
 * Tests Redis-based job status operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestRedis } from '../setup';
import {
  setJobStatus,
  getJobStatus,
  getJobStatuses,
  deleteJobStatus,
  type JobStatus,
} from '../../src/job-status';

describe('Job Status Cache', () => {
  beforeEach(async () => {
    // Clean up job-status keys
    const redis = getTestRedis();
    const keys = await redis.keys('job-status:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('setJobStatus', () => {
    it('should set job status with all fields', async () => {
      await setJobStatus('job-1', {
        id: 'job-1',
        type: 'image_generation',
        status: 'active',
        progress: 50,
      });

      const status = await getJobStatus('job-1');
      expect(status).toBeDefined();
      expect(status?.id).toBe('job-1');
      expect(status?.type).toBe('image_generation');
      expect(status?.status).toBe('active');
      expect(status?.progress).toBe(50);
      expect(status?.updatedAt).toBeTypeOf('number');
    });

    it('should set status with result data', async () => {
      const result = { imageUrls: ['http://example.com/1.png'], imageIds: ['img-1'] };

      await setJobStatus('job-2', {
        id: 'job-2',
        type: 'image_generation',
        status: 'completed',
        progress: 100,
        result,
      });

      const status = await getJobStatus('job-2');
      expect(status?.result).toEqual(result);
    });

    it('should set status with error message', async () => {
      await setJobStatus('job-3', {
        id: 'job-3',
        type: 'image_edit',
        status: 'failed',
        progress: 0,
        error: 'API rate limit exceeded',
      });

      const status = await getJobStatus('job-3');
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('API rate limit exceeded');
    });

    it('should default status to pending and progress to 0', async () => {
      await setJobStatus('job-4', {
        id: 'job-4',
        type: 'image_generation',
      });

      const status = await getJobStatus('job-4');
      expect(status?.status).toBe('pending');
      expect(status?.progress).toBe(0);
    });

    it('should update existing status', async () => {
      await setJobStatus('job-5', {
        id: 'job-5',
        type: 'image_generation',
        status: 'pending',
        progress: 0,
      });

      await setJobStatus('job-5', {
        id: 'job-5',
        type: 'image_generation',
        status: 'active',
        progress: 50,
      });

      const status = await getJobStatus('job-5');
      expect(status?.status).toBe('active');
      expect(status?.progress).toBe(50);
    });

    it('should set TTL on the key (1 hour)', async () => {
      await setJobStatus('job-ttl', {
        id: 'job-ttl',
        type: 'image_generation',
      });

      const redis = getTestRedis();
      const ttl = await redis.ttl('job-status:job-ttl');
      expect(ttl).toBeGreaterThan(3500); // Close to 3600
      expect(ttl).toBeLessThanOrEqual(3600);
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      const status = await getJobStatus('non-existent-job');
      expect(status).toBeNull();
    });

    it('should return correct status for existing job', async () => {
      await setJobStatus('job-get', {
        id: 'job-get',
        type: 'image_edit',
        status: 'completed',
        progress: 100,
      });

      const status = await getJobStatus('job-get');
      expect(status).not.toBeNull();
      expect(status?.id).toBe('job-get');
    });
  });

  describe('getJobStatuses', () => {
    it('should return empty map for empty array', async () => {
      const statuses = await getJobStatuses([]);
      expect(statuses.size).toBe(0);
    });

    it('should return multiple job statuses', async () => {
      await setJobStatus('batch-1', { id: 'batch-1', type: 'image_generation', status: 'completed' });
      await setJobStatus('batch-2', { id: 'batch-2', type: 'image_edit', status: 'active' });
      await setJobStatus('batch-3', { id: 'batch-3', type: 'upscale', status: 'pending' });

      const statuses = await getJobStatuses(['batch-1', 'batch-2', 'batch-3']);
      expect(statuses.size).toBe(3);
      expect(statuses.get('batch-1')?.status).toBe('completed');
      expect(statuses.get('batch-2')?.status).toBe('active');
      expect(statuses.get('batch-3')?.status).toBe('pending');
    });

    it('should skip non-existent jobs', async () => {
      await setJobStatus('exists', { id: 'exists', type: 'image_generation' });

      const statuses = await getJobStatuses(['exists', 'not-exists', 'also-not-exists']);
      expect(statuses.size).toBe(1);
      expect(statuses.has('exists')).toBe(true);
      expect(statuses.has('not-exists')).toBe(false);
    });
  });

  describe('deleteJobStatus', () => {
    it('should delete existing job status', async () => {
      await setJobStatus('to-delete', { id: 'to-delete', type: 'image_generation' });
      expect(await getJobStatus('to-delete')).not.toBeNull();

      await deleteJobStatus('to-delete');
      expect(await getJobStatus('to-delete')).toBeNull();
    });

    it('should not throw for non-existent job', async () => {
      await expect(deleteJobStatus('never-existed')).resolves.not.toThrow();
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress updates correctly', async () => {
      const progressValues = [0, 25, 50, 75, 100];

      for (const progress of progressValues) {
        await setJobStatus('progress-job', {
          id: 'progress-job',
          type: 'image_generation',
          status: progress === 100 ? 'completed' : 'active',
          progress,
        });

        const status = await getJobStatus('progress-job');
        expect(status?.progress).toBe(progress);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent status updates', async () => {
      const updates = Array.from({ length: 10 }, (_, i) =>
        setJobStatus(`concurrent-${i}`, {
          id: `concurrent-${i}`,
          type: 'image_generation',
          progress: i * 10,
        })
      );

      await Promise.all(updates);

      const statuses = await getJobStatuses(
        Array.from({ length: 10 }, (_, i) => `concurrent-${i}`)
      );

      expect(statuses.size).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(statuses.get(`concurrent-${i}`)?.progress).toBe(i * 10);
      }
    });
  });
});

