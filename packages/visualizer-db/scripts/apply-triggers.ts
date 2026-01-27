#!/usr/bin/env tsx
/**
 * Apply database triggers for LISTEN/NOTIFY
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const __dirname = new URL('.', import.meta.url).pathname;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '../sql-migrations/005_add_job_notify_trigger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Applying trigger migration...');
    await client.query(migrationSQL);

    console.log('✅ Trigger migration applied successfully!');

    client.release();
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
