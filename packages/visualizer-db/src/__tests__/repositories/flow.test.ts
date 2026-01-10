/**
 * Flow Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowRepository } from '../../repositories/flows';
import { testDb } from '../setup';
import { createTestOrganization, createTestClientSession, createTestProduct } from '../helpers';
import { DEFAULT_FLOW_SETTINGS } from 'visualizer-types';

describe('FlowRepository', () => {
  let repo: FlowRepository;
  let testOrgId: string;
  let testClientSessionId: string;
  let testProductId: string;

  beforeEach(async () => {
    repo = new FlowRepository(testDb as any);

    // Create test organization and client session
    const org = await createTestOrganization(testDb as any);
    testOrgId = org.id;

    const product = await createTestProduct(testDb as any, testOrgId);
    testProductId = product.id;

    const clientSession = await createTestClientSession(testDb as any, testOrgId);
    testClientSessionId = clientSession.id;
  });

  describe('create', () => {
    it('should create a flow with default settings', async () => {
      const flow = await repo.create(testClientSessionId, {});

      expect(flow).toBeDefined();
      expect(flow.id).toBeDefined();
      expect(flow.clientSessionId).toBe(testClientSessionId);
      expect(flow.status).toBe('empty');
      expect(flow.productIds).toEqual([]);
      expect(flow.selectedBaseImages).toEqual({});
      expect(flow.currentImageIndex).toBe(0);
      expect(flow.version).toBe(1);
      expect(flow.settings).toBeDefined();
      expect(flow.settings.roomType).toBe(DEFAULT_FLOW_SETTINGS.roomType);
    });

    it('should create a flow with custom settings', async () => {
      const flow = await repo.create(testClientSessionId, {
        name: 'Custom Flow',
        productIds: [testProductId],
        settings: {
          roomType: 'living-room',
          style: 'Contemporary',
          varietyLevel: 75,
        },
      });

      expect(flow.name).toBe('Custom Flow');
      expect(flow.productIds).toEqual([testProductId]);
      expect(flow.settings.roomType).toBe('living-room');
      expect(flow.settings.style).toBe('Contemporary');
      expect(flow.settings.varietyLevel).toBe(75);
      // Should merge with defaults
      expect(flow.settings.lighting).toBe(DEFAULT_FLOW_SETTINGS.lighting);
    });
  });

  describe('list', () => {
    it('should list flows for a client session', async () => {
      await repo.create(testClientSessionId, { name: 'Flow 1' });
      await repo.create(testClientSessionId, { name: 'Flow 2' });

      // Create flow in different session - should not be included
      const otherSession = await createTestClientSession(testDb as any, testOrgId);
      await repo.create(otherSession.id, { name: 'Other Flow' });

      const flows = await repo.list(testClientSessionId);

      expect(flows.length).toBe(2);
      expect(flows.some((f) => f.name === 'Flow 1')).toBe(true);
      expect(flows.some((f) => f.name === 'Flow 2')).toBe(true);
      expect(flows.some((f) => f.name === 'Other Flow')).toBe(false);
    });
  });

  describe('addProducts', () => {
    it('should add products to a flow', async () => {
      const flow = await repo.create(testClientSessionId, {});

      const product2 = await createTestProduct(testDb as any, testOrgId);

      const updated = await repo.addProducts(flow.id, [testProductId, product2.id]);

      expect(updated.productIds).toContain(testProductId);
      expect(updated.productIds).toContain(product2.id);
    });

    it('should not duplicate product IDs', async () => {
      const flow = await repo.create(testClientSessionId, {
        productIds: [testProductId],
      });

      const updated = await repo.addProducts(flow.id, [testProductId]);

      expect(updated.productIds.filter((id) => id === testProductId).length).toBe(1);
    });

    it('should add base image IDs when provided', async () => {
      const flow = await repo.create(testClientSessionId, {});

      const updated = await repo.addProducts(
        flow.id,
        [testProductId],
        { [testProductId]: 'image-123' }
      );

      expect(updated.selectedBaseImages[testProductId]).toBe('image-123');
    });
  });

  describe('removeProduct', () => {
    it('should remove a product from a flow', async () => {
      const product2 = await createTestProduct(testDb as any, testOrgId);
      const flow = await repo.create(testClientSessionId, {
        productIds: [testProductId, product2.id],
        selectedBaseImages: { [testProductId]: 'img-1', [product2.id]: 'img-2' },
      });

      const updated = await repo.removeProduct(flow.id, testProductId);

      expect(updated.productIds).not.toContain(testProductId);
      expect(updated.productIds).toContain(product2.id);
      expect(updated.selectedBaseImages[testProductId]).toBeUndefined();
      expect(updated.selectedBaseImages[product2.id]).toBe('img-2');
    });
  });

  describe('updateSettings', () => {
    it('should merge settings with existing', async () => {
      const flow = await repo.create(testClientSessionId, {
        settings: {
          roomType: 'studio',
          style: 'Modern',
        },
      });

      const updated = await repo.updateSettings(flow.id, {
        style: 'Contemporary',
        lighting: 'Natural',
      });

      expect(updated.settings.roomType).toBe('studio'); // Preserved
      expect(updated.settings.style).toBe('Contemporary'); // Updated
      expect(updated.settings.lighting).toBe('Natural'); // Added
    });

    it('should merge postAdjustments deeply', async () => {
      const flow = await repo.create(testClientSessionId, {});

      const updated = await repo.updateSettings(flow.id, {
        postAdjustments: {
          light: { brightness: 20, contrast: 10, shadows: 5 },
          color: { saturation: 15, temperature: 0, tint: 0 },
          effects: { sharpness: 5, denoise: 0, vignette: 0 },
        },
      });

      expect(updated.settings.postAdjustments).toBeDefined();
      expect(updated.settings.postAdjustments?.light.brightness).toBe(20);
      expect(updated.settings.postAdjustments?.color.saturation).toBe(15);
      expect(updated.settings.postAdjustments?.effects.sharpness).toBe(5);
    });
  });

  describe('update', () => {
    it('should update flow status', async () => {
      const flow = await repo.create(testClientSessionId, {});

      const updated = await repo.update(flow.id, { status: 'configured' });

      expect(updated.status).toBe('configured');
    });

    it('should support optimistic locking', async () => {
      const flow = await repo.create(testClientSessionId, {});

      // Update with correct version
      await repo.update(flow.id, { name: 'V2' }, 1);

      // Update with stale version should fail
      await expect(repo.update(flow.id, { name: 'V3' }, 1)).rejects.toThrow();
    });
  });
});
