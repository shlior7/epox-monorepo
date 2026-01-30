/**
 * Database Testkit
 *
 * Provides both MOCK and REAL database testing strategies:
 *
 * ## Strategy 1: Mock (Unit Tests) - Fast, No Dependencies
 * ```ts
 * import { createMockDb, assertAssetCreated } from 'visualizer-db/testkit';
 * const db = createMockDb();
 * await db.generatedAssets.create({ ... });
 * assertAssetCreated(db, { clientId: 'test' });
 * ```
 *
 * ## Strategy 2: Real PostgreSQL (Integration Tests) - Accurate, Requires Docker
 * ```ts
 * import { createRealTestDb, cleanupRealTestDb, truncateAllTables } from 'visualizer-db/testkit';
 * const db = await createRealTestDb();
 * await truncateAllTables(db);
 * // ... run tests with real SQL
 * await cleanupRealTestDb();
 * ```
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { GeneratedAsset, GeneratedAssetCreate } from 'visualizer-types';
import * as schema from './schema/index';

// ============================================================================
// STRATEGY INDICATOR
// ============================================================================

export type TestStrategy = 'mock' | 'real';

export function logTestStrategy(strategy: TestStrategy, context?: string): void {
  const emoji = strategy === 'mock' ? '🧪' : '🐘';
  const label = strategy === 'mock' ? 'MOCK (in-memory)' : 'REAL (PostgreSQL)';
  console.log(`${emoji} Database Strategy: ${label}${context ? ` - ${context}` : ''}`);
}

// ============================================================================
// PART 1: MOCK DATABASE (Fast Unit Tests)
// ============================================================================

let idCounter = 0;

function generateId(prefix = 'test'): string {
  return `${prefix}_${++idCounter}_${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

interface InMemoryStore<T> {
  data: Map<string, T>;
  insertOrder: string[];
}

function createStore<T>(): InMemoryStore<T> {
  return { data: new Map(), insertOrder: [] };
}

export interface MockGeneratedAssetRepository {
  create: (data: GeneratedAssetCreate) => Promise<GeneratedAsset>;
  findById: (id: string) => Promise<GeneratedAsset | null>;
  list: (clientId?: string) => Promise<GeneratedAsset[]>;
  update: (id: string, data: Partial<GeneratedAsset>) => Promise<GeneratedAsset | null>;
  delete: (id: string) => Promise<boolean>;
  findByJobId: (jobId: string) => Promise<GeneratedAsset[]>;
  getAll: () => GeneratedAsset[];
  getById: (id: string) => GeneratedAsset | undefined;
  getCount: () => number;
  getLatest: () => GeneratedAsset | undefined;
  clear: () => void;
}

function createMockGeneratedAssetRepository(store: InMemoryStore<GeneratedAsset>): MockGeneratedAssetRepository {
  return {
    async create(data: GeneratedAssetCreate): Promise<GeneratedAsset> {
      const id = generateId('asset');
      const now = new Date();

      const entity: GeneratedAsset = {
        id,
        clientId: data.clientId,
        generationFlowId: data.generationFlowId ?? null,
        chatSessionId: data.chatSessionId ?? null,
        assetUrl: data.assetUrl,
        originalAssetUrl: data.originalAssetUrl ?? null,
        assetType: data.assetType ?? 'image',
        status: data.status ?? 'completed',
        prompt: data.prompt ?? null,
        settings: data.settings ?? null,
        productIds: data.productIds ?? null,
        jobId: data.jobId ?? null,
        error: data.error ?? null,
        assetAnalysis: data.assetAnalysis ?? null,
        analysisVersion: data.analysisVersion ?? null,
        approvalStatus: data.approvalStatus ?? 'pending',
        approvedAt: data.approvedAt ?? null,
        approvedBy: data.approvedBy ?? null,
        completedAt: data.completedAt ?? new Date(),
        pinned: data.pinned ?? false,
        externalImageId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      store.data.set(id, entity);
      store.insertOrder.push(id);
      return entity;
    },

    async findById(id: string): Promise<GeneratedAsset | null> {
      return store.data.get(id) ?? null;
    },

    async list(clientId?: string): Promise<GeneratedAsset[]> {
      const all = Array.from(store.data.values());
      if (clientId) {
        return all.filter((item) => item.clientId === clientId);
      }
      return all;
    },

    async update(id: string, data: Partial<GeneratedAsset>): Promise<GeneratedAsset | null> {
      const existing = store.data.get(id);
      if (!existing) {
        return null;
      }
      const updated = { ...existing, ...data, updatedAt: new Date() };
      store.data.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      return store.data.delete(id);
    },

    async findByJobId(jobId: string): Promise<GeneratedAsset[]> {
      return Array.from(store.data.values()).filter((a) => a.jobId === jobId);
    },

    getAll(): GeneratedAsset[] {
      return Array.from(store.data.values());
    },

    getById(id: string): GeneratedAsset | undefined {
      return store.data.get(id);
    },

    getCount(): number {
      return store.data.size;
    },

    getLatest(): GeneratedAsset | undefined {
      const lastId = store.insertOrder.at(-1);
      return lastId ? store.data.get(lastId) : undefined;
    },

    clear(): void {
      store.data.clear();
      store.insertOrder.length = 0;
    },
  };
}

export interface MockDatabaseFacade {
  readonly strategy: 'mock';
  generatedAssets: MockGeneratedAssetRepository;
  clearAll: () => void;
  _stores: {
    generatedAssets: InMemoryStore<GeneratedAsset>;
  };
}

/**
 * Create a MOCK database facade for fast unit tests.
 * Does NOT require Docker or PostgreSQL.
 *
 * Use for: Unit tests, fast feedback, testing business logic
 * Do NOT use for: Testing SQL queries, constraints, transactions
 */
