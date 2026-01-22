/**
 * Favorite Image Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FavoriteImageRepository } from '../../repositories/favorite-images';
import { testDb } from '../setup';
import { createTestClient, createTestId } from '../helpers';
import { sql } from 'drizzle-orm';

describe('FavoriteImageRepository', () => {
  let repo: FavoriteImageRepository;
  let testClientId: string;

  // Helper to create a test generated asset
  async function createTestAsset(clientId: string): Promise<string> {
    const assetId = createTestId('asset');
    await testDb.execute(sql`
      INSERT INTO generated_asset (id, client_id, asset_url, asset_type, status, created_at, updated_at)
      VALUES (${assetId}, ${clientId}, ${'https://example.com/' + assetId + '.png'}, 'image', 'completed', NOW(), NOW())
    `);
    return assetId;
  }

  beforeEach(async () => {
    repo = new FavoriteImageRepository(testDb as any);

    // Create test client
    const client = await createTestClient(testDb as any);
    testClientId = client.id;
  });

  describe('create', () => {
    it('should create a favorite image', async () => {
      const assetId = await createTestAsset(testClientId);
      const favorite = await repo.create(testClientId, assetId);

      expect(favorite).toBeDefined();
      expect(favorite.id).toBeDefined();
      expect(favorite.clientId).toBe(testClientId);
      expect(favorite.generatedAssetId).toBe(assetId);
    });

    it('should set timestamps on creation', async () => {
      const assetId = await createTestAsset(testClientId);
      const favorite = await repo.create(testClientId, assetId);

      expect(favorite.createdAt).toBeInstanceOf(Date);
      expect(favorite.updatedAt).toBeInstanceOf(Date);
    });

    it('should create favorites for different assets', async () => {
      const asset1 = await createTestAsset(testClientId);
      const asset2 = await createTestAsset(testClientId);

      const fav1 = await repo.create(testClientId, asset1);
      const fav2 = await repo.create(testClientId, asset2);

      expect(fav1.generatedAssetId).toBe(asset1);
      expect(fav2.generatedAssetId).toBe(asset2);
      expect(fav1.id).not.toBe(fav2.id);
    });
  });

  describe('listByClient', () => {
    it('should return all favorites for a client', async () => {
      const asset1 = await createTestAsset(testClientId);
      const asset2 = await createTestAsset(testClientId);
      const asset3 = await createTestAsset(testClientId);

      await repo.create(testClientId, asset1);
      await repo.create(testClientId, asset2);
      await repo.create(testClientId, asset3);

      const favorites = await repo.listByClient(testClientId);

      expect(favorites.length).toBe(3);
      expect(favorites.map(f => f.generatedAssetId).sort()).toEqual([asset1, asset2, asset3].sort());
    });

    it('should return favorites ordered by createdAt ascending', async () => {
      const asset1 = await createTestAsset(testClientId);
      await repo.create(testClientId, asset1);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const asset2 = await createTestAsset(testClientId);
      await repo.create(testClientId, asset2);

      await new Promise(resolve => setTimeout(resolve, 10));

      const asset3 = await createTestAsset(testClientId);
      await repo.create(testClientId, asset3);

      const favorites = await repo.listByClient(testClientId);

      expect(favorites.length).toBe(3);
      // Check ascending order
      for (let i = 1; i < favorites.length; i++) {
        expect(favorites[i - 1].createdAt.getTime()).toBeLessThanOrEqual(favorites[i].createdAt.getTime());
      }
    });

    it('should return empty array for client with no favorites', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'No Favorites Client' });
      const favorites = await repo.listByClient(newClient.id);

      expect(favorites).toEqual([]);
    });

    it('should not return favorites from other clients', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Other Client' });

      const asset1 = await createTestAsset(testClientId);
      const asset2 = await createTestAsset(client2.id);

      await repo.create(testClientId, asset1);
      await repo.create(client2.id, asset2);

      const favorites1 = await repo.listByClient(testClientId);
      const favorites2 = await repo.listByClient(client2.id);

      expect(favorites1.length).toBe(1);
      expect(favorites1[0].generatedAssetId).toBe(asset1);

      expect(favorites2.length).toBe(1);
      expect(favorites2[0].generatedAssetId).toBe(asset2);
    });
  });

  describe('getById', () => {
    it('should return favorite by ID', async () => {
      const assetId = await createTestAsset(testClientId);
      const created = await repo.create(testClientId, assetId);

      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.generatedAssetId).toBe(assetId);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a favorite', async () => {
      const assetId = await createTestAsset(testClientId);
      const created = await repo.create(testClientId, assetId);

      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent favorite', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });

    it('should only delete specified favorite', async () => {
      const asset1 = await createTestAsset(testClientId);
      const asset2 = await createTestAsset(testClientId);

      const fav1 = await repo.create(testClientId, asset1);
      const fav2 = await repo.create(testClientId, asset2);

      await repo.delete(fav1.id);

      const remaining = await repo.listByClient(testClientId);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(fav2.id);
    });
  });
});
