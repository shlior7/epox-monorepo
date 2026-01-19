/**
 * Global Test Setup
 * Runs once before all tests - starts Docker container and pushes schema
 */

import { execSync, spawn } from 'child_process';
import { getTestPool, closeTestDb, getTestConnectionString } from './test-client';

const DOCKER_COMPOSE_FILE = 'docker-compose.test.yml';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForPostgres(): Promise<void> {
  const pool = getTestPool();

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('PostgreSQL is ready!');
      return;
    } catch (error) {
      if (i === MAX_RETRIES - 1) {
        throw new Error(`PostgreSQL not ready after ${MAX_RETRIES} retries: ${error}`);
      }
      console.log(`Waiting for PostgreSQL... (${i + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function pushSchema(): Promise<void> {
  console.log('Pushing schema to test database...');

  // Run drizzle-kit push with pgTAP workaround
  const env = {
    ...process.env,
    DATABASE_URL: getTestConnectionString(),
  };

  try {
    // Drop pgTAP extension before push
    execSync('docker exec visualizer-db-test psql -U test -d visualizer_test -c "DROP EXTENSION IF EXISTS pgtap CASCADE"', {
      stdio: 'pipe',
    });

    // Push schema
    execSync('npx drizzle-kit push --force', {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });

    // Recreate pgTAP extension for pgTAP tests (optional - may not be available)
    try {
      execSync('docker exec visualizer-db-test psql -U test -d visualizer_test -c "CREATE EXTENSION IF NOT EXISTS pgtap"', {
        stdio: 'pipe',
      });
    } catch {
      console.log('Note: pgTAP extension not available (optional for pgTAP-based tests)');
    }
  } catch (error) {
    console.error('Failed to push schema:', error);
    throw error;
  }

  console.log('Schema pushed successfully!');
}

export async function setup(): Promise<void> {
  console.log('\n🔧 Setting up test environment...\n');

  // Check if Docker is available
  try {
    execSync('docker info', { stdio: 'pipe' });
  } catch {
    throw new Error(
      'Docker is not running. Please start Docker (Rancher Desktop) and try again.'
    );
  }

  // Start the test database container
  console.log('Starting PostgreSQL container...');
  try {
    execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} up -d`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to start Docker container:', error);
    throw error;
  }

  // Wait for PostgreSQL to be ready
  await waitForPostgres();

  // Push schema
  await pushSchema();

  console.log('\n✅ Test environment ready!\n');
}

export async function teardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Close the database connection
  await closeTestDb();

  // Stop the test database container (but keep the volume for faster restarts)
  try {
    execSync(`docker compose -f ${DOCKER_COMPOSE_FILE} down`, {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Failed to stop Docker container:', error);
  }

  console.log('\n✅ Cleanup complete!\n');
}
