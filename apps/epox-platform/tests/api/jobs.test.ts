/**
 * Job Status API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getJob } from '@/app/api/jobs/[id]/route';

vi.mock('@/lib/services/db', () => ({
  db: {
    generationJobs: {
      getById: vi.fn(),
    },
  },
}));

import { db } from '@/lib/services/db';

describe('Jobs API - GET /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require job id', async () => {
    const request = new NextRequest('http://localhost:3000/api/jobs/');
    const response = await getJob(request, { params: Promise.resolve({ id: '' }) });

    expect(response.status).toBe(400);
  });

  it('should return 404 when job not found', async () => {
    vi.mocked(db.generationJobs.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/jobs/job-1');
    const response = await getJob(request, { params: Promise.resolve({ id: 'job-1' }) });

    expect(response.status).toBe(404);
  });

  it('should map processing status to active', async () => {
    vi.mocked(db.generationJobs.getById).mockResolvedValue({
      id: 'job-1',
      type: 'image_generation',
      status: 'processing',
      progress: 50,
      result: { imageIds: ['img-1'] },
      error: null,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/job-1');
    const response = await getJob(request, { params: Promise.resolve({ id: 'job-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('active');
    expect(data.imageIds).toEqual(['img-1']);
  });

  it('should include videoIds for video jobs', async () => {
    vi.mocked(db.generationJobs.getById).mockResolvedValue({
      id: 'job-vid-1',
      type: 'video_generation',
      status: 'completed',
      progress: 100,
      result: { videoIds: ['vid-1'] },
      error: null,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    } as any);

    const request = new NextRequest('http://localhost:3000/api/jobs/job-vid-1');
    const response = await getJob(request, { params: Promise.resolve({ id: 'job-vid-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.videoIds).toEqual(['vid-1']);
  });

  it('should handle errors', async () => {
    vi.mocked(db.generationJobs.getById).mockRejectedValueOnce(new Error('DB error'));

    const request = new NextRequest('http://localhost:3000/api/jobs/job-1');
    const response = await getJob(request, { params: Promise.resolve({ id: 'job-1' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('Failed to get job status');
  });
});
