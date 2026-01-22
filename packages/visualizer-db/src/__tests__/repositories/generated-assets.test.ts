/**
 * Generated Assets Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeneratedAssetRepository } from '../../repositories/generated-assets';
import { testDb } from '../setup';
import { createTestClient, createTestProduct, createTestId } from '../helpers';
import { sql } from 'drizzle-orm';

describe('GeneratedAssetRepository', () => {
  let repo: GeneratedAssetRepository;
  let testClientId: string;
  let testProductId: string;
  let testFlowId: string;

  beforeEach(async () => {
    repo = new GeneratedAssetRepository(testDb as any);

    // Create test data
    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const product = await createTestProduct(testDb as any, testClientId);
    testProductId = product.id;

    // Create a generation flow
    testFlowId = createTestId('flow');
    await testDb.execute(sql`
      INSERT INTO generation_flow (id, client_id, name, status, product_ids, selected_base_images, settings, version, created_at, updated_at)
      VALUES (${testFlowId}, ${testClientId}, 'Test Flow', 'pending', ${JSON.stringify([testProductId])}::jsonb, '{}'::jsonb, '{}'::jsonb, 1, NOW(), NOW())
    `);
  });

  // Helper to create a test asset
  async function createTestAsset(
    overrides: Partial<{
      id: string;
      status: string;
      jobId: string;
      assetUrl: string;
      pinned: boolean;
      approvalStatus: string;
    }> = {}
  ) {
    const id = overrides.id ?? createTestId('asset');
    const status = overrides.status ?? 'completed';
    const jobId = overrides.jobId ?? null;
    const assetUrl = overrides.assetUrl ?? `https://example.com/${id}.png`;
    const pinned = overrides.pinned ?? false;
    const approvalStatus = overrides.approvalStatus ?? 'pending';

    await testDb.execute(sql`
      INSERT INTO generated_asset (id, client_id, generation_flow_id, asset_url, asset_type, status, job_id, pinned, approval_status, product_ids, created_at, updated_at)
      VALUES (${id}, ${testClientId}, ${testFlowId}, ${assetUrl}, 'image', ${status}, ${jobId}, ${pinned}, ${approvalStatus}, ${JSON.stringify([testProductId])}::jsonb, NOW(), NOW())
    `);

    return { id, status, jobId, assetUrl, pinned, approvalStatus };
  }

  describe('create', () => {
    it('should create an asset with required fields', async () => {
      const asset = await repo.create({
        clientId: testClientId,
        generationFlowId: testFlowId,
        assetUrl: 'https://example.com/test.png',
        assetType: 'image',
        status: 'completed',
      });

      expect(asset).toBeDefined();
      expect(asset.id).toBeDefined();
      expect(asset.clientId).toBe(testClientId);
      expect(asset.generationFlowId).toBe(testFlowId);
      expect(asset.assetUrl).toBe('https://example.com/test.png');
      expect(asset.status).toBe('completed');
    });

    it('should create an asset with optional fields', async () => {
      const asset = await repo.create({
        clientId: testClientId,
        generationFlowId: testFlowId,
        assetUrl: 'https://example.com/test.png',
        assetType: 'image',
        status: 'pending',
        jobId: 'job-123',
        productIds: [testProductId],
        prompt: 'Test prompt',
      });

      expect(asset.jobId).toBe('job-123');
      expect(asset.productIds).toContain(testProductId);
      expect(asset.prompt).toBe('Test prompt');
    });

    it('should create a placeholder asset with pending status', async () => {
      const asset = await repo.create({
        clientId: testClientId,
        generationFlowId: testFlowId,
        assetUrl: '', // Empty URL for placeholder
        assetType: 'image',
        status: 'pending',
        jobId: 'job-456',
      });

      expect(asset.status).toBe('pending');
      expect(asset.jobId).toBe('job-456');
      expect(asset.assetUrl).toBe('');
    });
  });

  describe('getById', () => {
    it('should return asset by ID', async () => {
      const created = await createTestAsset();
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update asset fields', async () => {
      const created = await createTestAsset({ status: 'pending' });

      const updated = await repo.update(created.id, {
        status: 'completed',
        assetUrl: 'https://example.com/updated.png',
      });

      expect(updated.status).toBe('completed');
      expect(updated.assetUrl).toBe('https://example.com/updated.png');
    });

    it('should update pinned status', async () => {
      const created = await createTestAsset({ pinned: false });

      const updated = await repo.update(created.id, { pinned: true });
      expect(updated.pinned).toBe(true);
    });

    it('should update approval status', async () => {
      const created = await createTestAsset({ approvalStatus: 'pending' });

      const updated = await repo.update(created.id, { approvalStatus: 'approved' });
      expect(updated.approvalStatus).toBe('approved');
    });
  });

  describe('completePendingByJobId', () => {
    it('should update pending asset to completed', async () => {
      const jobId = 'test-job-' + Date.now();
      await createTestAsset({ status: 'pending', jobId, assetUrl: '' });

      const assetId = await repo.completePendingByJobId(jobId, {
        assetUrl: 'https://example.com/completed.png',
        prompt: 'Generated with prompt',
      });

      expect(assetId).toBeDefined();

      // Verify the asset was updated
      const asset = await repo.getById(assetId!);
      expect(asset?.status).toBe('completed');
      expect(asset?.assetUrl).toBe('https://example.com/completed.png');
      expect(asset?.prompt).toBe('Generated with prompt');
    });

    it('should return null when no pending asset exists', async () => {
      const assetId = await repo.completePendingByJobId('non-existent-job', {
        assetUrl: 'https://example.com/test.png',
      });

      expect(assetId).toBeNull();
    });

    it('should not update already completed assets', async () => {
      const jobId = 'test-job-' + Date.now();
      await createTestAsset({ status: 'completed', jobId, assetUrl: 'https://example.com/original.png' });

      const assetId = await repo.completePendingByJobId(jobId, {
        assetUrl: 'https://example.com/should-not-update.png',
      });

      expect(assetId).toBeNull();
    });

    it('should include settings when provided', async () => {
      const jobId = 'test-job-' + Date.now();
      const created = await createTestAsset({ status: 'pending', jobId, assetUrl: '' });

      await repo.completePendingByJobId(jobId, {
        assetUrl: 'https://example.com/completed.png',
        settings: { aspectRatio: '16:9', imageQuality: '2k' },
      });

      const asset = await repo.getById(created.id);
      expect(asset?.settings).toMatchObject({ aspectRatio: '16:9', imageQuality: '2k' });
    });
  });

  describe('listWithFilters', () => {
    beforeEach(async () => {
      // Create multiple assets with different statuses
      await createTestAsset({ id: 'asset-1', status: 'completed', pinned: false, approvalStatus: 'pending' });
      await createTestAsset({ id: 'asset-2', status: 'completed', pinned: true, approvalStatus: 'approved' });
      await createTestAsset({ id: 'asset-3', status: 'pending', pinned: false, approvalStatus: 'pending' });
      await createTestAsset({ id: 'asset-4', status: 'completed', pinned: false, approvalStatus: 'rejected' });
    });

    it('should list all assets for client', async () => {
      const assets = await repo.listWithFilters(testClientId);
      expect(assets.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter by status', async () => {
      const assets = await repo.listWithFilters(testClientId, { status: 'completed' });
      expect(assets.every((a) => a.status === 'completed')).toBe(true);
    });

    it('should filter by pinned', async () => {
      const assets = await repo.listWithFilters(testClientId, { pinned: true });
      expect(assets.every((a) => a.pinned === true)).toBe(true);
      expect(assets.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by approval status', async () => {
      const assets = await repo.listWithFilters(testClientId, { approvalStatus: 'approved' });
      expect(assets.every((a) => a.approvalStatus === 'approved')).toBe(true);
    });

    it('should filter by flow ID', async () => {
      const assets = await repo.listWithFilters(testClientId, { flowId: testFlowId });
      expect(assets.every((a) => a.generationFlowId === testFlowId)).toBe(true);
    });

    it('should filter by product ID', async () => {
      const assets = await repo.listWithFilters(testClientId, { productId: testProductId });
      expect(assets.every((a) => a.productIds?.includes(testProductId))).toBe(true);
    });

    it('should respect limit', async () => {
      const assets = await repo.listWithFilters(testClientId, { limit: 2 });
      expect(assets.length).toBeLessThanOrEqual(2);
    });

    it('should respect offset', async () => {
      const all = await repo.listWithFilters(testClientId, { limit: 10 });
      const offset = await repo.listWithFilters(testClientId, { limit: 10, offset: 2 });

      if (all.length > 2) {
        expect(offset[0]?.id).toBe(all[2]?.id);
      }
    });

    it('should sort by date descending by default', async () => {
      const assets = await repo.listWithFilters(testClientId);
      for (let i = 1; i < assets.length; i++) {
        expect(assets[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(assets[i].createdAt.getTime());
      }
    });

    it('should sort by oldest when specified', async () => {
      const assets = await repo.listWithFilters(testClientId, { sort: 'oldest' });
      for (let i = 1; i < assets.length; i++) {
        expect(assets[i - 1].createdAt.getTime()).toBeLessThanOrEqual(assets[i].createdAt.getTime());
      }
    });

    it('should combine multiple filters', async () => {
      const assets = await repo.listWithFilters(testClientId, {
        status: 'completed',
        pinned: false,
        approvalStatus: 'pending',
      });

      expect(assets.every((a) => a.status === 'completed' && a.pinned === false && a.approvalStatus === 'pending')).toBe(true);
    });
  });

  describe('countWithFilters', () => {
    beforeEach(async () => {
      await createTestAsset({ status: 'completed' });
      await createTestAsset({ status: 'completed' });
      await createTestAsset({ status: 'pending' });
    });

    it('should count all assets for client', async () => {
      const count = await repo.countWithFilters(testClientId);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    it('should count by status', async () => {
      const completedCount = await repo.countWithFilters(testClientId, { status: 'completed' });
      const pendingCount = await repo.countWithFilters(testClientId, { status: 'pending' });

      expect(completedCount).toBeGreaterThanOrEqual(2);
      expect(pendingCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findByJobId', () => {
    it('should find assets by job ID', async () => {
      const jobId = 'find-job-' + Date.now();
      await createTestAsset({ jobId });

      const assets = await repo.findByJobId(testClientId, jobId);
      expect(assets.length).toBe(1);
      expect(assets[0].jobId).toBe(jobId);
    });

    it('should return empty array for non-existent job ID', async () => {
      const assets = await repo.findByJobId(testClientId, 'non-existent-job');
      expect(assets).toEqual([]);
    });
  });

  describe('listByGenerationFlowIds', () => {
    it('should list assets by flow IDs', async () => {
      await createTestAsset();
      await createTestAsset();

      const assets = await repo.listByGenerationFlowIds([testFlowId]);
      expect(assets.length).toBeGreaterThanOrEqual(2);
      expect(assets.every((a) => a.generationFlowId === testFlowId)).toBe(true);
    });

    it('should return empty array for empty flow IDs', async () => {
      const assets = await repo.listByGenerationFlowIds([]);
      expect(assets).toEqual([]);
    });
  });

  describe('softDelete', () => {
    it('should soft delete an asset', async () => {
      const created = await createTestAsset();

      await repo.softDelete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull(); // Should not be found after soft delete
    });
  });

  describe('getStatsByFlowIds', () => {
    beforeEach(async () => {
      await createTestAsset({ status: 'completed' });
      await createTestAsset({ status: 'completed' });
      await createTestAsset({ status: 'pending' });
    });

    it('should return stats for flow IDs', async () => {
      const stats = await repo.getStatsByFlowIds(testClientId, [testFlowId]);

      expect(stats.has(testFlowId)).toBe(true);
      const flowStats = stats.get(testFlowId);
      expect(flowStats?.totalImages).toBeGreaterThanOrEqual(3);
      expect(flowStats?.completedCount).toBeGreaterThanOrEqual(2);
    });

    it('should return empty stats for non-existent flow IDs', async () => {
      const stats = await repo.getStatsByFlowIds(testClientId, ['non-existent-flow']);

      const flowStats = stats.get('non-existent-flow');
      expect(flowStats?.totalImages).toBe(0);
      expect(flowStats?.completedCount).toBe(0);
    });

    it('should return empty map for empty flow IDs', async () => {
      const stats = await repo.getStatsByFlowIds(testClientId, []);
      expect(stats.size).toBe(0);
    });
  });
});
