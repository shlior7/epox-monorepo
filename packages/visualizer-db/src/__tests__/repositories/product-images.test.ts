/**
 * Product Image Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { ProductImageRepository } from '../../repositories/product-images';
import { testDb } from '../setup';
import { createTestClient, createTestProduct } from '../helpers';

describe('ProductImageRepository', () => {
  let repo: ProductImageRepository;
  let testClientId: string;
  let testProductId: string;

  beforeEach(async () => {
    repo = new ProductImageRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;

    const product = await createTestProduct(testDb as any, testClientId);
    testProductId = product.id;
  });

  describe('create', () => {
    it('should create a product image', async () => {
      const image = await repo.create(testProductId, {
        r2KeyBase: 'images/product/test.png',
      });

      expect(image).toBeDefined();
      expect(image.id).toBeDefined();
      expect(image.productId).toBe(testProductId);
      expect(image.r2KeyBase).toBe('images/product/test.png');
      expect(image.version).toBe(1);
    });

    it('should set first image as primary automatically', async () => {
      const firstImage = await repo.create(testProductId, {
        r2KeyBase: 'images/first.png',
      });

      expect(firstImage.isPrimary).toBe(true);
    });

    it('should not set subsequent images as primary', async () => {
      await repo.create(testProductId, { r2KeyBase: 'images/first.png' });
      const secondImage = await repo.create(testProductId, {
        r2KeyBase: 'images/second.png',
      });

      expect(secondImage.isPrimary).toBe(false);
    });

    it('should explicitly set primary and clear others', async () => {
      const first = await repo.create(testProductId, { r2KeyBase: 'images/first.png' });
      expect(first.isPrimary).toBe(true);

      const second = await repo.create(testProductId, {
        r2KeyBase: 'images/second.png',
        isPrimary: true,
      });

      expect(second.isPrimary).toBe(true);

      // Check first is no longer primary
      const updatedFirst = await repo.getById(first.id);
      expect(updatedFirst?.isPrimary).toBe(false);
    });

    it('should set r2KeyPreview if provided', async () => {
      const image = await repo.create(testProductId, {
        r2KeyBase: 'images/base.png',
        r2KeyPreview: 'images/preview.png',
      });

      expect(image.r2KeyPreview).toBe('images/preview.png');
    });

    it('should set sortOrder if provided', async () => {
      const image = await repo.create(testProductId, {
        r2KeyBase: 'images/test.png',
        sortOrder: 5,
      });

      expect(image.sortOrder).toBe(5);
    });
  });

  describe('setPrimary', () => {
    it('should set an image as primary', async () => {
      const first = await repo.create(testProductId, { r2KeyBase: 'images/first.png' });
      const second = await repo.create(testProductId, { r2KeyBase: 'images/second.png' });

      expect(first.isPrimary).toBe(true);
      expect(second.isPrimary).toBe(false);

      const updated = await repo.setPrimary(testProductId, second.id);

      expect(updated.isPrimary).toBe(true);

      // Verify first is no longer primary
      const updatedFirst = await repo.getById(first.id);
      expect(updatedFirst?.isPrimary).toBe(false);
    });

    it('should throw for non-existent image', async () => {
      await expect(repo.setPrimary(testProductId, 'non-existent')).rejects.toThrow();
    });

    it('should throw if image belongs to different product', async () => {
      const otherProduct = await createTestProduct(testDb as any, testClientId, { name: 'Other Product' });
      const otherImage = await repo.create(otherProduct.id, { r2KeyBase: 'images/other.png' });

      await expect(repo.setPrimary(testProductId, otherImage.id)).rejects.toThrow();
    });
  });

  describe('getPrimary', () => {
    it('should return primary image', async () => {
      const first = await repo.create(testProductId, { r2KeyBase: 'images/first.png' });
      await repo.create(testProductId, { r2KeyBase: 'images/second.png' });

      const primary = await repo.getPrimary(testProductId);

      expect(primary).toBeDefined();
      expect(primary?.id).toBe(first.id);
    });

    it('should fallback to first by sort order if no primary', async () => {
      // Create images without isPrimary (first image gets isPrimary by default)
      const first = await repo.create(testProductId, { r2KeyBase: 'images/first.png', sortOrder: 0 });
      const second = await repo.create(testProductId, { r2KeyBase: 'images/second.png', sortOrder: 1 });

      // Manually clear primary (simulate edge case)
      await testDb.execute(sql`UPDATE product_image SET is_primary = false WHERE id = ${first.id}`);

      const primary = await repo.getPrimary(testProductId);

      expect(primary).toBeDefined();
      expect(primary?.id).toBe(first.id); // Falls back to first by sortOrder
    });

    it('should return null for product with no images', async () => {
      const primary = await repo.getPrimary(testProductId);
      expect(primary).toBeNull();
    });
  });

  describe('list', () => {
    it('should return images ordered by sortOrder', async () => {
      await repo.create(testProductId, { r2KeyBase: 'images/third.png', sortOrder: 2 });
      await repo.create(testProductId, { r2KeyBase: 'images/first.png', sortOrder: 0 });
      await repo.create(testProductId, { r2KeyBase: 'images/second.png', sortOrder: 1 });

      const images = await repo.list(testProductId);

      expect(images.length).toBe(3);
      expect(images[0].sortOrder).toBe(0);
      expect(images[1].sortOrder).toBe(1);
      expect(images[2].sortOrder).toBe(2);
    });

    it('should return empty array for product with no images', async () => {
      const images = await repo.list(testProductId);
      expect(images).toEqual([]);
    });
  });

  describe('listByProductIds', () => {
    it('should batch fetch images grouped by productId', async () => {
      const product2 = await createTestProduct(testDb as any, testClientId, { name: 'Product 2' });

      await repo.create(testProductId, { r2KeyBase: 'images/p1-1.png' });
      await repo.create(testProductId, { r2KeyBase: 'images/p1-2.png' });
      await repo.create(product2.id, { r2KeyBase: 'images/p2-1.png' });

      const imagesMap = await repo.listByProductIds([testProductId, product2.id]);

      expect(imagesMap.size).toBe(2);
      expect(imagesMap.get(testProductId)?.length).toBe(2);
      expect(imagesMap.get(product2.id)?.length).toBe(1);
    });

    it('should return empty map for empty array', async () => {
      const imagesMap = await repo.listByProductIds([]);
      expect(imagesMap.size).toBe(0);
    });

    it('should return empty arrays for products without images', async () => {
      const product2 = await createTestProduct(testDb as any, testClientId, { name: 'Empty Product' });

      const imagesMap = await repo.listByProductIds([testProductId, product2.id]);

      expect(imagesMap.get(testProductId)).toEqual([]);
      expect(imagesMap.get(product2.id)).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update image fields', async () => {
      const created = await repo.create(testProductId, { r2KeyBase: 'images/original.png' });

      const updated = await repo.update(created.id, {
        r2KeyPreview: 'images/new-preview.png',
        sortOrder: 10,
      });

      expect(updated.r2KeyPreview).toBe('images/new-preview.png');
      expect(updated.sortOrder).toBe(10);
      expect(updated.version).toBe(created.version + 1);
    });

    it('should support optimistic locking', async () => {
      const created = await repo.create(testProductId, { r2KeyBase: 'images/lock.png' });

      const updated = await repo.update(created.id, { sortOrder: 5 }, created.version);
      expect(updated.sortOrder).toBe(5);

      await expect(repo.update(created.id, { sortOrder: 10 }, created.version)).rejects.toThrow();
    });
  });

  describe('reorder', () => {
    it('should reorder images by ID list', async () => {
      const img1 = await repo.create(testProductId, { r2KeyBase: 'images/1.png', sortOrder: 0 });
      const img2 = await repo.create(testProductId, { r2KeyBase: 'images/2.png', sortOrder: 1 });
      const img3 = await repo.create(testProductId, { r2KeyBase: 'images/3.png', sortOrder: 2 });

      // Reverse the order
      await repo.reorder(testProductId, [img3.id, img2.id, img1.id]);

      const images = await repo.list(testProductId);

      expect(images[0].id).toBe(img3.id);
      expect(images[0].sortOrder).toBe(0);
      expect(images[1].id).toBe(img2.id);
      expect(images[1].sortOrder).toBe(1);
      expect(images[2].id).toBe(img1.id);
      expect(images[2].sortOrder).toBe(2);
    });

    it('should throw for missing image IDs', async () => {
      const img1 = await repo.create(testProductId, { r2KeyBase: 'images/1.png' });

      await expect(repo.reorder(testProductId, [img1.id, 'non-existent'])).rejects.toThrow();
    });

    it('should do nothing for empty array', async () => {
      await repo.create(testProductId, { r2KeyBase: 'images/1.png', sortOrder: 5 });

      await repo.reorder(testProductId, []);

      const images = await repo.list(testProductId);
      expect(images[0].sortOrder).toBe(5); // Unchanged
    });
  });

  describe('reorderByImageIds', () => {
    it('should reorder by filename-derived IDs', async () => {
      await repo.create(testProductId, { r2KeyBase: 'images/product/img-001.png', sortOrder: 0 });
      await repo.create(testProductId, { r2KeyBase: 'images/product/img-002.png', sortOrder: 1 });
      await repo.create(testProductId, { r2KeyBase: 'images/product/img-003.png', sortOrder: 2 });

      // Reorder by filename IDs (without extension)
      await repo.reorderByImageIds(testProductId, ['img-003', 'img-001', 'img-002']);

      const images = await repo.list(testProductId);

      expect(images[0].r2KeyBase).toBe('images/product/img-003.png');
      expect(images[1].r2KeyBase).toBe('images/product/img-001.png');
      expect(images[2].r2KeyBase).toBe('images/product/img-002.png');
    });

    it('should do nothing for empty array', async () => {
      await repo.create(testProductId, { r2KeyBase: 'images/1.png', sortOrder: 5 });

      await repo.reorderByImageIds(testProductId, []);

      const images = await repo.list(testProductId);
      expect(images[0].sortOrder).toBe(5); // Unchanged
    });
  });

  describe('getById', () => {
    it('should return image by ID', async () => {
      const created = await repo.create(testProductId, { r2KeyBase: 'images/find.png' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an image', async () => {
      const created = await repo.create(testProductId, { r2KeyBase: 'images/delete.png' });
      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent image', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });
  });
});
