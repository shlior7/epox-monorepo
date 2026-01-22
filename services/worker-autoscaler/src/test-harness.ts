/**
 * Test Harness for Worker Autoscaler System
 *
 * Tests autoscaling decisions and Redis rate limiting without calling Railway API.
 * Uses local Docker containers for Redis and PostgreSQL.
 *
 * Usage:
 *   docker compose -f docker-compose.test.yml up -d
 *   tsx src/test-harness.ts
 */

import Redis from 'ioredis';
import pg from 'pg';
const { Pool } = pg;

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  redisUrl: process.env.TEST_REDIS_URL ?? 'redis://localhost:6380',
  databaseUrl:
    process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5435/worker_test',
  globalRpmLimit: 60,
  maxWorkers: 5,
  minWorkers: 0,
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface ScalingDecision {
  queueDepth: number;
  currentWorkers: number;
  desiredWorkers: number;
  reason: string;
}

interface RateLimitState {
  used: number;
  limit: number;
  remaining: number;
  perWorkerRpm: number;
}

class TestHarness {
  private redis: Redis;
  private pool: Pool;
  private simulatedWorkerCount = 0;
  private scalingHistory: ScalingDecision[] = [];

  constructor() {
    this.redis = new Redis(TEST_CONFIG.redisUrl);
    this.pool = new Pool({ connectionString: TEST_CONFIG.databaseUrl });
  }

  async setup(): Promise<void> {
    console.log('🔧 Setting up test harness...');

    // Clear Redis
    await this.redis.flushall();

    // Clear jobs table
    await this.pool.query('DELETE FROM generation_job');

    // Initialize Redis config (like autoscaler does)
    await this.redis.set('worker:config:rpm_limit', TEST_CONFIG.globalRpmLimit.toString());
    await this.redis.set('worker:config:max_workers', TEST_CONFIG.maxWorkers.toString());
    await this.redis.set('worker:config:per_worker_rpm', TEST_CONFIG.globalRpmLimit.toString());

    this.simulatedWorkerCount = 0;
    this.scalingHistory = [];

    console.log('✅ Test harness ready\n');
  }

  async teardown(): Promise<void> {
    await this.redis.quit();
    await this.pool.end();
  }

  // ---------------------------------------------------------------------------
  // JOB MANAGEMENT
  // ---------------------------------------------------------------------------

  async createJobs(count: number, status: 'pending' | 'processing' = 'pending'): Promise<void> {
    const values = Array.from(
      { length: count },
      (_, i) => `('job-${Date.now()}-${i}', '${status}')`
    ).join(',');

    if (count > 0) {
      await this.pool.query(`INSERT INTO generation_job (id, status) VALUES ${values}`);
    }
  }

