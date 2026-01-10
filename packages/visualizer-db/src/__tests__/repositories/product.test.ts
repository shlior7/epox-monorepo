/**
 * Product Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductRepository } from '../../repositories/products';
import { ProductImageRepository } from '../../repositories/product-images';
import { testDb } from '../setup';
import { createTestOrganization, createTestId } from '../helpers';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let imageRepo: ProductImageRepository;
  let testOrgId: string;

  beforeEach(async () => {
    repo = new ProductRepository(testDb as any);
    imageRepo = new ProductImageRepository(testDb as any);

    // Create a test organization for products
    const org = await createTestOrganization(testDb as any);
    testOrgId = org.id;
  });

  describe('create', () => {
    it('should create a product with required fields', async () => {
      const product = await repo.create(testOrgId, {
        name: 'Test Product',
      });

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.organizationId).toBe(testOrgId);
      expect(product.name).toBe('Test Product');
      expect(product.description).toBeNull();
      expect(product.category).toBeNull();
      expect(product.version).toBe(1);
    });

    it('should create a product with all fields', async () => {
      const product = await repo.create(testOrgId, {
        name: 'Full Product',
        description: 'A complete product',
        category: 'furniture',
        roomTypes: ['living-room', 'bedroom'],
        modelFilename: 'model.glb',
      });

      expect(product.name).toBe('Full Product');
      expect(product.description).toBe('A complete product');
      expect(product.category).toBe('furniture');
      expect(product.roomTypes).toEqual(['living-room', 'bedroom']);
      expect(product.modelFilename).toBe('model.glb');
    });
  });

  describe('list', () => {
    it('should list products for an organization', async () => {
      await repo.create(testOrgId, { name: 'Product 1' });
      await repo.create(testOrgId, { name: 'Product 2' });

      // Create product in different org - should not be included
      const otherOrg = await createTestOrganization(testDb as any);
      await repo.create(otherOrg.id, { name: 'Other Org Product' });

      const products = await repo.list(testOrgId);

      expect(products.length).toBe(2);
      expect(products.some((p) => p.name === 'Product 1')).toBe(true);
      expect(products.some((p) => p.name === 'Product 2')).toBe(true);
      expect(products.some((p) => p.name === 'Other Org Product')).toBe(false);
    });

    it('should order products by creation date', async () => {
      // Create products with small delays to ensure order
      const p1 = await repo.create(testOrgId, { name: 'First' });
      const p2 = await repo.create(testOrgId, { name: 'Second' });
      const p3 = await repo.create(testOrgId, { name: 'Third' });

      const products = await repo.list(testOrgId);

      expect(products[0].name).toBe('First');
      expect(products[1].name).toBe('Second');
      expect(products[2].name).toBe('Third');
    });
  });

  describe('listWithImages', () => {
    it('should list products with their images', async () => {
      const product = await repo.create(testOrgId, { name: 'Product with Images' });

      await imageRepo.create(product.id, {
        r2KeyBase: 'images/base1.png',
        r2KeyPreview: 'images/preview1.jpg',
        sortOrder: 0,
      });
      await imageRepo.create(product.id, {
        r2KeyBase: 'images/base2.png',
        sortOrder: 1,
      });

      const productsWithImages = await repo.listWithImages(testOrgId);
      const found = productsWithImages.find((p) => p.id === product.id);

      expect(found).toBeDefined();
      expect(found?.images.length).toBe(2);
      expect(found?.images[0].r2KeyBase).toBe('images/base1.png');
      expect(found?.images[1].r2KeyBase).toBe('images/base2.png');
    });

    it('should return empty images array for product without images', async () => {
      await repo.create(testOrgId, { name: 'No Images Product' });

      const productsWithImages = await repo.listWithImages(testOrgId);
      const found = productsWithImages.find((p) => p.name === 'No Images Product');

      expect(found).toBeDefined();
      expect(found?.images).toEqual([]);
    });
  });

  describe('getWithImages', () => {
    it('should get a single product with images', async () => {
      const product = await repo.create(testOrgId, { name: 'Single Product' });
      await imageRepo.create(product.id, { r2KeyBase: 'img.png' });

      const found = await repo.getWithImages(product.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Single Product');
      expect(found?.images.length).toBe(1);
    });

    it('should return null for non-existent product', async () => {
      const found = await repo.getWithImages('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getWithDetails', () => {
    it('should get product with images and chat sessions', async () => {
      const product = await repo.create(testOrgId, { name: 'Detailed Product' });
      await imageRepo.create(product.id, { r2KeyBase: 'detail.png' });

      const details = await repo.getWithDetails(product.id);

      expect(details).toBeDefined();
      expect(details?.name).toBe('Detailed Product');
      expect(details?.images.length).toBe(1);
      expect(details?.chatSessions).toBeDefined();
      expect(Array.isArray(details?.chatSessions)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const product = await repo.create(testOrgId, { name: 'Original' });

      const updated = await repo.update(product.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('New description');
      expect(updated.version).toBe(2);
    });

    it('should support optimistic locking', async () => {
      const product = await repo.create(testOrgId, { name: 'Locked' });

      // Update with correct version
      const updated1 = await repo.update(product.id, { name: 'V2' }, 1);
      expect(updated1.version).toBe(2);

      // Update with wrong version should fail
      await expect(repo.update(product.id, { name: 'V3' }, 1)).rejects.toThrow();
    });
  });
});
