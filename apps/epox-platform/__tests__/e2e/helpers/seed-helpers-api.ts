/**
 * E2E Test Seed Helpers - API-Based
 *
 * Uses the actual application APIs to create test data.
 * This ensures:
 * - All business logic, validation, and hooks are executed
 * - Data is created exactly as it would be in production
 * - API endpoints are tested as part of E2E tests
 */

import type { Page } from '@playwright/test';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema-tables';

type TestDb = NodePgDatabase<typeof schema>;

const BASE_URL = 'http://localhost:3000';

/**
 * Clean all data for a client (direct DB access)
 * This is the only operation that goes direct to DB since there's no DELETE API
 */
export async function cleanClientData(db: TestDb, clientId: string): Promise<void> {
  const { generatedAsset, generationFlow, collectionSession, product, storeConnection } = schema;

  // Delete in correct order (respect foreign keys)
  await db.delete(generatedAsset).where(sql`${generatedAsset.clientId} = ${clientId}`);
  await db.delete(generationFlow).where(sql`${generationFlow.clientId} = ${clientId}`);
  await db.delete(collectionSession).where(sql`${collectionSession.clientId} = ${clientId}`);
  await db.delete(product).where(sql`${product.clientId} = ${clientId}`);
  await db.delete(storeConnection).where(sql`${storeConnection.clientId} = ${clientId}`);
}

/**
 * Helper to get auth cookies from the page context
 */
async function getAuthCookies(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
}

/**
 * Seed products using POST /api/products (tests the actual API)
 */
export async function seedProductsViaAPI(
  page: Page,
  products: Array<{
    name: string;
    description?: string;
    category?: string;
    sceneTypes?: string[];
    price?: number;
  }>
): Promise<string[]> {
  const productIds: string[] = [];
  const cookies = await getAuthCookies(page);

  for (const productData of products) {
    const response = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        name: productData.name,
        description: productData.description || '',
        category: productData.category || 'Furniture',
        sceneTypes: productData.sceneTypes || [],
        price: productData.price || 0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create product ${productData.name}: ${response.status} ${error}`);
    }

    const created = await response.json();
    productIds.push(created.id);
    console.log(`  ✅ Created product via API: ${productData.name} (${created.id})`);
  }

  return productIds;
}

/**
 * Seed collections using POST /api/collections (tests the actual API)
 */
export async function seedCollectionsViaAPI(
  page: Page,
  productIds: string[],
  collections: Array<{
    name: string;
    productCount?: number;
  }>
): Promise<string[]> {
  const collectionIds: string[] = [];
  const cookies = await getAuthCookies(page);

  for (const collectionData of collections) {
    const productCount = collectionData.productCount || 2;
    const collectionProductIds = productIds.slice(0, Math.min(productCount, productIds.length));

    const response = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        name: collectionData.name,
        productIds: collectionProductIds,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create collection ${collectionData.name}: ${response.status} ${error}`);
    }

    const created = await response.json();
    collectionIds.push(created.id);
    console.log(`  ✅ Created collection via API: ${collectionData.name} (${created.id})`);
    console.log(`     - With ${collectionProductIds.length} products`);
  }

  return collectionIds;
}

/**
 * Seed store connection using direct DB (no API endpoint yet)
 * TODO: Create POST /api/store/connection endpoint and use it here
 */
export async function seedStoreConnection(
  db: TestDb,
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

  console.log(`  ✅ Created store connection: ${config.storeName} (${connectionId})`);
  return connectionId;
}

/**
 * Seed generated assets using direct DB (no API endpoint for test data generation)
 */
export async function seedGeneratedAssets(
  db: TestDb,
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

  console.log(`  ✅ Created ${assetIds.length} generated assets for product ${productId}`);
  return assetIds;
}
