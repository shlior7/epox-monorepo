/**
 * Global Test Setup
 * Runs once before all tests - starts Docker container and pushes schema
 *
 * Performance optimizations:
 * - Keeps container running between test runs
 * - Only pushes schema if tables don't exist
 * - Uses direct psql for faster schema checks
 */

import { execSync } from 'child_process';
import { getTestPool, closeTestDb, getTestConnectionString } from './test-client';

const DOCKER_COMPOSE_FILE = 'docker-compose.test.yml';
const MAX_RETRIES = 30;
const RETRY_DELAY = 500; // Reduced from 1000ms

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
      if (i % 5 === 0) {
        console.log(`Waiting for PostgreSQL... (${i + 1}/${MAX_RETRIES})`);
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function schemaExists(): Promise<boolean> {
  const pool = getTestPool();
  try {
    const client = await pool.connect();
    // Check if a core table exists (collection_session has the settings column we need)
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'collection_session'
        AND column_name = 'settings'
      ) as has_settings
    `);
    client.release();
    return result.rows[0]?.has_settings === true;
  } catch {
    return false;
  }
}

async function pushSchema(): Promise<void> {
  console.log('Pushing schema to test database...');

  try {
    // Push schema using --force to auto-approve all changes (safe for test DB)
    const env = {
      ...process.env,
      DATABASE_URL: getTestConnectionString(),
    };

    execSync('npx drizzle-kit push --force', {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
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
    throw new Error('Docker is not running. Please start Docker and try again.');
  }

  // Check if container is already running
  let containerRunning = false;
  try {
    const result = execSync('docker ps --filter "name=visualizer-db-test" --format "{{.Names}}"', {
      encoding: 'utf-8',
    }).trim();
    containerRunning = result === 'visualizer-db-test';
  } catch {
    containerRunning = false;
  }

  if (containerRunning) {
    console.log('PostgreSQL container already running');
  } else {
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
  }

  // Wait for PostgreSQL to be ready
  await waitForPostgres();

  // Only push schema if needed (check for settings column which was recently added)
  const hasSchema = await schemaExists();
  if (hasSchema) {
    console.log('Schema already exists, skipping push');
  } else {
    await pushSchema();
  }

  console.log('\n✅ Test environment ready!\n');
}

export async function teardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Close the database connection pool
  await closeTestDb();

  // DON'T stop the container - keep it running for faster subsequent test runs
  // User can manually stop it with: docker compose -f docker-compose.test.yml down
  console.log('Note: PostgreSQL container left running for faster subsequent runs.');
  console.log('To stop: cd packages/visualizer-db && docker compose -f docker-compose.test.yml down\n');

  console.log('✅ Cleanup complete!\n');
}
