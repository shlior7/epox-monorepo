/**
 * Generated Image Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GeneratedImageRepository } from '../../repositories/generated-images';
import { FlowRepository } from '../../repositories/flows';
import { testDb } from '../setup';
import { createTestOrganization, createTestClientSession, createTestProduct } from '../helpers';

describe('GeneratedImageRepository', () => {
  let repo: GeneratedImageRepository;
  let flowRepo: FlowRepository;
  let testOrgId: string;
  let testFlowId: string;

  beforeEach(async () => {
    repo = new GeneratedImageRepository(testDb as any);
    flowRepo = new FlowRepository(testDb as any);

    // Create test data
    const org = await createTestOrganization(testDb as any);
    testOrgId = org.id;

    const clientSession = await createTestClientSession(testDb as any, testOrgId);
    const flow = await flowRepo.create(clientSession.id, { name: 'Test Flow' });
    testFlowId = flow.id;
  });

  describe('create', () => {
    it('should create a generated image with required fields', async () => {
      const image = await repo.create({
        organizationId: testOrgId,
        r2Key: 'generated/image-123.png',
      });

      expect(image).toBeDefined();
      expect(image.id).toBeDefined();
      expect(image.organizationId).toBe(testOrgId);
      expect(image.r2Key).toBe('generated/image-123.png');
      expect(image.flowId).toBeNull();
      expect(image.prompt).toBeNull();
    });

    it('should create a generated image with all fields', async () => {
      const image = await repo.create({
        organizationId: testOrgId,
        flowId: testFlowId,
        r2Key: 'generated/full-image.png',
        prompt: 'A modern living room with a sofa',
        settings: {
          roomType: 'living-room',
          style: 'Modern',
          lighting: 'Natural',
          cameraAngle: 'Front',
          aspectRatio: '16:9',
          surroundings: 'Minimal',
          colorScheme: 'Neutral',
          props: [],
          varietyLevel: 50,
          matchProductColors: true,
          includeAccessories: false,
          promptText: '',
        },
        productIds: ['prod-1', 'prod-2'],
        jobId: 'job-123',
      });

      expect(image.flowId).toBe(testFlowId);
      expect(image.prompt).toBe('A modern living room with a sofa');
      expect(image.settings?.roomType).toBe('living-room');
      expect(image.productIds).toEqual(['prod-1', 'prod-2']);
      expect(image.jobId).toBe('job-123');
    });

    it('should create a generated image with error', async () => {
      const image = await repo.create({
        organizationId: testOrgId,
        r2Key: 'generated/failed.png',
        error: 'Generation failed: timeout',
      });

      expect(image.error).toBe('Generation failed: timeout');
    });
  });

  describe('list', () => {
    it('should list images for an organization', async () => {
      await repo.create({ organizationId: testOrgId, r2Key: 'img1.png' });
      await repo.create({ organizationId: testOrgId, r2Key: 'img2.png' });

      // Create image in different org
      const otherOrg = await createTestOrganization(testDb as any);
      await repo.create({ organizationId: otherOrg.id, r2Key: 'other.png' });

      const images = await repo.list(testOrgId);

      expect(images.length).toBe(2);
      expect(images.some((i) => i.r2Key === 'img1.png')).toBe(true);
      expect(images.some((i) => i.r2Key === 'img2.png')).toBe(true);
      expect(images.some((i) => i.r2Key === 'other.png')).toBe(false);
    });

    it('should filter by flowId', async () => {
      await repo.create({ organizationId: testOrgId, flowId: testFlowId, r2Key: 'flow-img.png' });
      await repo.create({ organizationId: testOrgId, r2Key: 'no-flow.png' });

      const images = await repo.list(testOrgId, { flowId: testFlowId });

      expect(images.length).toBe(1);
      expect(images[0].r2Key).toBe('flow-img.png');
    });

    it('should respect limit option', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.create({ organizationId: testOrgId, r2Key: `img-${i}.png` });
      }

      const images = await repo.list(testOrgId, { limit: 5 });

      expect(images.length).toBe(5);
    });

    it('should order by creation date descending (newest first)', async () => {
      const img1 = await repo.create({ organizationId: testOrgId, r2Key: 'first.png' });
      const img2 = await repo.create({ organizationId: testOrgId, r2Key: 'second.png' });
      const img3 = await repo.create({ organizationId: testOrgId, r2Key: 'third.png' });

      const images = await repo.list(testOrgId);

      expect(images[0].r2Key).toBe('third.png');
      expect(images[1].r2Key).toBe('second.png');
      expect(images[2].r2Key).toBe('first.png');
    });
  });

  describe('listByFlow', () => {
    it('should list all images for a flow', async () => {
      await repo.create({ organizationId: testOrgId, flowId: testFlowId, r2Key: 'flow1.png' });
      await repo.create({ organizationId: testOrgId, flowId: testFlowId, r2Key: 'flow2.png' });
      await repo.create({ organizationId: testOrgId, r2Key: 'no-flow.png' });

      const images = await repo.listByFlow(testFlowId);

      expect(images.length).toBe(2);
      expect(images.every((i) => i.flowId === testFlowId)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return image when found', async () => {
      const created = await repo.create({
        organizationId: testOrgId,
        r2Key: 'findme.png',
      });

      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.r2Key).toBe('findme.png');
    });

    it('should return null when not found', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an image', async () => {
      const created = await repo.create({
        organizationId: testOrgId,
        r2Key: 'todelete.png',
      });

      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw when deleting non-existent image', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });
  });
});
