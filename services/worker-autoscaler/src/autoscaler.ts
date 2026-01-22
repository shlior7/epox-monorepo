/**
 * Autoscaler - Manages worker scaling based on queue depth
 */

import Redis from 'ioredis';

export interface AutoscalerConfig {
  railwayToken: string;
  railwayProjectId: string;
  railwayEnvironmentId: string;
  railwayWorkerServiceId: string;
  databaseUrl: string;
  redisUrl: string;
  maxWorkers: number;
  minWorkers: number;
  globalRpmLimit: number;
  pollIntervalMs: number;
  scaleDownCooldownMs: number;
  scaleUpCooldownMs: number;
}

interface ScalingState {
  currentWorkers: number;
  desiredWorkers: number;
  queueDepth: number;
  processingCount: number;
  lastScaleUp: number;
  lastScaleDown: number;
  rpmUsed: number;
  rpmLimit: number;
}

// Redis keys
const REDIS_KEYS = {
  RATE_LIMIT: 'worker:rate_limit',
  WORKER_COUNT: 'worker:count',
  LAST_SCALE_UP: 'worker:last_scale_up',
  LAST_SCALE_DOWN: 'worker:last_scale_down',
};

export class Autoscaler {
  private config: AutoscalerConfig;
  private redis: Redis;
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(config: AutoscalerConfig) {
    this.config = config;
    this.redis = new Redis(config.redisUrl);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('🚀 Autoscaler starting...');
    console.log(`   Max workers: ${this.config.maxWorkers}`);
    console.log(`   Min workers: ${this.config.minWorkers}`);
    console.log(`   Global RPM limit: ${this.config.globalRpmLimit}`);
    console.log(`   Poll interval: ${this.config.pollIntervalMs}ms`);

    // Initialize Redis rate limit config
    await this.initializeRateLimitConfig();

    // Start polling loop
    await this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);

    console.log('✅ Autoscaler started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    await this.redis.quit();
    console.log('✅ Autoscaler stopped');
  }