export function createMockDb(): MockDatabaseFacade {
  const stores = {
    generatedAssets: createStore<GeneratedAsset>(),
  };

  return {
    strategy: 'mock',
    generatedAssets: createMockGeneratedAssetRepository(stores.generatedAssets),
    clearAll() {
      stores.generatedAssets.data.clear();
      stores.generatedAssets.insertOrder.length = 0;
    },
    _stores: stores,
  };
}

// Singleton mock
let _mockDb: MockDatabaseFacade | null = null;

export function getMockDb(): MockDatabaseFacade {
  _mockDb ??= createMockDb();
  return _mockDb;
}

export function resetMockDb(): void {
  if (_mockDb) {
    _mockDb.clearAll();
  }
  resetIdCounter();
}

// ============================================================================
// PART 2: REAL POSTGRESQL DATABASE (Integration Tests)
// ============================================================================

export type RealTestDb = ReturnType<typeof drizzle<typeof schema>>;

let _realPool: Pool | null = null;
let _realTestDb: RealTestDb | null = null;

/**
 * Get the connection string for test PostgreSQL.
 * Uses docker-compose.test.yml default: localhost:5434
 */
export function getTestConnectionString(): string {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5434/visualizer_test';
}

/**
 * Create a REAL PostgreSQL database connection for integration tests.
 * Requires Docker container to be running.
 *
 * Use for: Integration tests, E2E tests, testing SQL queries
 * Requires: `docker-compose -f docker-compose.test.yml up -d`
 */
export async function createRealTestDb(): Promise<RealTestDb> {
  if (_realTestDb) {
    return _realTestDb;
  }

  const connectionString = getTestConnectionString();
  console.log(`🐘 Connecting to test PostgreSQL: ${connectionString.replace(/:[^@]*@/, ':***@')}`);

  _realPool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Test connection
  try {
    const client = await _realPool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ PostgreSQL connection successful');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw new Error(
      'Failed to connect to test PostgreSQL. Is Docker running?\n' +
        'Run: docker-compose -f packages/visualizer-db/docker-compose.test.yml up -d'
    );
  }

  _realTestDb = drizzle(_realPool, { schema });
  return _realTestDb;
}

/**
 * Get the real test database (must be created first with createRealTestDb)
 */
