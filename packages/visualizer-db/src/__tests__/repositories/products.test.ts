/**
 * Product Repository Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProductRepository } from '../../repositories/products';
import { ProductImageRepository } from '../../repositories/product-images';
import { testDb } from '../setup';
import { createTestClient, createTestId } from '../helpers';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let imageRepo: ProductImageRepository;
  let testClientId: string;

  beforeEach(async () => {
    repo = new ProductRepository(testDb as any);
    imageRepo = new ProductImageRepository(testDb as any);

    const client = await createTestClient(testDb as any);
    testClientId = client.id;
  });

  describe('create', () => {
    it('should create a product with required fields', async () => {
      const product = await repo.create(testClientId, { name: 'Test Product' });

      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.clientId).toBe(testClientId);
      expect(product.isFavorite).toBe(false);
      expect(product.source).toBe('uploaded');
      expect(product.version).toBe(1);
    });

    it('should create a product with all optional fields', async () => {
      const product = await repo.create(testClientId, {
        name: 'Full Product',
        description: 'A test product with all fields',
        category: 'Furniture',
        sceneTypes: ['living-room', 'bedroom'],
        modelFilename: 'model.glb',
        isFavorite: true,
        source: 'imported',
        storeConnectionId: 'store-123',
        storeId: 'store-001',
        storeSku: 'SKU-001',
        storeUrl: 'https://shop.com/product',
        storeName: 'Product in Store',
        importedAt: new Date(),
        analysisData: {
          analyzedAt: new Date().toISOString(),
          productType: 'Chair',
          materials: ['wood'],
          colors: { primary: 'blue' },
          style: ['modern'],
          sceneTypes: ['living-room'],
          scaleHints: { width: '50cm', height: '80cm' },
          promptKeywords: ['blue', 'chair'],
          version: '1.0',
        },
        analysisVersion: '1.0',
        analyzedAt: new Date(),
        price: '199.99',
        metadata: { custom: 'value' },
      });

      expect(product.name).toBe('Full Product');
      expect(product.description).toBe('A test product with all fields');
      expect(product.category).toBe('Furniture');
      expect(product.sceneTypes).toEqual(['living-room', 'bedroom']);
      expect(product.modelFilename).toBe('model.glb');
      expect(product.isFavorite).toBe(true);
      expect(product.source).toBe('imported');
      expect(product.storeSku).toBe('SKU-001');
      expect(product.price).toBe('199.99');
      expect(product.metadata).toMatchObject({ custom: 'value' });
    });

    it('should set timestamps on creation', async () => {
      const product = await repo.create(testClientId, { name: 'Timestamp Test' });

      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('list', () => {
    it('should return all products for a client', async () => {
      await repo.create(testClientId, { name: 'Product A' });
      await repo.create(testClientId, { name: 'Product B' });
      await repo.create(testClientId, { name: 'Product C' });

      const products = await repo.list(testClientId);

      expect(products.length).toBe(3);
      expect(products.map((p) => p.name).sort()).toEqual(['Product A', 'Product B', 'Product C']);
    });

    it('should return empty array for client with no products', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty Client' });
      const products = await repo.list(newClient.id);

      expect(products).toEqual([]);
    });

    it('should not return products from other clients', async () => {
      const client2 = await createTestClient(testDb as any, { name: 'Other Client' });

      await repo.create(testClientId, { name: 'My Product' });
      await repo.create(client2.id, { name: 'Other Product' });

      const products = await repo.list(testClientId);

      expect(products.length).toBe(1);
      expect(products[0].name).toBe('My Product');
    });

    it('should return products ordered by createdAt ascending', async () => {
      await repo.create(testClientId, { name: 'First' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.create(testClientId, { name: 'Second' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repo.create(testClientId, { name: 'Third' });

      const products = await repo.list(testClientId);

      expect(products.length).toBe(3);
      for (let i = 1; i < products.length; i++) {
        expect(products[i - 1].createdAt.getTime()).toBeLessThanOrEqual(products[i].createdAt.getTime());
      }
    });
  });

  describe('listWithImages', () => {
    it('should return products with images', async () => {
      const product = await repo.create(testClientId, { name: 'Product With Images' });
      await imageRepo.create(product.id, { imageUrl: 'images/test1.png' });
      await imageRepo.create(product.id, { imageUrl: 'images/test2.png' });

      const productsWithImages = await repo.listWithImages(testClientId);

      expect(productsWithImages.length).toBe(1);
      expect(productsWithImages[0].images.length).toBe(2);
    });

    it('should return empty images array for products without images', async () => {
      await repo.create(testClientId, { name: 'No Images Product' });

      const productsWithImages = await repo.listWithImages(testClientId);

      expect(productsWithImages.length).toBe(1);
      expect(productsWithImages[0].images).toEqual([]);
    });
  });

  describe('getWithImages', () => {
    it('should return product with images by ID', async () => {
      const product = await repo.create(testClientId, { name: 'Single Product' });
      await imageRepo.create(product.id, { imageUrl: 'images/single.png' });

      const result = await repo.getWithImages(product.id);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Single Product');
      expect(result?.images.length).toBe(1);
    });

    it('should return null for non-existent product', async () => {
      const result = await repo.getWithImages('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update product name', async () => {
      const created = await repo.create(testClientId, { name: 'Original Name' });
      const updated = await repo.update(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.version).toBe(created.version + 1);
    });

    it('should update multiple fields', async () => {
      const created = await repo.create(testClientId, { name: 'Multi Update' });
      const updated = await repo.update(created.id, {
        name: 'New Name',
        description: 'New description',
        category: 'New Category',
        price: '299.99',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('New description');
      expect(updated.category).toBe('New Category');
      expect(updated.price).toBe('299.99');
    });

    it('should support optimistic locking', async () => {
      const created = await repo.create(testClientId, { name: 'Lock Test' });

      const updated = await repo.update(created.id, { name: 'After Update' }, created.version);
      expect(updated.name).toBe('After Update');

      await expect(repo.update(created.id, { name: 'Should Fail' }, created.version)).rejects.toThrow();
    });

    it('should throw for non-existent product', async () => {
      await expect(repo.update('non-existent', { name: 'Test' })).rejects.toThrow();
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repo.create(testClientId, { name: 'Timestamp Update' });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = await repo.update(created.id, { name: 'New Name' });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
  });

  describe('listWithFiltersAndImages', () => {
    beforeEach(async () => {
      await repo.create(testClientId, { name: 'Sofa Blue', category: 'Furniture', source: 'uploaded', sceneTypes: ['living-room'] });
      await repo.create(testClientId, { name: 'Chair Red', category: 'Furniture', source: 'imported', sceneTypes: ['office'] });
      await repo.create(testClientId, { name: 'Lamp White', category: 'Lighting', source: 'uploaded', sceneTypes: ['bedroom'] });
      await repo.create(testClientId, {
        name: 'Table Oak',
        category: 'Furniture',
        source: 'uploaded',
        sceneTypes: ['living-room', 'dining'],
        analyzedAt: new Date(),
      });
    });

    it('should filter by search term', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { search: 'Sofa' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Sofa Blue');
    });

    it('should filter by category', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { category: 'Furniture' });
      expect(results.length).toBe(3);
    });

    it('should filter by source', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { source: 'imported' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Chair Red');
    });

    it('should filter by sceneType', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { sceneType: 'living-room' });
      expect(results.length).toBe(2);
    });

    it('should filter by analyzed status (true)', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { analyzed: true });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Table Oak');
    });

    it('should filter by analyzed status (false)', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { analyzed: false });
      expect(results.length).toBe(3);
    });

    it('should sort by name ascending', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { sort: 'name', order: 'asc' });
      expect(results.map((p) => p.name)).toEqual(['Chair Red', 'Lamp White', 'Sofa Blue', 'Table Oak']);
    });

    it('should sort by name descending', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { sort: 'name', order: 'desc' });
      expect(results.map((p) => p.name)).toEqual(['Table Oak', 'Sofa Blue', 'Lamp White', 'Chair Red']);
    });

    it('should sort by category', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, { sort: 'category', order: 'asc' });
      const categories = results.map((p) => p.category);
      expect(categories[0]).toBe('Furniture');
    });

    it('should apply pagination with limit and offset', async () => {
      const page1 = await repo.listWithFiltersAndImages(testClientId, { limit: 2, offset: 0 });
      const page2 = await repo.listWithFiltersAndImages(testClientId, { limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should combine multiple filters', async () => {
      const results = await repo.listWithFiltersAndImages(testClientId, {
        category: 'Furniture',
        source: 'uploaded',
      });
      expect(results.length).toBe(2);
    });
  });

  describe('countWithFilters', () => {
    beforeEach(async () => {
      await repo.create(testClientId, { name: 'Product 1', category: 'Cat A' });
      await repo.create(testClientId, { name: 'Product 2', category: 'Cat A' });
      await repo.create(testClientId, { name: 'Product 3', category: 'Cat B' });
    });

    it('should count all products for client', async () => {
      const count = await repo.countWithFilters(testClientId);
      expect(count).toBe(3);
    });

    it('should count with filters', async () => {
      const count = await repo.countWithFilters(testClientId, { category: 'Cat A' });
      expect(count).toBe(2);
    });
  });

  describe('getDistinctCategories', () => {
    it('should return unique categories', async () => {
      await repo.create(testClientId, { name: 'P1', category: 'Furniture' });
      await repo.create(testClientId, { name: 'P2', category: 'Lighting' });
      await repo.create(testClientId, { name: 'P3', category: 'Furniture' });
      await repo.create(testClientId, { name: 'P4' }); // No category

      const categories = await repo.getDistinctCategories(testClientId);

      expect(categories).toEqual(['Furniture', 'Lighting']);
    });

    it('should return empty array when no categories', async () => {
      await repo.create(testClientId, { name: 'No Category' });

      const categories = await repo.getDistinctCategories(testClientId);
      expect(categories).toEqual([]);
    });
  });

  describe('getDistinctSceneTypes', () => {
    it('should return unique scene types from JSONB arrays', async () => {
      await repo.create(testClientId, { name: 'P1', sceneTypes: ['living-room', 'bedroom'] });
      await repo.create(testClientId, { name: 'P2', sceneTypes: ['office'] });
      await repo.create(testClientId, { name: 'P3', sceneTypes: ['living-room', 'kitchen'] });

      const sceneTypes = await repo.getDistinctSceneTypes(testClientId);

      expect(sceneTypes.sort()).toEqual(['bedroom', 'kitchen', 'living-room', 'office']);
    });

    it('should return empty array when no scene types', async () => {
      await repo.create(testClientId, { name: 'No Scene Types' });

      const sceneTypes = await repo.getDistinctSceneTypes(testClientId);
      expect(sceneTypes).toEqual([]);
    });
  });

  describe('getNamesByIds', () => {
    it('should return map of product IDs to names', async () => {
      const p1 = await repo.create(testClientId, { name: 'Product One' });
      const p2 = await repo.create(testClientId, { name: 'Product Two' });
      const p3 = await repo.create(testClientId, { name: 'Product Three' });

      const namesMap = await repo.getNamesByIds([p1.id, p2.id, p3.id]);

      expect(namesMap.size).toBe(3);
      expect(namesMap.get(p1.id)).toBe('Product One');
      expect(namesMap.get(p2.id)).toBe('Product Two');
      expect(namesMap.get(p3.id)).toBe('Product Three');
    });

    it('should return empty map for empty array', async () => {
      const namesMap = await repo.getNamesByIds([]);
      expect(namesMap.size).toBe(0);
    });

    it('should only return names for existing products', async () => {
      const p1 = await repo.create(testClientId, { name: 'Exists' });

      const namesMap = await repo.getNamesByIds([p1.id, 'non-existent']);

      expect(namesMap.size).toBe(1);
      expect(namesMap.get(p1.id)).toBe('Exists');
    });
  });

  describe('getByIds', () => {
    it('should batch fetch products by IDs', async () => {
      const p1 = await repo.create(testClientId, { name: 'Batch 1' });
      const p2 = await repo.create(testClientId, { name: 'Batch 2' });

      const productsMap = await repo.getByIds([p1.id, p2.id]);

      expect(productsMap.size).toBe(2);
      expect(productsMap.get(p1.id)?.name).toBe('Batch 1');
      expect(productsMap.get(p2.id)?.name).toBe('Batch 2');
    });

    it('should return empty map for empty array', async () => {
      const productsMap = await repo.getByIds([]);
      expect(productsMap.size).toBe(0);
    });
  });

  describe('count', () => {
    it('should count products for client', async () => {
      await repo.create(testClientId, { name: 'Count 1' });
      await repo.create(testClientId, { name: 'Count 2' });
      await repo.create(testClientId, { name: 'Count 3' });

      const count = await repo.count(testClientId);
      expect(count).toBe(3);
    });

    it('should return 0 for client with no products', async () => {
      const newClient = await createTestClient(testDb as any, { name: 'Empty' });
      const count = await repo.count(newClient.id);
      expect(count).toBe(0);
    });
  });

  describe('getById', () => {
    it('should return product by ID', async () => {
      const created = await repo.create(testClientId, { name: 'Find Me' });
      const found = await repo.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repo.getById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      const created = await repo.create(testClientId, { name: 'To Delete' });
      await repo.delete(created.id);

      const found = await repo.getById(created.id);
      expect(found).toBeNull();
    });

    it('should throw for non-existent product', async () => {
      await expect(repo.delete('non-existent')).rejects.toThrow();
    });
  });
});
