/**
 * Generation Flow Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GenerationFlowRepository } from '../../repositories/generation-flows';
import { testDb } from '../setup';
import { createTestClient, createTestProduct, createTestCollectionSession, createTestId } from '../helpers';

describe('GenerationFlowRepository', () => {
  let repo: GenerationFlowRepository;
  let testClientId: string;
  let testProductId: string;
  let testCollectionSessionId: string;

  beforeEach(async () => {
    repo = new GenerationFlowRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const product = await createTestProduct(testDb as any, testClientId);
    testProductId = product.id;

    const session = await createTestCollectionSession(testDb as any, testClientId);
    testCollectionSessionId = session.id;
  });

  describe('create', () => {
    it('should create a generation flow with required fields', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
      });

      expect(flow).toBeDefined();
      expect(flow.id).toBeDefined();
      expect(flow.clientId).toBe(testClientId);
      expect(flow.collectionSessionId).toBe(testCollectionSessionId);
      expect(flow.status).toBe('empty');
      expect(flow.version).toBe(1);
    });

    it('should create a flow with products', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      expect(flow.productIds).toContain(testProductId);
    });

    it('should link products in junction table', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      const linkedProducts = await repo.getLinkedProductIds(flow.id);
      expect(linkedProducts).toContain(testProductId);
    });

    it('should enforce max 3 products per flow', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });
      const p3 = await createTestProduct(testDb as any, testClientId, { name: 'P3' });
      const p4 = await createTestProduct(testDb as any, testClientId, { name: 'P4' });

      await expect(
        repo.create(testClientId, {
          collectionSessionId: testCollectionSessionId,
          productIds: [p1.id, p2.id, p3.id, p4.id],
        })
      ).rejects.toThrow(/cannot have more than 3 products/);
    });

    it('should enforce max 10 flows per product', async () => {
      // Create 10 flows with the same product
      for (let i = 0; i < 10; i++) {
        await repo.create(testClientId, {
          collectionSessionId: testCollectionSessionId,
          productIds: [testProductId],
        });
      }

      // 11th should fail
      await expect(
        repo.create(testClientId, {
          collectionSessionId: testCollectionSessionId,
          productIds: [testProductId],
        })
      ).rejects.toThrow(/already has 10 generation flows/);
    });

    it('should merge settings with defaults', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        settings: { aspectRatio: '16:9' },
      });

      expect(flow.settings.aspectRatio).toBe('16:9');
      // Should have default settings merged in
      expect(flow.settings).toBeDefined();
    });

    it('should create flow with name', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        name: 'My Flow',
      });

      expect(flow.name).toBe('My Flow');
    });

    it('should create flow with selectedBaseImages', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
        selectedBaseImages: { [testProductId]: 'image-123' },
      });

      expect(flow.selectedBaseImages[testProductId]).toBe('image-123');
    });
  });

  describe('createWithId', () => {
    it('should create flow with specific ID', async () => {
      const customId = createTestId('flow');
      const flow = await repo.createWithId(customId, testClientId, {
        collectionSessionId: testCollectionSessionId,
      });

      expect(flow.id).toBe(customId);
    });

    it('should validate constraints', async () => {
      const customId = createTestId('flow');
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });
      const p3 = await createTestProduct(testDb as any, testClientId, { name: 'P3' });
      const p4 = await createTestProduct(testDb as any, testClientId, { name: 'P4' });

      await expect(
        repo.createWithId(customId, testClientId, {
          collectionSessionId: testCollectionSessionId,
          productIds: [p1.id, p2.id, p3.id, p4.id],
        })
      ).rejects.toThrow(/cannot have more than 3 products/);
    });

    it('should allow setting status', async () => {
      const customId = createTestId('flow');
      const flow = await repo.createWithId(customId, testClientId, {
        collectionSessionId: testCollectionSessionId,
        status: 'configured',
      });

      expect(flow.status).toBe('configured');
    });
  });

  describe('createBatchWithIds', () => {
    it('should batch create flows', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flows = await repo.createBatchWithIds(testClientId, [
        { id: createTestId('flow'), collectionSessionId: testCollectionSessionId, productIds: [p1.id] },
        { id: createTestId('flow'), collectionSessionId: testCollectionSessionId, productIds: [p2.id] },
      ]);

      expect(flows.length).toBe(2);
    });

    it('should return empty array for empty input', async () => {
      const flows = await repo.createBatchWithIds(testClientId, []);
      expect(flows).toEqual([]);
    });

    it('should validate all constraints', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });
      const p3 = await createTestProduct(testDb as any, testClientId, { name: 'P3' });
      const p4 = await createTestProduct(testDb as any, testClientId, { name: 'P4' });

      await expect(
        repo.createBatchWithIds(testClientId, [
          { id: createTestId('flow'), collectionSessionId: testCollectionSessionId, productIds: [p1.id, p2.id, p3.id, p4.id] },
        ])
      ).rejects.toThrow(/cannot have more than 3 products/);
    });
  });

  describe('listByCollectionSession', () => {
    it('should return flows for collection', async () => {
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      const flows = await repo.listByCollectionSession(testCollectionSessionId);

      expect(flows.length).toBe(2);
    });

    it('should return empty array for collection with no flows', async () => {
      const flows = await repo.listByCollectionSession(testCollectionSessionId);
      expect(flows).toEqual([]);
    });

    it('should return flows ordered by createdAt', async () => {
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId, name: 'First' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId, name: 'Second' });

      const flows = await repo.listByCollectionSession(testCollectionSessionId);

      expect(flows[0].name).toBe('First');
      expect(flows[1].name).toBe('Second');
    });
  });

  describe('listByCollectionSessionWithDetails', () => {
    it('should return enriched flow data', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      const flows = await repo.listByCollectionSessionWithDetails(testCollectionSessionId, 'https://r2.example.com');

      expect(flows.length).toBe(1);
      expect(flows[0].product).toBeDefined();
      expect(flows[0].baseImages).toBeDefined();
      expect(flows[0].generatedAssets).toBeDefined();
    });

    it('should return empty array for collection with no flows', async () => {
      const flows = await repo.listByCollectionSessionWithDetails(testCollectionSessionId, 'https://r2.example.com');
      expect(flows).toEqual([]);
    });
  });

  describe('listByClient', () => {
    it('should return all flows for client', async () => {
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      const flows = await repo.listByClient(testClientId);

      expect(flows.length).toBe(2);
    });

    it('should not return flows from other clients', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Client 2' });
      const session2 = await createTestCollectionSession(testDb as any, client2.id);

      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.create(client2.id, { collectionSessionId: session2.id });

      const flows = await repo.listByClient(testClientId);

      expect(flows.length).toBe(1);
    });
  });

  describe('listByCollectionSessionIds', () => {
    it('should batch lookup flows', async () => {
      const session2 = await createTestCollectionSession(testDb as any, testClientId, { name: 'Session 2' });

      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.create(testClientId, { collectionSessionId: session2.id });

      const flows = await repo.listByCollectionSessionIds([testCollectionSessionId, session2.id]);

      expect(flows.length).toBe(2);
    });

    it('should return empty array for empty input', async () => {
      const flows = await repo.listByCollectionSessionIds([]);
      expect(flows).toEqual([]);
    });
  });

  describe('listByProduct', () => {
    it('should return flows containing a product', async () => {
      await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      const flows = await repo.listByProduct(testProductId);

      expect(flows.length).toBe(1);
      expect(flows[0].productIds).toContain(testProductId);
    });

    it('should return empty array if product has no flows', async () => {
      const newProduct = await createTestProduct(testDb as any, testClientId, { name: 'No Flows' });
      const flows = await repo.listByProduct(newProduct.id);

      expect(flows).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a flow', async () => {
      const flow = await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.delete(flow.id);

      const found = await repo.getById(flow.id);
      expect(found).toBeNull();
    });

    it('should cascade delete junction table entries', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      await repo.delete(flow.id);

      const linkedProducts = await repo.getLinkedProductIds(flow.id);
      expect(linkedProducts).toEqual([]);
    });
  });

  describe('deleteByCollectionSession', () => {
    it('should delete all flows for collection', async () => {
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });
      await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      await repo.deleteByCollectionSession(testCollectionSessionId);

      const flows = await repo.listByCollectionSession(testCollectionSessionId);
      expect(flows).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update flow fields', async () => {
      const flow = await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      const updated = await repo.update(flow.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.version).toBe(flow.version + 1);
    });

    it('should sync productIds with junction table', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id],
      });

      await repo.update(flow.id, { productIds: [p2.id] });

      const linkedProducts = await repo.getLinkedProductIds(flow.id);
      expect(linkedProducts).toContain(p2.id);
      expect(linkedProducts).not.toContain(p1.id);
    });

    it('should merge settings', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        settings: { aspectRatio: '1:1' },
      });

      const updated = await repo.update(flow.id, { settings: { imageQuality: '2k' } });

      expect(updated.settings.aspectRatio).toBe('1:1');
      expect(updated.settings.imageQuality).toBe('2k');
    });

    it('should validate max products on update', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });
      const p3 = await createTestProduct(testDb as any, testClientId, { name: 'P3' });
      const p4 = await createTestProduct(testDb as any, testClientId, { name: 'P4' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id],
      });

      await expect(repo.update(flow.id, { productIds: [p1.id, p2.id, p3.id, p4.id] })).rejects.toThrow(
        /cannot have more than 3 products/
      );
    });
  });

  describe('addProducts', () => {
    it('should add products to flow', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id],
      });

      const updated = await repo.addProducts(flow.id, [p2.id]);

      expect(updated.productIds).toContain(p1.id);
      expect(updated.productIds).toContain(p2.id);
    });

    it('should add base image IDs', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id],
      });

      const updated = await repo.addProducts(flow.id, [p2.id], { [p2.id]: 'image-456' });

      expect(updated.selectedBaseImages[p2.id]).toBe('image-456');
    });

    it('should validate max products', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });
      const p3 = await createTestProduct(testDb as any, testClientId, { name: 'P3' });
      const p4 = await createTestProduct(testDb as any, testClientId, { name: 'P4' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id, p2.id],
      });

      await expect(repo.addProducts(flow.id, [p3.id, p4.id])).rejects.toThrow(/cannot have more than 3 products/);
    });

    it('should not duplicate products', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      const updated = await repo.addProducts(flow.id, [testProductId]);

      expect(updated.productIds.length).toBe(1);
    });
  });

  describe('removeProduct', () => {
    it('should remove product from flow', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id, p2.id],
        selectedBaseImages: { [p1.id]: 'img-1', [p2.id]: 'img-2' },
      });

      const updated = await repo.removeProduct(flow.id, p1.id);

      expect(updated.productIds).not.toContain(p1.id);
      expect(updated.productIds).toContain(p2.id);
      expect(updated.selectedBaseImages[p1.id]).toBeUndefined();
    });

    it('should update junction table', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id, p2.id],
      });

      await repo.removeProduct(flow.id, p1.id);

      const linkedProducts = await repo.getLinkedProductIds(flow.id);
      expect(linkedProducts).not.toContain(p1.id);
      expect(linkedProducts).toContain(p2.id);
    });
  });

  describe('updateSettings', () => {
    it('should merge settings with existing', async () => {
      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        settings: { aspectRatio: '1:1' },
      });

      const updated = await repo.updateSettings(flow.id, { imageQuality: '1k' });

      expect(updated.settings.aspectRatio).toBe('1:1');
      expect(updated.settings.imageQuality).toBe('1k');
    });

    it('should support optimistic locking', async () => {
      const flow = await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      const updated = await repo.updateSettings(flow.id, { aspectRatio: '16:9' }, flow.version);
      expect(updated.settings.aspectRatio).toBe('16:9');

      await expect(repo.updateSettings(flow.id, { aspectRatio: '4:3' }, flow.version)).rejects.toThrow();
    });
  });

  describe('getLinkedProductIds', () => {
    it('should return product IDs from junction table', async () => {
      const p1 = await createTestProduct(testDb as any, testClientId, { name: 'P1' });
      const p2 = await createTestProduct(testDb as any, testClientId, { name: 'P2' });

      const flow = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [p1.id, p2.id],
      });

      const linkedProducts = await repo.getLinkedProductIds(flow.id);

      expect(linkedProducts).toContain(p1.id);
      expect(linkedProducts).toContain(p2.id);
    });

    it('should return empty array for flow with no products', async () => {
      const flow = await repo.create(testClientId, { collectionSessionId: testCollectionSessionId });

      const linkedProducts = await repo.getLinkedProductIds(flow.id);
      expect(linkedProducts).toEqual([]);
    });
  });

  describe('countFlowsForProduct', () => {
    it('should count flows via junction table', async () => {
      await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });
      await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        productIds: [testProductId],
      });

      const count = await repo.countFlowsForProduct(testProductId);
      expect(count).toBe(2);
    });

    it('should return 0 for product with no flows', async () => {
      const count = await repo.countFlowsForProduct(testProductId);
      expect(count).toBe(0);
    });
  });

  describe('canProductAcceptMoreFlows', () => {
    it('should return true when under limit', async () => {
      const canAccept = await repo.canProductAcceptMoreFlows(testProductId);
      expect(canAccept).toBe(true);
    });

    it('should return false when at limit', async () => {
      // Create 10 flows
      for (let i = 0; i < 10; i++) {
        await repo.create(testClientId, {
          collectionSessionId: testCollectionSessionId,
          productIds: [testProductId],
        });
      }

      const canAccept = await repo.canProductAcceptMoreFlows(testProductId);
      expect(canAccept).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return flow by ID', async () => {
      const created = await repo.create(testClientId, {
        collectionSessionId: testCollectionSessionId,
        name: 'Find Me',
      });

      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('static limits', () => {
    it('should expose MAX_PRODUCTS_PER_FLOW', () => {
      expect(GenerationFlowRepository.MAX_PRODUCTS_PER_FLOW).toBe(3);
    });

    it('should expose MAX_FLOWS_PER_PRODUCT', () => {
      expect(GenerationFlowRepository.MAX_FLOWS_PER_PRODUCT).toBe(10);
    });
  });
});