export function getRealTestDb(): RealTestDb {
  if (!_realTestDb) {
    throw new Error('Real test DB not initialized. Call createRealTestDb() first.');
  }
  return _realTestDb;
}

/**
 * Clean up the real test database connection
 */
export async function cleanupRealTestDb(): Promise<void> {
  if (_realPool) {
    await _realPool.end();
    _realPool = null;
    _realTestDb = null;
    console.log('🧹 PostgreSQL connection closed');
  }
}

/**
 * Truncate all tables for test isolation.
 * Call this in beforeEach() for clean state.
 * Gracefully handles missing tables (schema not pushed).
 */
export async function truncateAllTables(db: RealTestDb): Promise<void> {
  try {
    await db.execute(sql`
      TRUNCATE TABLE
        generated_asset_product,
        favorite_image,
        generated_asset,
        generation_event,
        store_sync_log,
        store_connection,
        message,
        generation_flow,
        collection_session,
        chat_session,
        product_image,
        product,
        member,
        invitation,
        session,
        account,
        verification,
        admin_session,
        admin_user,
        client,
        "user"
    RESTART IDENTITY CASCADE
    `);
  } catch (error) {
    // If tables don't exist (schema not pushed), log warning and continue
    const isTableNotFoundError = error instanceof Error && error.message.includes('does not exist');
    if (isTableNotFoundError) {
      console.warn('⚠️  truncateAllTables: Some tables do not exist. Schema may not be pushed. Skipping truncate.');
    } else {
      throw error;
    }
  }
}

/**
 * Create a test client in the real database
 */
export async function createTestClient(db: RealTestDb, overrides?: Partial<{ name: string; slug: string }>): Promise<string> {
  const id = `client_${Date.now()}`;
  const name = overrides?.name ?? 'Test Client';
  const slug = overrides?.slug ?? `test-client-${Date.now()}`;

  await db.execute(sql`
    INSERT INTO client (id, name, slug, created_at, updated_at, version)
    VALUES (${id}, ${name}, ${slug}, NOW(), NOW(), 1)
  `);

  return id;
}

// ============================================================================
// PART 3: UNIFIED TEST HELPERS
// ============================================================================

/**
 * Unified database interface that works with both mock and real DB
 */
export interface TestDatabase {
  strategy: TestStrategy;
  generatedAssets: {
    create: (data: GeneratedAssetCreate) => Promise<GeneratedAsset>;
    findById: (id: string) => Promise<GeneratedAsset | null>;
    findByJobId: (jobId: string) => Promise<GeneratedAsset[]>;
    getAll: () => GeneratedAsset[] | Promise<GeneratedAsset[]>;
    getCount: () => number | Promise<number>;
  };
  cleanup: () => Promise<void>;
}

/**
 * Create a unified test database with the specified strategy
 */
export async function createTestDatabase(strategy: TestStrategy): Promise<TestDatabase> {
  logTestStrategy(strategy);

  if (strategy === 'mock') {
    const mock = createMockDb();
    return {
      strategy: 'mock',
      generatedAssets: {
        create: mock.generatedAssets.create,
        findById: mock.generatedAssets.findById,
        findByJobId: mock.generatedAssets.findByJobId,
        getAll: () => mock.generatedAssets.getAll(),
        getCount: () => mock.generatedAssets.getCount(),
      },
      cleanup: async () => mock.clearAll(),
    };
  }

  // Real PostgreSQL
  const real = await createRealTestDb();
  const { createDatabaseFacade } = await import('./facade');
  // Cast to satisfy the facade's type requirement (NodePgDatabase is compatible at runtime)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facade = createDatabaseFacade(real as any);

  return {
    strategy: 'real',
    generatedAssets: {
      create: facade.generatedAssets.create.bind(facade.generatedAssets),
      findById: async (id: string) => {
        try {
          return await facade.generatedAssets.requireById(id);
        } catch {
          return null;
        }
      },
      findByJobId: async (jobId: string) => {
        const all = await facade.generatedAssets.list('*');
        return all.filter((a) => a.jobId === jobId);
      },
      getAll: async () => facade.generatedAssets.list('*'),
      getCount: async () => {
        const all = await facade.generatedAssets.list('*');
        return all.length;
      },
    },
    cleanup: async () => {
      await truncateAllTables(real);
    },
  };
}

