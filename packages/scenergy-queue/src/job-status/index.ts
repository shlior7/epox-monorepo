/**
 * Job Status Cache
 *
 * Stores job results in Redis for polling.
 * Results expire after 1 hour.
 */

import Redis from 'ioredis';

const JOB_TTL_SECONDS = 3600; // 1 hour
const KEY_PREFIX = 'job-status:';

export type JobStatusState = 'pending' | 'active' | 'completed' | 'failed';

export interface JobStatus {
  id: string;
  type: string;
  status: JobStatusState;
  progress: number;
  result?: unknown;
  error?: string;
  updatedAt: number;
}

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL;
    if (!url) {throw new Error('REDIS_URL required for job status');}
    redis = new Redis(url, { maxRetriesPerRequest: null });
  }
  return redis;
}

/**
 * Update job status in Redis
 */
export async function setJobStatus(
  jobId: string,
  status: Partial<JobStatus> & { id: string; type: string }
): Promise<void> {
  const key = `${KEY_PREFIX}${jobId}`;
  const data: JobStatus = {
    id: status.id,
    type: status.type,
    status: status.status ?? 'pending',
    progress: status.progress ?? 0,
    result: status.result,
    error: status.error,
    updatedAt: Date.now(),
  };
  await getRedis().setex(key, JOB_TTL_SECONDS, JSON.stringify(data));
}

/**
 * Get job status from Redis
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const key = `${KEY_PREFIX}${jobId}`;
  const data = await getRedis().get(key);
  if (!data) {return null;}
  return JSON.parse(data);
}

/**
 * Get multiple job statuses
 */
export async function getJobStatuses(jobIds: string[]): Promise<Map<string, JobStatus>> {
  if (jobIds.length === 0) {return new Map();}

  const keys = jobIds.map((id) => `${KEY_PREFIX}${id}`);
  const values = await getRedis().mget(...keys);

  const result = new Map<string, JobStatus>();
  for (const [i, id] of jobIds.entries()) {
    if (values[i]) {
      result.set(id, JSON.parse(values[i]));
    }
  }
  return result;
}

/**
 * Delete job status (cleanup)
 */
export async function deleteJobStatus(jobId: string): Promise<void> {
  await getRedis().del(`${KEY_PREFIX}${jobId}`);
}

