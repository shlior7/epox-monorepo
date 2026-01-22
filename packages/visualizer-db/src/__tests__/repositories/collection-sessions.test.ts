/**
 * Collection Sessions Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollectionSessionRepository } from '../../repositories/collection-sessions';
import { testDb } from '../setup';
import { createTestClient, createTestProduct, createTestId } from '../helpers';
import { sql } from 'drizzle-orm';

describe('CollectionSessionRepository', () => {
  let repo: CollectionSessionRepository;
  let testClientId: string;
  let testProductIds: string[];

  beforeEach(async () => {
    repo = new CollectionSessionRepository(testDb as any);

    // Create test data
    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    // Create test products
    const product1 = await createTestProduct(testDb as any, testClientId, { name: 'Product 1' });
    const product2 = await createTestProduct(testDb as any, testClientId, { name: 'Product 2' });
    testProductIds = [product1.id, product2.id];
  });

  // Helper to create a flow and assets for a collection
  async function createFlowWithAssets(
    collectionId: string,
    options: { completedCount?: number; pendingCount?: number } = {}
  ) {
    const flowId = createTestId('flow');
    await testDb.execute(sql`
      INSERT INTO generation_flow (id, client_id, collection_session_id, name, status, product_ids, selected_base_images, settings, version, created_at, updated_at)
      VALUES (${flowId}, ${testClientId}, ${collectionId}, 'Test Flow', 'pending', ${JSON.stringify(testProductIds)}::jsonb, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW())
    `);

    // Create completed assets
    for (let i = 0; i < (options.completedCount ?? 0); i++) {
      const assetId = createTestId('asset');
      await testDb.execute(sql`
        INSERT INTO generated_asset (id, client_id, generation_flow_id, asset_url, asset_type, status, product_ids, created_at, updated_at)
        VALUES (${assetId}, ${testClientId}, ${flowId}, ${'https://example.com/' + assetId + '.png'}, 'image', 'completed', ${JSON.stringify(testProductIds)}::jsonb, NOW(), NOW())
      `);
    }

    // Create pending assets
    for (let i = 0; i < (options.pendingCount ?? 0); i++) {
      const assetId = createTestId('asset');
      await testDb.execute(sql`
        INSERT INTO generated_asset (id, client_id, generation_flow_id, asset_url, asset_type, status, product_ids, created_at, updated_at)
        VALUES (${assetId}, ${testClientId}, ${flowId}, '', 'image', 'pending', ${JSON.stringify(testProductIds)}::jsonb, NOW(), NOW())
      `);
    }

    return flowId;
  }

  describe('create', () => {
    it('should create a collection session', async () => {
      const collection = await repo.create(testClientId, {
        name: 'Test Collection',
        productIds: testProductIds,
        status: 'draft',
      });

      expect(collection).toBeDefined();
      expect(collection.id).toBeDefined();
      expect(collection.name).toBe('Test Collection');
      expect(collection.productIds).toEqual(testProductIds);
      expect(collection.status).toBe('draft');
    });

    it('should create collection with settings', async () => {
      const collection = await repo.create(testClientId, {
        name: 'With Settings',
        productIds: testProductIds,
        settings: { inspirationImages: [], aspectRatio: '16:9' },
      });

      expect(collection.settings).toMatchObject({ aspectRatio: '16:9' });
    });
  });

  describe('getById', () => {
    it('should return collection by ID', async () => {
      const created = await repo.create(testClientId, {
        name: 'Test',
        productIds: testProductIds,
      });

      const found = await repo.getById(created.id);
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update collection fields', async () => {
      const created = await repo.create(testClientId, {
        name: 'Original',
        productIds: testProductIds,
        status: 'draft',
      });

      const updated = await repo.update(created.id, {
        name: 'Updated',
        status: 'generating',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.status).toBe('generating');
    });
  });

  describe('list', () => {
    it('should list all collections for client', async () => {
      await repo.create(testClientId, { name: 'Collection 1', productIds: [] });
      await repo.create(testClientId, { name: 'Collection 2', productIds: [] });

      const collections = await repo.list(testClientId);
      expect(collections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('listWithFilters', () => {
    beforeEach(async () => {
      await repo.create(testClientId, { name: 'Draft Collection', productIds: testProductIds, status: 'draft' });
      await repo.create(testClientId, { name: 'Generating Collection', productIds: testProductIds, status: 'generating' });
      await repo.create(testClientId, { name: 'Completed Collection', productIds: testProductIds, status: 'completed' });
    });

    it('should filter by status', async () => {
      const drafts = await repo.listWithFilters(testClientId, { status: 'draft' });
      expect(drafts.every(c => c.status === 'draft')).toBe(true);
    });

    it('should filter by search term', async () => {
      const results = await repo.listWithFilters(testClientId, { search: 'Draft' });
      expect(results.some(c => c.name.includes('Draft'))).toBe(true);
    });

    it('should sort by name', async () => {
      const sorted = await repo.listWithFilters(testClientId, { sort: 'name' });
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].name.localeCompare(sorted[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should sort by recent (default)', async () => {
      const sorted = await repo.listWithFilters(testClientId, { sort: 'recent' });
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].updatedAt.getTime()).toBeGreaterThanOrEqual(sorted[i].updatedAt.getTime());
      }
    });

    it('should respect limit and offset', async () => {
      const page1 = await repo.listWithFilters(testClientId, { limit: 2, offset: 0 });
      const page2 = await repo.listWithFilters(testClientId, { limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      if (page2.length > 0) {
        expect(page1.some(c => c.id === page2[0]?.id)).toBe(false);
      }
    });
  });

  describe('listWithAssetStats', () => {
    it('should include asset stats', async () => {
      const collection = await repo.create(testClientId, {
        name: 'With Assets',
        productIds: testProductIds,
        status: 'generating',
      });

      await createFlowWithAssets(collection.id, { completedCount: 3, pendingCount: 2 });

      const results = await repo.listWithAssetStats(testClientId);
      const found = results.find(c => c.id === collection.id);

      expect(found).toBeDefined();
      expect(found?.totalImages).toBe(5);
      expect(found?.completedCount).toBe(3);
      expect(found?.generatingCount).toBe(2);
    });

    it('should filter by status', async () => {
      await repo.create(testClientId, { name: 'Draft', productIds: [], status: 'draft' });
      await repo.create(testClientId, { name: 'Generating', productIds: [], status: 'generating' });

      const drafts = await repo.listWithAssetStats(testClientId, { status: 'draft' });
      expect(drafts.every(c => c.status === 'draft')).toBe(true);
    });

    it('should filter by search', async () => {
      await repo.create(testClientId, { name: 'Searchable Name', productIds: [] });

      const results = await repo.listWithAssetStats(testClientId, { search: 'Searchable' });
      expect(results.some(c => c.name.includes('Searchable'))).toBe(true);
    });

    it('should sort correctly', async () => {
      await repo.create(testClientId, { name: 'Alpha', productIds: [] });
      await repo.create(testClientId, { name: 'Beta', productIds: [] });

      const byName = await repo.listWithAssetStats(testClientId, { sort: 'name' });
      const names = byName.map(c => c.name);
      expect(names).toEqual([...names].sort());
    });

    it('should return empty stats for collections without assets', async () => {
      const collection = await repo.create(testClientId, { name: 'Empty', productIds: [] });

      const results = await repo.listWithAssetStats(testClientId);
      const found = results.find(c => c.id === collection.id);

      expect(found?.totalImages).toBe(0);
      expect(found?.completedCount).toBe(0);
      expect(found?.generatingCount).toBe(0);
    });

    it('should include thumbnail URL from latest completed asset', async () => {
      const collection = await repo.create(testClientId, {
        name: 'With Thumbnail',
        productIds: testProductIds,
      });

      await createFlowWithAssets(collection.id, { completedCount: 1 });

      const results = await repo.listWithAssetStats(testClientId);
      const found = results.find(c => c.id === collection.id);

      expect(found?.thumbnailUrl).toBeDefined();
      expect(found?.thumbnailUrl).toContain('https://example.com/');
    });

    it('should respect limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(testClientId, { name: `Collection ${i}`, productIds: [] });
      }

      const page1 = await repo.listWithAssetStats(testClientId, { limit: 2, offset: 0 });
      const page2 = await repo.listWithAssetStats(testClientId, { limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
    });
  });

  describe('countWithFilters', () => {
    beforeEach(async () => {
      await repo.create(testClientId, { name: 'Draft 1', productIds: [], status: 'draft' });
      await repo.create(testClientId, { name: 'Draft 2', productIds: [], status: 'draft' });
      await repo.create(testClientId, { name: 'Completed', productIds: [], status: 'completed' });
    });

    it('should count all collections', async () => {
      const count = await repo.countWithFilters(testClientId);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count by status', async () => {
      const draftCount = await repo.countWithFilters(testClientId, { status: 'draft' });
      const completedCount = await repo.countWithFilters(testClientId, { status: 'completed' });

      expect(draftCount).toBeGreaterThanOrEqual(2);
      expect(completedCount).toBeGreaterThanOrEqual(1);
    });

    it('should count by search', async () => {
      const count = await repo.countWithFilters(testClientId, { search: 'Draft' });
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('listRecent', () => {
    it('should return recent collections with limit', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(testClientId, { name: `Recent ${i}`, productIds: [] });
      }

      const recent = await repo.listRecent(testClientId, 3);
      expect(recent.length).toBeLessThanOrEqual(3);
    });

    it('should order by most recent first', async () => {
      const recent = await repo.listRecent(testClientId, 5);
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].updatedAt.getTime()).toBeGreaterThanOrEqual(recent[i].updatedAt.getTime());
      }
    });
  });

  describe('count', () => {
    it('should count all collections for client', async () => {
      const initialCount = await repo.count(testClientId);

      await repo.create(testClientId, { name: 'New', productIds: [] });

      const newCount = await repo.count(testClientId);
      expect(newCount).toBe(initialCount + 1);
    });
  });
});