  async getQueueStats(): Promise<{ pending: number; processing: number }> {
    const result = await this.pool.query(`
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
  }

  async clearJobs(): Promise<void> {
    await this.pool.query('DELETE FROM generation_job');
  }

  // ---------------------------------------------------------------------------
  // AUTOSCALING SIMULATION
  // ---------------------------------------------------------------------------

  calculateDesiredWorkers(queueDepth: number): number {
    if (queueDepth === 0) return TEST_CONFIG.minWorkers;
    if (queueDepth <= 10) return Math.max(1, TEST_CONFIG.minWorkers);
    if (queueDepth <= 30) return 2;
    if (queueDepth <= 60) return 3;
    if (queueDepth <= 100) return 4;
    return TEST_CONFIG.maxWorkers;
  }

  async simulateAutoscalerDecision(): Promise<ScalingDecision> {
    const { pending, processing } = await this.getQueueStats();
    const queueDepth = pending + processing;
    const desiredWorkers = this.calculateDesiredWorkers(queueDepth);

    let reason: string;
    if (desiredWorkers === this.simulatedWorkerCount) {
      reason = 'no change needed';
    } else if (desiredWorkers > this.simulatedWorkerCount) {
      reason = `scale up: queue depth ${queueDepth} requires ${desiredWorkers} workers`;
    } else {
      reason = `scale down: queue depth ${queueDepth} only needs ${desiredWorkers} workers`;
    }

    const decision: ScalingDecision = {
      queueDepth,
      currentWorkers: this.simulatedWorkerCount,
      desiredWorkers,
      reason,
    };

    // Apply scaling (simulated)
    if (desiredWorkers !== this.simulatedWorkerCount) {
      this.simulatedWorkerCount = desiredWorkers;

      // Update Redis per-worker RPM
      const perWorkerRpm =
        desiredWorkers > 0 ? Math.floor(TEST_CONFIG.globalRpmLimit / desiredWorkers) : 0;
      await this.redis.set('worker:config:per_worker_rpm', perWorkerRpm.toString());
      await this.redis.set('worker:count', desiredWorkers.toString());
    }

    this.scalingHistory.push(decision);
    return decision;
  }

  // ---------------------------------------------------------------------------
  // RATE LIMITING SIMULATION
  // ---------------------------------------------------------------------------

  async getRateLimitState(): Promise<RateLimitState> {
    const windowStart = Math.floor(Date.now() / 60000) * 60000;
    const windowKey = `worker:rpm:${windowStart}`;

    const [used, limit, perWorkerRpm] = await Promise.all([
      this.redis.get(windowKey).then((v) => parseInt(v ?? '0', 10)),
      this.redis.get('worker:config:rpm_limit').then((v) => parseInt(v ?? '60', 10)),
      this.redis.get('worker:config:per_worker_rpm').then((v) => parseInt(v ?? '60', 10)),
    ]);

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      perWorkerRpm,
    };
  }

  async simulateRateLimitConsume(count: number = 1): Promise<void> {
    const windowStart = Math.floor(Date.now() / 60000) * 60000;
    const windowKey = `worker:rpm:${windowStart}`;

    for (let i = 0; i < count; i++) {
      const newCount = await this.redis.incr(windowKey);
      if (newCount === 1) {
        await this.redis.expire(windowKey, 65); // 60s + buffer
      }
    }
  }

  async canProcessJob(): Promise<boolean> {
    const state = await this.getRateLimitState();
    return state.used < state.limit;
  }

  // ---------------------------------------------------------------------------
  // TEST ASSERTIONS
  // ---------------------------------------------------------------------------

  getScalingHistory(): ScalingDecision[] {
    return this.scalingHistory;
  }

  getCurrentWorkerCount(): number {
    return this.simulatedWorkerCount;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function runTests(): Promise<void> {
  const harness = new TestHarness();
  const results: TestResult[] = [];

  console.log('🧪 Starting Worker Autoscaler Integration Tests\n');
  console.log('='.repeat(60) + '\n');

  try {
    // -------------------------------------------------------------------------
    // Test 1: Scaling with varying job counts
    // -------------------------------------------------------------------------
    console.log('📊 Test 1: Autoscaling decisions for various job counts\n');

    const scalingTests = [
      { jobs: 0, expectedWorkers: 0 },
      { jobs: 1, expectedWorkers: 1 },
      { jobs: 10, expectedWorkers: 1 },
      { jobs: 11, expectedWorkers: 2 },
      { jobs: 30, expectedWorkers: 2 },
      { jobs: 31, expectedWorkers: 3 },
      { jobs: 50, expectedWorkers: 3 },
      { jobs: 60, expectedWorkers: 3 },
      { jobs: 61, expectedWorkers: 4 },
      { jobs: 100, expectedWorkers: 4 },
      { jobs: 101, expectedWorkers: 5 },
      { jobs: 500, expectedWorkers: 5 },
      { jobs: 1000, expectedWorkers: 5 },
    ];

    for (const test of scalingTests) {
      await harness.setup();
      await harness.createJobs(test.jobs);

      const decision = await harness.simulateAutoscalerDecision();
      const passed = decision.desiredWorkers === test.expectedWorkers;

      results.push({
        name: `Scale to ${test.expectedWorkers} workers for ${test.jobs} jobs`,
        passed,
        details: passed
          ? `✅ Correctly scaled to ${decision.desiredWorkers} workers`
          : `❌ Expected ${test.expectedWorkers}, got ${decision.desiredWorkers}`,
      });

      console.log(
        `  ${test.jobs.toString().padStart(4)} jobs → ${decision.desiredWorkers} workers ${passed ? '✅' : '❌'}`
      );
    }

    console.log();

    // -------------------------------------------------------------------------
    // Test 2: Rate limiting with different worker counts
    // -------------------------------------------------------------------------
    console.log('📊 Test 2: Rate limiting with different worker counts\n');

    const rpmTests = [
      { workers: 1, expectedPerWorkerRpm: 60 },
      { workers: 2, expectedPerWorkerRpm: 30 },
      { workers: 3, expectedPerWorkerRpm: 20 },
      { workers: 4, expectedPerWorkerRpm: 15 },
      { workers: 5, expectedPerWorkerRpm: 12 },
    ];

    await harness.setup();

    for (const test of rpmTests) {
      // Create enough jobs to trigger the desired worker count
      await harness.clearJobs();
      const jobsNeeded =
        test.workers === 1 ? 5 : test.workers === 2 ? 20 : test.workers === 3 ? 50 : test.workers === 4 ? 80 : 150;

      await harness.createJobs(jobsNeeded);
      await harness.simulateAutoscalerDecision();

      const state = await harness.getRateLimitState();
      const passed = state.perWorkerRpm === test.expectedPerWorkerRpm;

      results.push({
        name: `Per-worker RPM with ${test.workers} workers`,
        passed,
        details: passed
          ? `✅ Correctly set to ${state.perWorkerRpm} RPM per worker`
          : `❌ Expected ${test.expectedPerWorkerRpm}, got ${state.perWorkerRpm}`,
      });

      console.log(
        `  ${test.workers} workers → ${state.perWorkerRpm} RPM/worker (global: ${state.limit}) ${passed ? '✅' : '❌'}`
      );
    }

    console.log();

    // -------------------------------------------------------------------------
    // Test 3: Rate limit enforcement
    // -------------------------------------------------------------------------
    console.log('📊 Test 3: Rate limit enforcement\n');

    await harness.setup();

    // Simulate consuming rate limit
    const consumeTests = [
      { consume: 0, shouldAllow: true },
      { consume: 30, shouldAllow: true },
      { consume: 59, shouldAllow: true },
      { consume: 60, shouldAllow: false },
      { consume: 100, shouldAllow: false },
    ];

    for (const test of consumeTests) {
      await harness.setup(); // Reset each time
      if (test.consume > 0) {
        await harness.simulateRateLimitConsume(test.consume);
      }

      const canProcess = await harness.canProcessJob();
      const passed = canProcess === test.shouldAllow;

      results.push({
        name: `Rate limit after ${test.consume} requests`,
        passed,
        details: passed
          ? `✅ Correctly ${test.shouldAllow ? 'allowed' : 'blocked'}`
          : `❌ Expected ${test.shouldAllow ? 'allow' : 'block'}, got ${canProcess ? 'allow' : 'block'}`,
      });

      console.log(
        `  After ${test.consume.toString().padStart(3)} requests: ${canProcess ? 'ALLOW' : 'BLOCK'} ${passed ? '✅' : '❌'}`
      );
    }

    console.log();

    // -------------------------------------------------------------------------
    // Test 4: Dynamic RPM configuration
    // -------------------------------------------------------------------------
    console.log('📊 Test 4: Dynamic RPM configuration\n');

    const rpmConfigs = [30, 60, 120];

    for (const rpm of rpmConfigs) {
      await harness.setup();
      await harness.redis.set('worker:config:rpm_limit', rpm.toString());
      await harness.redis.set('worker:config:per_worker_rpm', rpm.toString());

      // Consume just under the limit
      await harness.simulateRateLimitConsume(rpm - 1);
      const canProcessBefore = await harness.canProcessJob();

      // Consume one more (at limit)
      await harness.simulateRateLimitConsume(1);
      const canProcessAfter = await harness.canProcessJob();

      const passed = canProcessBefore === true && canProcessAfter === false;

      results.push({
        name: `RPM limit enforcement at ${rpm}`,
        passed,
        details: passed
          ? `✅ Correctly enforced limit at ${rpm}`
          : `❌ Failed: before=${canProcessBefore}, after=${canProcessAfter}`,
      });

      console.log(`  RPM ${rpm}: allow at ${rpm - 1}, block at ${rpm} ${passed ? '✅' : '❌'}`);
    }

    console.log();

    // -------------------------------------------------------------------------
    // Test 5: Scale up/down sequence
    // -------------------------------------------------------------------------
    console.log('📊 Test 5: Scale up/down sequence\n');

    await harness.setup();

    const sequence = [
      { jobs: 0, expected: 0, action: 'start empty' },
      { jobs: 50, expected: 3, action: 'burst of jobs' },
      { jobs: 100, expected: 4, action: 'more jobs' },
      { jobs: 500, expected: 5, action: 'heavy load' },
      { jobs: 30, expected: 2, action: 'jobs completing' },
      { jobs: 5, expected: 1, action: 'almost done' },
      { jobs: 0, expected: 0, action: 'all done' },
    ];

    let allPassed = true;
    for (const step of sequence) {
      await harness.clearJobs();
      await harness.createJobs(step.jobs);
      const decision = await harness.simulateAutoscalerDecision();
      const passed = decision.desiredWorkers === step.expected;
      allPassed = allPassed && passed;

      console.log(
        `  ${step.action.padEnd(20)} → ${step.jobs.toString().padStart(3)} jobs → ${decision.desiredWorkers} workers ${passed ? '✅' : '❌'}`
      );
    }

    results.push({
      name: 'Scale up/down sequence',
      passed: allPassed,
      details: allPassed ? '✅ All scaling steps correct' : '❌ Some steps failed',
    });

    console.log();
  } finally {
    await harness.teardown();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('='.repeat(60));
  console.log('\n📋 TEST SUMMARY\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`  Total:  ${results.length}`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log();

  if (failed > 0) {
    console.log('Failed tests:');
    for (const result of results.filter((r) => !r.passed)) {
      console.log(`  - ${result.name}: ${result.details}`);
    }
    console.log();
  }

  console.log(failed === 0 ? '🎉 All tests passed!' : '💥 Some tests failed!');
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runTests().catch((err) => {
  console.error('Test harness error:', err);
  process.exit(1);
});
