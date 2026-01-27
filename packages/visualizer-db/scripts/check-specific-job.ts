#!/usr/bin/env tsx
/**
 * Check a specific job by ID
 */

import { Pool } from 'pg';

async function main() {
  const jobId = process.argv[2];

  if (!jobId) {
    console.error('Usage: tsx check-specific-job.ts <job-id>');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT *
      FROM generation_job
      WHERE id = $1
    `, [jobId]);

    if (result.rows.length === 0) {
      console.log(`❌ Job ${jobId} not found`);
    } else {
      const job = result.rows[0];
      console.log(`\n📦 Job: ${job.id}`);
      console.log(`   Type: ${job.type}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Priority: ${job.priority}`);
      console.log(`   Progress: ${job.progress}%`);
      console.log(`   Attempts: ${job.attempts}/${job.max_attempts}`);
      console.log(`   Locked by: ${job.locked_by || 'none'}`);
      console.log(`   Locked at: ${job.locked_at || 'never'}`);
      console.log(`   Scheduled for: ${job.scheduled_for}`);
      console.log(`   Created at: ${job.created_at}`);
      console.log(`   Started at: ${job.started_at || 'not started'}`);
      console.log(`   Completed at: ${job.completed_at || 'not completed'}`);
      console.log(`   Error: ${job.error || 'none'}`);
      console.log(`   Result: ${job.result ? JSON.stringify(job.result, null, 2) : 'none'}`);
    }

    client.release();
  } finally {
    await pool.end();
  }
}

main();
