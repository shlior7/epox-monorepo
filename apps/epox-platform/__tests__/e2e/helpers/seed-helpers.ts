/**
 * E2E Test Seed Helpers
 * These helpers seed data into the test database for E2E tests
 */

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema-tables';

type TestDb = NodePgDatabase<typeof schema>;

/**
 * Clean all data for a client (E2E helper)
 * Useful for ensuring clean state before seeding in E2E tests
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
 * Seed products for a client (E2E helper)
 */
export async function seedProducts(
  db: TestDb,
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
  db: TestDb,
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

  return connectionId;
}

/**
 * Seed generated assets for a client (E2E helper)
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

  return assetIds;
}
