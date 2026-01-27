/**
 * Products API Tests
 * Tests CRUD operations for /api/products and /api/products/[id]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getProducts, POST as createProduct } from '@/app/api/products/route';
import {
  GET as getProduct,
  PATCH as updateProduct,
  DELETE as deleteProduct,
} from '@/app/api/products/[id]/route';
import { NextRequest } from 'next/server';

// Mock the db module with all required facade methods
vi.mock('@/lib/services/db', () => ({
  db: {
    products: {
      list: vi.fn(),
      create: vi.fn(),
      getById: vi.fn(),
      getWithImages: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      listWithFiltersAndImages: vi.fn(),
      countWithFilters: vi.fn(),
      getDistinctCategories: vi.fn(),
      getDistinctSceneTypes: vi.fn(),
    },
    generatedAssets: {
      listByProductId: vi.fn(),
      // Optimized stats query
      getStatsByProductId: vi.fn(),
    },
    collectionSessions: {
      listByProductId: vi.fn(),
    },
  },
}));

// Mock storage module
vi.mock('@/lib/services/storage', () => ({
  storage: {
    getPublicUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`),
  },
}));

import { db } from '@/lib/services/db';

describe('Products API - GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for list endpoint
    vi.mocked(db.products.countWithFilters).mockResolvedValue(0);
    vi.mocked(db.products.listWithFiltersAndImages).mockResolvedValue([]);
    vi.mocked(db.products.getDistinctCategories).mockResolvedValue([]);
    vi.mocked(db.products.getDistinctSceneTypes).mockResolvedValue([]);
  });

  it('should return empty list when no products exist', async () => {
    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await getProducts(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toEqual([]);
    expect(data.pagination).toMatchObject({
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('should validate pagination parameters', async () => {
    const request = new NextRequest('http://localhost:3000/api/products?page=-1');
    const response = await getProducts(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid pagination');
  });

  it('should respect limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/products?limit=5');
    await getProducts(request);

    expect(db.products.listWithFiltersAndImages).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ limit: 5 })
    );
  });

  it('should filter by category', async () => {
    const request = new NextRequest('http://localhost:3000/api/products?category=Chairs');
    await getProducts(request);

    expect(db.products.listWithFiltersAndImages).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ category: 'Chairs' })
    );
  });

  it('should filter by source', async () => {
    const request = new NextRequest('http://localhost:3000/api/products?source=imported');
    await getProducts(request);

    expect(db.products.listWithFiltersAndImages).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ source: 'imported' })
    );
  });
});

describe('Products API - POST /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new product with valid data', async () => {
    const mockProduct = {
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Test Chair',
      category: 'Chairs',
      sceneTypes: ['living-room'],
      source: 'uploaded' as const,
      description: 'A comfortable chair',
      storeSku: 'CHAIR-001',
      isFavorite: false,
      modelFilename: null,
      version: 1,
      storeConnectionId: null,
      storeId: null,
      storeUrl: null,
      storeName: null,
      selectedSceneType: null,
      importedAt: null,
      analysisData: null,
      analysisVersion: null,
      analyzedAt: null,
      price: '299.99',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(db.products.create).mockResolvedValue(mockProduct);

    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Chair',
        category: 'Chairs',
        sceneTypes: ['living-room'],
        price: 299.99,
        description: 'A comfortable chair',
      }),
    });

    const response = await createProduct(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe('Test Chair');
    expect(data.category).toBe('Chairs');
    expect(data.price).toBe(299.99);
  });

  it('should reject empty name', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        category: 'Chairs',
      }),
    });

    const response = await createProduct(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Name');
  });

  it('should reject name longer than 255 characters', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'a'.repeat(256),
        category: 'Chairs',
      }),
    });

    const response = await createProduct(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('255 characters');
  });

  it('should reject invalid sceneTypes', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Chair',
        sceneTypes: 'invalid', // Should be array
      }),
    });

    const response = await createProduct(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('sceneTypes must be an array');
  });

  it('should reject negative price', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Chair',
        price: -100,
      }),
    });

    const response = await createProduct(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('price must be a non-negative number');
  });
});

describe('Products API - GET /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks for detail endpoint
    vi.mocked(db.generatedAssets.listByProductId).mockResolvedValue([]);
    vi.mocked(db.generatedAssets.getStatsByProductId).mockResolvedValue({
      totalGenerated: 0,
      pinnedCount: 0,
      approvedCount: 0,
      pendingCount: 0,
    });
    vi.mocked(db.collectionSessions.listByProductId).mockResolvedValue([]);
  });

  it('should return product with all images', async () => {
    const mockProduct = {
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Test Chair',
      category: 'Chairs',
      sceneTypes: ['living-room'],
      source: 'uploaded' as const,
      description: 'A comfortable chair',
      storeSku: 'CHAIR-001',
      isFavorite: false,
      modelFilename: null,
      version: 1,
      storeConnectionId: null,
      storeId: null,
      storeUrl: null,
      storeName: null,
      selectedSceneType: null,
      importedAt: null,
      analyzedAt: new Date(),
      analysisData: {
        analyzedAt: '2025-01-01T00:00:00Z',
        productType: 'chair',
        materials: ['wood'],
        colors: { primary: 'brown', accent: ['dark-brown'] },
        style: ['modern'],
        sceneTypes: ['living-room'],
        scaleHints: { width: '80cm', height: '90cm' },
        promptKeywords: ['chair', 'furniture', 'wood', 'modern'],
        version: '1.0',
      },
      analysisVersion: null,
      price: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [
        {
          id: 'img-1',
          productId: 'prod-1',
          imageUrl: 'products/img1.jpg',
          previewUrl: null,
          sortOrder: 0,
          isPrimary: true,
          syncStatus: 'local' as const,
          originalStoreUrl: null,
          externalImageId: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'img-2',
          productId: 'prod-1',
          imageUrl: 'products/img2.jpg',
          previewUrl: null,
          sortOrder: 1,
          isPrimary: false,
          syncStatus: 'local' as const,
          originalStoreUrl: null,
          externalImageId: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    vi.mocked(db.products.getWithImages).mockResolvedValue(mockProduct);

    const request = new NextRequest('http://localhost:3000/api/products/prod-1');
    const response = await getProduct(request, { params: Promise.resolve({ id: 'prod-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.baseImages).toHaveLength(2);
    expect(data.baseImages[0].url).toContain('products/img1.jpg');
    expect(data.baseImages[1].url).toContain('products/img2.jpg');
  });

  it('should return 404 for non-existent product', async () => {
    vi.mocked(db.products.getWithImages).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/products/invalid-id');
    const response = await getProduct(request, { params: Promise.resolve({ id: 'invalid-id' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Product not found');
  });
});

describe('Products API - PATCH /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update product name', async () => {
    const existingProduct = {
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Old Name',
      category: 'Chairs',
      sceneTypes: [],
      source: 'uploaded' as const,
      description: '',
      storeSku: null,
      isFavorite: false,
      modelFilename: null,
      version: 1,
      storeConnectionId: null,
      storeId: null,
      storeUrl: null,
      storeName: null,
      selectedSceneType: null,
      importedAt: null,
      analysisData: null,
      analysisVersion: null,
      analyzedAt: null,
      price: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedProduct = {
      ...existingProduct,
      name: 'New Name',
      price: null,
      metadata: null,
      updatedAt: new Date(),
    };

    vi.mocked(db.products.getById).mockResolvedValue(existingProduct);
    vi.mocked(db.products.update).mockResolvedValue(updatedProduct);

    const request = new NextRequest('http://localhost:3000/api/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await updateProduct(request, { params: Promise.resolve({ id: 'prod-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('New Name');
  });

  it('should reject invalid name update', async () => {
    vi.mocked(db.products.getById).mockResolvedValue({
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Test',
      category: 'Chairs',
      sceneTypes: [],
      source: 'uploaded' as const,
      description: '',
      storeSku: null,
      isFavorite: false,
      modelFilename: null,
      version: 1,
      storeConnectionId: null,
      storeId: null,
      storeUrl: null,
      storeName: null,
      selectedSceneType: null,
      importedAt: null,
      analysisData: null,
      analysisVersion: null,
      analyzedAt: null,
      price: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/products/prod-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const response = await updateProduct(request, { params: Promise.resolve({ id: 'prod-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Name must be a non-empty string');
  });

  it('should return 404 for non-existent product', async () => {
    vi.mocked(db.products.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/products/invalid-id', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await updateProduct(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(404);
  });
});

describe('Products API - DELETE /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete existing product', async () => {
    vi.mocked(db.products.getById).mockResolvedValue({
      id: 'prod-1',
      clientId: 'test-client',
      name: 'Test',
      category: 'Chairs',
      sceneTypes: [],
      source: 'uploaded' as const,
      description: '',
      storeSku: null,
      isFavorite: false,
      modelFilename: null,
      version: 1,
      storeConnectionId: null,
      storeId: null,
      storeUrl: null,
      storeName: null,
      selectedSceneType: null,
      importedAt: null,
      analysisData: null,
      analysisVersion: null,
      analyzedAt: null,
      price: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.products.delete).mockResolvedValue();

    const request = new NextRequest('http://localhost:3000/api/products/prod-1', {
      method: 'DELETE',
    });

    const response = await deleteProduct(request, { params: Promise.resolve({ id: 'prod-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe('prod-1');
  });

  it('should return 404 for non-existent product', async () => {
    vi.mocked(db.products.getById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/products/invalid-id', {
      method: 'DELETE',
    });

    const response = await deleteProduct(request, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });

    expect(response.status).toBe(404);
  });
});