// ============================================================================
// PART 4: ASSERTION HELPERS (Work with both strategies)
// ============================================================================

/**
 * Assert that a generated asset was created with specific properties
 */
export function assertAssetCreated(db: MockDatabaseFacade, expected: Partial<GeneratedAsset>): GeneratedAsset {
  const assets = db.generatedAssets.getAll();

  const match = assets.find((asset) =>
    Object.entries(expected).every(([key, value]) => {
      const assetValue = asset[key as keyof GeneratedAsset];
      if (Array.isArray(value) && Array.isArray(assetValue)) {
        return JSON.stringify(value) === JSON.stringify(assetValue);
      }
      return assetValue === value;
    })
  );

  if (!match) {
    const actualSummary = assets.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      jobId: a.jobId,
      assetUrl: a.assetUrl.substring(0, 50),
    }));
    throw new Error(
      `Expected asset with ${JSON.stringify(expected)} but none found.\nActual assets: ${JSON.stringify(actualSummary, null, 2)}`
    );
  }

  return match;
}

/**
 * Assert the number of generated assets
 */
export function assertAssetCount(db: MockDatabaseFacade, expected: number): void {
  const actual = db.generatedAssets.getCount();
  if (actual !== expected) {
    throw new Error(`Expected ${expected} assets but found ${actual}`);
  }
}

/**
 * Assert assets were created for a specific job
 */
export function assertJobAssets(db: MockDatabaseFacade, jobId: string, expectedCount: number): GeneratedAsset[] {
  const assets = db.generatedAssets.getAll().filter((a) => a.jobId === jobId);

  if (assets.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} assets for job ${jobId} but found ${assets.length}`);
  }

  return assets;
}

// ============================================================================
// PART 5: TEST DATA GENERATORS
// ============================================================================

/**
 * Generate a test asset creation payload
 */
export function createTestAssetData(overrides?: Partial<GeneratedAssetCreate>): GeneratedAssetCreate {
  return {
    clientId: 'test-client',
    assetUrl: `https://test-cdn.com/images/${Date.now()}.png`,
    assetType: 'image',
    status: 'completed',
    prompt: 'Test prompt',
    ...overrides,
  };
}

// ============================================================================
// PART 6: VITEST SETUP HELPERS
// ============================================================================

/**
 * Setup helpers for vitest integration tests with real PostgreSQL
 */
export function setupRealDbTests() {
  return {
    async beforeAll() {
      await createRealTestDb();
    },
    async beforeEach() {
      const db = getRealTestDb();
      await truncateAllTables(db);
    },
    async afterAll() {
      await cleanupRealTestDb();
    },
  };
}

/**
 * Setup helpers for vitest unit tests with mock database
 */
export function setupMockDbTests() {
  return {
    beforeAll() {
      resetMockDb();
    },
    beforeEach() {
      resetMockDb();
    },
    afterAll() {
      resetMockDb();
    },
  };
}

// ============================================================================
// PART 7: SCHEMA PUSH UTILITIES
// ============================================================================

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Push the full Drizzle schema to any PostgreSQL database.
 * Uses drizzle-kit push internally for schema synchronization.
 *
 * @param connectionString - PostgreSQL connection string (e.g., 'postgresql://user:pass@host:port/db')
 * @example
 * ```ts
 * await pushSchemaToDb('postgresql://test:test@localhost:5435/worker_test');
 * ```
 */
export async function pushSchemaToDb(connectionString: string): Promise<void> {
  // Get the path to visualizer-db package (where drizzle.config.ts lives)
  const currentFile = fileURLToPath(import.meta.url);
  const packageDir = dirname(dirname(currentFile)); // Go up from src/ to package root

  console.log(`📦 Pushing full schema to: ${connectionString.replace(/:[^@]*@/, ':***@')}`);

  try {
    execSync('npx drizzle-kit push --force', {
      cwd: packageDir,
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
      stdio: 'pipe', // Suppress output for cleaner test logs
    });
    console.log('✅ Full schema pushed successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to push schema:', errorMsg);
    throw new Error(`Schema push failed: ${errorMsg}`);
  }
}

