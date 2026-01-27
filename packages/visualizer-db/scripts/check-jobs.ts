#!/usr/bin/env tsx
/**
 * Check pending jobs in the database
 */

import { Pool } from 'pg';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();

    // Check for pending jobs
    const pendingResult = await client.query(`
      SELECT id, type, status, priority, scheduled_for, created_at, locked_by
      FROM generation_job
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 10
    `);

    console.log(`\n📋 Pending jobs (${pendingResult.rows.length}):
`);
    if (pendingResult.rows.length === 0) {
      console.log('  ✅ No pending jobs');
    } else {
      pendingResult.rows.forEach((row) => {
        const now = new Date();
        const scheduledFor = new Date(row.scheduled_for);
        const isReady = scheduledFor <= now;
        console.log(`  ${isReady ? '🟢' : '🔴'} ${row.id}`);
        console.log(`     Type: ${row.type}`);
        console.log(`     Status: ${row.status}`);
        console.log(`     Scheduled for: ${scheduledFor.toISOString()} ${isReady ? '(READY)' : '(NOT YET)'}`);
        console.log(`     Created: ${new Date(row.created_at).toISOString()}`);
        console.log();
      });
    }

    // Check all job statuses
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count
      FROM generation_job
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n📊 Job status summary:');
    statusResult.rows.forEach((row) => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    client.release();
  } finally {
    await pool.end();
  }
}

main();
