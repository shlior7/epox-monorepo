#!/usr/bin/env tsx
/**
 * Check if LISTEN/NOTIFY triggers are installed
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

    // Check for triggers
    const triggersResult = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'generation_job'
    `);

    console.log('\n📋 Triggers on generation_job table:');
    if (triggersResult.rows.length === 0) {
      console.log('  ⚠️  No triggers found');
    } else {
      triggersResult.rows.forEach((row) => {
        console.log(`  ✅ ${row.trigger_name} (${row.event_manipulation})`);
      });
    }

    // Check for functions
    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%generation_job%' OR routine_name LIKE '%notify%'
    `);

    console.log('\n🔧 Notification functions:');
    if (functionsResult.rows.length === 0) {
      console.log('  ⚠️  No functions found');
    } else {
      functionsResult.rows.forEach((row) => {
        console.log(`  ✅ ${row.routine_name}()`);
      });
    }

    client.release();
  } finally {
    await pool.end();
  }
}

main();