/**
 * Tables available for selective testing.
 * These are the table names as defined in the Drizzle schema.
 */
export type WorkerTableName = 'client' | 'generation_job' | 'generated_asset' | 'generated_asset_product';

/**
 * Default tables needed for worker/generation testing.
 * Order matters for FK constraints.
 */
export const WORKER_TABLES: WorkerTableName[] = [
  'client',
  'generation_job',
  'generated_asset',
  'generated_asset_product',
];

/**
 * Push schema and prepare specific tables for testing.
 * Uses drizzle-kit push to sync the full schema (single source of truth),
 * then truncates specified tables for test isolation.
 *
 * @param connectionString - PostgreSQL connection string
 * @param tables - Tables to prepare (truncate) for testing. Defaults to WORKER_TABLES.
 * @example
 * ```ts
 * await pushSchemaAndPrepareTables(
 *   'postgresql://test:test@localhost:5435/worker_test',
 *   ['client', 'generation_job', 'generated_asset']
 * );
 * ```
 */
export async function pushSchemaAndPrepareTables(
  connectionString: string,
  tables: WorkerTableName[] = WORKER_TABLES
): Promise<void> {
  // Push full schema using drizzle-kit (single source of truth)
  await pushSchemaToDb(connectionString);

  // Truncate specified tables for test isolation
  if (tables.length > 0) {
    const pool = new Pool({ connectionString });
    try {
      // Truncate in reverse order to respect FK constraints
      const reversedTables = [...tables].reverse();
      for (const table of reversedTables) {
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
      }
      console.log(`✅ Prepared ${tables.length} tables for testing: ${tables.join(', ')}`);
    } finally {
      await pool.end();
    }
  }
}

/**
 * Truncate specific tables for test isolation without re-pushing schema.
 * Useful for resetting state between tests when schema is already pushed.
 *
 * @param pool - PostgreSQL Pool connection
 * @param tables - Tables to truncate. Defaults to WORKER_TABLES.
 * @example
 * ```ts
 * await truncateTables(pool, ['generation_job', 'generated_asset']);
 * ```
 */