  private async initializeRateLimitConfig(): Promise<void> {
    // Store global RPM limit in Redis for workers to read
    await this.redis.set('worker:config:rpm_limit', this.config.globalRpmLimit.toString());
    await this.redis.set('worker:config:max_workers', this.config.maxWorkers.toString());
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const state = await this.getScalingState();
      const decision = this.calculateDesiredWorkers(state);

      if (decision.shouldScale) {
        await this.scaleWorkers(decision.targetWorkers, decision.reason);
      }

      // Log status periodically
      console.log(
        `📊 Queue: ${state.queueDepth} pending, ${state.processingCount} processing | ` +
          `Workers: ${state.currentWorkers}/${this.config.maxWorkers} | ` +
          `RPM: ${state.rpmUsed}/${state.rpmLimit}`
      );
    } catch (error) {
      console.error('❌ Poll error:', error);
    }
  }

  private async getScalingState(): Promise<ScalingState> {
    // Get queue depth from PostgreSQL
    const { pending, processing } = await this.getQueueStats();

    // Get current worker count from Railway
    const currentWorkers = await this.getCurrentWorkerCount();

    // Get rate limit usage from Redis
    const rpmUsed = await this.getRpmUsage();

    // Get last scale times from Redis
    const lastScaleUp = parseInt((await this.redis.get(REDIS_KEYS.LAST_SCALE_UP)) ?? '0', 10);
    const lastScaleDown = parseInt((await this.redis.get(REDIS_KEYS.LAST_SCALE_DOWN)) ?? '0', 10);

    return {
      currentWorkers,
      desiredWorkers: currentWorkers,
      queueDepth: pending,
      processingCount: processing,
      lastScaleUp,
      lastScaleDown,
      rpmUsed,
      rpmLimit: this.config.globalRpmLimit,
    };
  }

  private calculateDesiredWorkers(state: ScalingState): {
    shouldScale: boolean;
    targetWorkers: number;
    reason: string;
  } {
    const now = Date.now();
    const totalPending = state.queueDepth + state.processingCount;

    // Calculate desired workers based on queue depth
    let desiredWorkers: number;
    if (totalPending === 0) {
      desiredWorkers = this.config.minWorkers;
    } else if (totalPending <= 10) {
      desiredWorkers = Math.max(1, this.config.minWorkers);
    } else if (totalPending <= 30) {
      desiredWorkers = 2;
    } else if (totalPending <= 60) {
      desiredWorkers = 3;
    } else if (totalPending <= 100) {
      desiredWorkers = 4;
    } else {
      desiredWorkers = this.config.maxWorkers;
    }

    // Clamp to min/max
    desiredWorkers = Math.min(Math.max(desiredWorkers, this.config.minWorkers), this.config.maxWorkers);

    // Check if we need to scale
    if (desiredWorkers === state.currentWorkers) {
      return { shouldScale: false, targetWorkers: state.currentWorkers, reason: 'no change needed' };
    }

    // Scale up check
    if (desiredWorkers > state.currentWorkers) {
      const timeSinceLastScaleUp = now - state.lastScaleUp;
      if (timeSinceLastScaleUp < this.config.scaleUpCooldownMs) {
        const waitTime = Math.ceil((this.config.scaleUpCooldownMs - timeSinceLastScaleUp) / 1000);
        return {
          shouldScale: false,
          targetWorkers: state.currentWorkers,
          reason: `scale up cooldown (${waitTime}s remaining)`,
        };
      }
      return {
        shouldScale: true,
        targetWorkers: desiredWorkers,
        reason: `queue depth ${totalPending} requires ${desiredWorkers} workers`,
      };
    }

    // Scale down check
    if (desiredWorkers < state.currentWorkers) {
      const timeSinceLastScaleDown = now - state.lastScaleDown;
      if (timeSinceLastScaleDown < this.config.scaleDownCooldownMs) {
        const waitTime = Math.ceil((this.config.scaleDownCooldownMs - timeSinceLastScaleDown) / 1000);
        return {
          shouldScale: false,
          targetWorkers: state.currentWorkers,
          reason: `scale down cooldown (${waitTime}s remaining)`,
        };
      }
      return {
        shouldScale: true,
        targetWorkers: desiredWorkers,
        reason: `queue depth ${totalPending} only needs ${desiredWorkers} workers`,
      };
    }

    return { shouldScale: false, targetWorkers: state.currentWorkers, reason: 'no change needed' };
  }

  private async scaleWorkers(targetWorkers: number, reason: string): Promise<void> {
    const currentWorkers = await this.getCurrentWorkerCount();
    const isScalingUp = targetWorkers > currentWorkers;

    console.log(`🔄 Scaling ${isScalingUp ? 'UP' : 'DOWN'}: ${currentWorkers} → ${targetWorkers} workers`);
    console.log(`   Reason: ${reason}`);

    try {
      await this.setWorkerReplicas(targetWorkers);

      // Update Redis state
      const now = Date.now();
      if (isScalingUp) {
        await this.redis.set(REDIS_KEYS.LAST_SCALE_UP, now.toString());
      } else {
        await this.redis.set(REDIS_KEYS.LAST_SCALE_DOWN, now.toString());
      }
      await this.redis.set(REDIS_KEYS.WORKER_COUNT, targetWorkers.toString());

      // Update per-worker rate limit
      const perWorkerRpm = targetWorkers > 0 ? Math.floor(this.config.globalRpmLimit / targetWorkers) : 0;
      await this.redis.set('worker:config:per_worker_rpm', perWorkerRpm.toString());

      console.log(`✅ Scaled to ${targetWorkers} workers (${perWorkerRpm} RPM each)`);
    } catch (error) {
      console.error('❌ Failed to scale workers:', error);
    }
  }

  // ============================================================================
  // RAILWAY API
  // ============================================================================

  private async getCurrentWorkerCount(): Promise<number> {
    try {
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.railwayToken}`,
        },
        body: JSON.stringify({
          query: `
            query GetServiceInstances($serviceId: String!, $environmentId: String!) {
              service(id: $serviceId) {
                serviceInstances(environmentId: $environmentId) {
                  edges {
                    node {
                      numReplicas
                    }
                  }
                }
              }
            }
          `,
          variables: {
            serviceId: this.config.railwayWorkerServiceId,
            environmentId: this.config.railwayEnvironmentId,
          },
        }),
      });

      const data = (await response.json()) as {
        data?: {
          service?: {
            serviceInstances?: {
              edges?: Array<{ node?: { numReplicas?: number } }>;
            };
          };
        };
      };

      const replicas = data.data?.service?.serviceInstances?.edges?.[0]?.node?.numReplicas ?? 0;
      return replicas;
    } catch (error) {
      console.error('Failed to get worker count from Railway:', error);
      // Fall back to Redis cached value
      const cached = await this.redis.get(REDIS_KEYS.WORKER_COUNT);
      return cached ? parseInt(cached, 10) : 0;
    }
  }

  private async setWorkerReplicas(numReplicas: number): Promise<void> {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.railwayToken}`,
      },
      body: JSON.stringify({
        query: `
          mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
            serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
          }
        `,
        variables: {
          serviceId: this.config.railwayWorkerServiceId,
          environmentId: this.config.railwayEnvironmentId,
          input: {
            numReplicas,
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Railway API error: ${response.status} ${text}`);
    }

    const result = (await response.json()) as { errors?: Array<{ message: string }> };
    if (result.errors) {
      throw new Error(`Railway GraphQL error: ${result.errors.map((e) => e.message).join(', ')}`);
    }
  }

  // ============================================================================
  // POSTGRESQL
  // ============================================================================

  private async getQueueStats(): Promise<{ pending: number; processing: number }> {
    // Use native pg client for simple query (avoid full drizzle setup)
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: this.config.databaseUrl });

    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing
        FROM generation_job
        WHERE status IN ('pending', 'processing')
      `);

      const row = result.rows[0] as { pending: string; processing: string };
      return {
        pending: parseInt(row.pending ?? '0', 10),
        processing: parseInt(row.processing ?? '0', 10),
      };
    } finally {
      await pool.end();
    }
  }

  // ============================================================================
  // REDIS RATE LIMITING
  // ============================================================================

  private async getRpmUsage(): Promise<number> {
    const windowKey = this.getRateLimitWindowKey();
    const count = await this.redis.get(windowKey);
    return count ? parseInt(count, 10) : 0;
  }

  private getRateLimitWindowKey(): string {
    const windowStart = Math.floor(Date.now() / 60000) * 60000; // Round to minute
    return `worker:rpm:${windowStart}`;
  }

  // ============================================================================
  // STATUS / METRICS
  // ============================================================================

  async getStatus(): Promise<{
    status: string;
    workers: number;
    maxWorkers: number;
    queueDepth: number;
    rpmUsage: number;
    rpmLimit: number;
  }> {
    const workers = await this.getCurrentWorkerCount();
    const { pending, processing } = await this.getQueueStats();
    const rpmUsage = await this.getRpmUsage();

    return {
      status: 'healthy',
      workers,
      maxWorkers: this.config.maxWorkers,
      queueDepth: pending + processing,
      rpmUsage,
      rpmLimit: this.config.globalRpmLimit,
    };
  }

  async getMetrics(): Promise<{
    workers_current: number;
    workers_max: number;
    queue_pending: number;
    queue_processing: number;
    rpm_used: number;
    rpm_limit: number;
  }> {
    const workers = await this.getCurrentWorkerCount();
    const { pending, processing } = await this.getQueueStats();
    const rpmUsage = await this.getRpmUsage();

    return {
      workers_current: workers,
      workers_max: this.config.maxWorkers,
      queue_pending: pending,
      queue_processing: processing,
      rpm_used: rpmUsage,
      rpm_limit: this.config.globalRpmLimit,
    };
  }
}