export async function truncateTables(pool: Pool, tables: WorkerTableName[] = WORKER_TABLES): Promise<void> {
  // Truncate in reverse order to respect FK constraints
  const reversedTables = [...tables].reverse();
  for (const table of reversedTables) {
    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

// ============================================================================
// PART 8: E2E PLAYWRIGHT HELPERS
// ============================================================================

/**
 * Clean all data for a client (E2E helper)
 * Useful for ensuring clean state before seeding in E2E tests
 */
export async function cleanClientData(db: ReturnType<typeof drizzle>, clientId: string): Promise<void> {
  const { generatedAsset, generationFlow, collectionSession, product, storeConnection } = schema;

  // Delete in correct order (respect foreign keys)
  await db.delete(generatedAsset).where(sql`${generatedAsset.clientId} = ${clientId}`);
  await db.delete(generationFlow).where(sql`${generationFlow.clientId} = ${clientId}`);
  await db.delete(collectionSession).where(sql`${collectionSession.clientId} = ${clientId}`);
  await db.delete(product).where(sql`${product.clientId} = ${clientId}`);
  await db.delete(storeConnection).where(sql`${storeConnection.clientId} = ${clientId}`);
}

/**
 * Seed products for a client (E2E helper)
 */
export async function seedProducts(
  db: ReturnType<typeof drizzle>,
  clientId: string,
  products: Array<{
    name: string;
    description?: string;
    category?: string;
    source?: 'uploaded' | 'imported';
    storeUrl?: string;
    selectedSceneType?: string;
  }>
): Promise<string[]> {
  const { v4: uuidv4 } = await import('uuid');
  const productIds: string[] = [];

  for (const productData of products) {
    const productId = uuidv4();
    const now = new Date();

    await db.execute(sql`
      INSERT INTO product (
        id, client_id, name, description, category, source, store_url,
        selected_scene_type, is_favorite, version, created_at, updated_at
      )
      VALUES (
        ${productId}, ${clientId}, ${productData.name}, ${productData.description || ''},
        ${productData.category || 'Furniture'}, ${productData.source || 'uploaded'},
        ${productData.storeUrl || null}, ${productData.selectedSceneType || null},
        false, 1, ${now}, ${now}
      )
    `);

    productIds.push(productId);
  }

  return productIds;
}

/**
 * Seed collections for a client (E2E helper)
 */
export async function seedCollections(
  db: ReturnType<typeof drizzle>,
  clientId: string,
  productIds: string[],
  collections: Array<{
    name: string;
    status?: 'draft' | 'generating' | 'completed';
    productCount?: number;
    createFlow?: boolean;
  }>
): Promise<string[]> {
  const { v4: uuidv4 } = await import('uuid');
  const collectionIds: string[] = [];

  for (const collectionData of collections) {
    const collectionId = uuidv4();
    const productCount = collectionData.productCount || 2;
    const collectionProductIds = productIds.slice(0, Math.min(productCount, productIds.length));
    const now = new Date();

    // Insert collection
    await db.execute(sql`
      INSERT INTO collection_session (
        id, client_id, name, status, product_ids, selected_base_images,
        version, created_at, updated_at
      )
      VALUES (
        ${collectionId}, ${clientId}, ${collectionData.name},
        ${collectionData.status || 'draft'}, ${JSON.stringify(collectionProductIds)}::jsonb,
        '{}'::jsonb, 1, ${now}, ${now}
      )
    `);

    collectionIds.push(collectionId);

    // Create a generation flow for the collection (if requested)
    if (collectionData.createFlow !== false) {
      const flowId = uuidv4();
      await db.execute(sql`
        INSERT INTO generation_flow (
          id, collection_session_id, client_id, name, product_ids, settings,
          status, version, created_at, updated_at
        )
        VALUES (
          ${flowId}, ${collectionId}, ${clientId},
          ${collectionData.name + ' - Flow'}, ${JSON.stringify(collectionProductIds)}::jsonb,
          '{}'::jsonb, 'empty', 1, ${now}, ${now}
        )
      `);
    }
  }

  return collectionIds;
}

/**
 * Seed store connection for a client (E2E helper)
 */
export async function seedStoreConnection(
  db: ReturnType<typeof drizzle>,
  clientId: string,
  config: {
    provider: 'shopify' | 'woocommerce';
    storeUrl: string;
    storeName: string;
    status?: 'active' | 'inactive' | 'error';
  }
): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const connectionId = uuidv4();
  const now = new Date();

  await db.execute(sql`
    INSERT INTO store_connection (
      id, client_id, provider, store_url, store_name, status,
      last_sync_at, version, created_at, updated_at
    )
    VALUES (
      ${connectionId}, ${clientId}, ${config.provider}, ${config.storeUrl},
      ${config.storeName}, ${config.status || 'active'}, ${now}, 1, ${now}, ${now}
    )
  `);

  return connectionId;
}

/**
 * Seed generated assets for a client (E2E helper)
 */
export async function seedGeneratedAssets(
  db: ReturnType<typeof drizzle>,
  clientId: string,
  productId: string,
  assets: Array<{
    url: string;
    sceneType?: string;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
  }>
): Promise<string[]> {
  const { v4: uuidv4 } = await import('uuid');
  const assetIds: string[] = [];

  for (const assetData of assets) {
    const assetId = uuidv4();
    const now = new Date();

    await db.execute(sql`
      INSERT INTO generated_asset (
        id, client_id, product_id, url, scene_type, status,
        version, created_at, updated_at
      )
      VALUES (
        ${assetId}, ${clientId}, ${productId}, ${assetData.url},
        ${assetData.sceneType || 'living-room'}, ${assetData.status || 'completed'},
        1, ${now}, ${now}
      )
    `);

    assetIds.push(assetId);
  }

  return assetIds;
}
