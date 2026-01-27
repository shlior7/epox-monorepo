import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WooCommerceProvider, isWooCommerceCredentials, type WooCommerceCredentials, type WooCommerceCallbackPayload } from './index';
import type { AuthParams, AuthState } from '../base';

describe('WooCommerceProvider', () => {
  let provider: WooCommerceProvider;

  beforeEach(() => {
    provider = new WooCommerceProvider();
  });

  describe('config', () => {
    it('should have correct config', () => {
      expect(provider.config).toEqual({
        type: 'woocommerce',
        name: 'WooCommerce',
        authMethod: 'oauth',
        callbackMethod: 'POST',
        scopes: ['read_write'],
      });
    });
  });

  describe('buildAuthUrl()', () => {
    const baseParams: AuthParams = {
      clientId: 'client-123',
      storeUrl: 'https://example.com',
      appName: 'Test App',
      callbackUrl: 'https://app.com/callback',
      returnUrl: 'https://app.com/settings',
    };

    it('should build correct auth URL', () => {
      const url = provider.buildAuthUrl(baseParams, 'state-abc');
      const parsed = new URL(url);

      expect(parsed.origin).toBe('https://example.com');
      expect(parsed.pathname).toBe('/wc-auth/v1/authorize');
      expect(parsed.searchParams.get('app_name')).toBe('Test App');
      expect(parsed.searchParams.get('scope')).toBe('read_write');
      expect(parsed.searchParams.get('user_id')).toBe('state-abc');
      expect(parsed.searchParams.get('callback_url')).toBe('https://app.com/callback');
      expect(parsed.searchParams.get('return_url')).toBe('https://app.com/settings');
    });

    it('should normalize store URL without protocol', () => {
      const params = { ...baseParams, storeUrl: 'example.com' };
      const url = provider.buildAuthUrl(params, 'state-abc');
      expect(url).toContain('https://example.com');
    });

    it('should remove trailing slash from store URL', () => {
      const params = { ...baseParams, storeUrl: 'https://example.com/' };
      const url = provider.buildAuthUrl(params, 'state-abc');
      expect(url).toContain('https://example.com/wc-auth');
    });

    it('should use default return URL when not provided', () => {
      const { returnUrl: _unused, ...paramsWithoutReturnUrl } = baseParams;
      const url = provider.buildAuthUrl(paramsWithoutReturnUrl, 'state-abc');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('return_url')).toBe('https://app.com/complete');
    });
  });

  describe('parseCallback()', () => {
    const mockState: AuthState = {
      id: 'state-123',
      clientId: 'client-abc',
      provider: 'woocommerce',
      storeUrl: 'https://store.com',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    };

    it('should parse valid callback payload', async () => {
      const payload: WooCommerceCallbackPayload = {
        key_id: 1,
        user_id: 42,
        consumer_key: 'ck_test123',
        consumer_secret: 'cs_secret456',
        key_permissions: 'read_write',
      };

      const credentials = await provider.parseCallback(payload, mockState);

      expect(credentials).toEqual({
        baseUrl: 'https://store.com',
        consumerKey: 'ck_test123',
        consumerSecret: 'cs_secret456',
        keyId: 1,
        userId: 42,
        keyPermissions: 'read_write',
      });
    });

    it('should throw if consumer_key is missing', async () => {
      const payload = { consumer_secret: 'cs_secret456' };
      await expect(provider.parseCallback(payload, mockState)).rejects.toThrow('Missing consumer_key or consumer_secret');
    });

    it('should throw if consumer_secret is missing', async () => {
      const payload = { consumer_key: 'ck_test123' };
      await expect(provider.parseCallback(payload, mockState)).rejects.toThrow('Missing consumer_key or consumer_secret');
    });
  });

  describe('createAuthState()', () => {
    it('should create valid auth state', () => {
      const params: AuthParams = {
        clientId: 'client-123',
        storeUrl: 'https://store.com/',
        appName: 'App',
        callbackUrl: 'https://app.com/callback',
        returnUrl: 'https://app.com/return',
      };
      const expiresAt = new Date(Date.now() + 60000);

      const state = provider.createAuthState(params, 'state-id', expiresAt);

      expect(state.id).toBe('state-id');
      expect(state.clientId).toBe('client-123');
      expect(state.provider).toBe('woocommerce');
      expect(state.storeUrl).toBe('https://store.com'); // normalized
      expect(state.returnUrl).toBe('https://app.com/return');
      expect(state.expiresAt).toBe(expiresAt);
    });
  });
});

describe('isWooCommerceCredentials()', () => {
  it('should return true for valid credentials', () => {
    const creds: WooCommerceCredentials = {
      baseUrl: 'https://store.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    };
    expect(isWooCommerceCredentials(creds)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isWooCommerceCredentials(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isWooCommerceCredentials(undefined)).toBe(false);
  });

  it('should return false for missing baseUrl', () => {
    expect(isWooCommerceCredentials({ consumerKey: 'ck', consumerSecret: 'cs' })).toBe(false);
  });

  it('should return false for missing consumerKey', () => {
    expect(isWooCommerceCredentials({ baseUrl: 'url', consumerSecret: 'cs' })).toBe(false);
  });

  it('should return false for missing consumerSecret', () => {
    expect(isWooCommerceCredentials({ baseUrl: 'url', consumerKey: 'ck' })).toBe(false);
  });
});

describe('api', () => {
  let provider: WooCommerceProvider;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockCredentials: WooCommerceCredentials;

  beforeEach(() => {
    provider = new WooCommerceProvider();
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockCredentials = {
      baseUrl: 'https://store.com',
      consumerKey: 'ck_test',
      consumerSecret: 'cs_test',
    };

    // Mock the createClient method
    vi.spyOn(provider as any, 'createClient').mockReturnValue(mockClient);
  });

  describe('testConnection()', () => {
    it('should return true when connection succeeds', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const result = await provider.testConnection(mockCredentials);

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('products', { per_page: 1 });
    });

    it('should return false when connection fails', async () => {
      mockClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection(mockCredentials);

      expect(result).toBe(false);
    });
  });

  describe('getProducts()', () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Product 1',
        status: 'publish',
        type: 'simple',
        description: '<p>Description 1</p>',
        short_description: '<p>Short desc 1</p>',
        sku: 'SKU1',
        images: [
          { id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' },
        ],
        categories: [{ id: 5, name: 'Category 1', slug: 'cat-1' }],
      },
      {
        id: 2,
        name: 'Product 2',
        status: 'publish',
        type: 'variable',
        description: '<p>Description 2</p>',
        short_description: '<p>Short desc 2</p>',
        sku: 'SKU2',
        images: [
          { id: 20, src: 'https://example.com/img2.jpg', alt: 'Image 2' },
        ],
        categories: [{ id: 6, name: 'Category 2', slug: 'cat-2' }],
      },
    ];

    it('should fetch products with default options', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      const result = await provider.getProducts(mockCredentials);

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 1,
        status: 'publish',
      });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.items[0]).toEqual({
        id: 1,
        name: 'Product 1',
        status: 'publish',
        type: 'simple',
        description: 'Description 1',
        shortDescription: 'Short desc 1',
        sku: 'SKU1',
        images: [{ id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' }],
        categories: [{ id: 5, name: 'Category 1', slug: 'cat-1' }],
      });
    });

    it('should respect limit option', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts.slice(0, 1),
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '2' },
      });

      const result = await provider.getProducts(mockCredentials, { limit: 1 });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 1,
        page: 1,
        status: 'publish',
      });
      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should respect page option', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts.slice(1),
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '2' },
      });

      const result = await provider.getProducts(mockCredentials, { page: 2 });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 2,
        status: 'publish',
      });
      expect(result.page).toBe(2);
    });

    it('should filter by search query', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      await provider.getProducts(mockCredentials, { search: 'Product' });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 1,
        status: 'publish',
        search: 'Product',
      });
    });

    it('should filter by category', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      await provider.getProducts(mockCredentials, { category: '5' });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 1,
        status: 'publish',
        category: '5',
      });
    });

    it('should filter by product IDs', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      await provider.getProducts(mockCredentials, { ids: ['1', '2'] });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 1,
        status: 'publish',
        include: [1, 2],
      });
    });

    it('should handle empty product IDs array', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      await provider.getProducts(mockCredentials, { ids: [] });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 10,
        page: 1,
        status: 'publish',
      });
    });

    it('should cap limit at 100', async () => {
      mockClient.get.mockResolvedValue({
        data: [],
        headers: { 'x-wp-total': '0', 'x-wp-totalpages': '0' },
      });

      await provider.getProducts(mockCredentials, { limit: 150 });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 100,
        page: 1,
        status: 'publish',
      });
    });

    it('should combine multiple options', async () => {
      mockClient.get.mockResolvedValue({
        data: mockProducts,
        headers: { 'x-wp-total': '2', 'x-wp-totalpages': '1' },
      });

      await provider.getProducts(mockCredentials, {
        limit: 20,
        page: 2,
        search: 'test',
        category: '5',
        ids: ['1', '2', '3'],
      });

      expect(mockClient.get).toHaveBeenCalledWith('products', {
        per_page: 20,
        page: 2,
        status: 'publish',
        search: 'test',
        category: '5',
        include: [1, 2, 3],
      });
    });
  });

  describe('getProduct()', () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      status: 'publish',
      type: 'simple',
      description: '<p>Description</p>',
      short_description: '<p>Short desc</p>',
      sku: 'TEST-SKU',
      images: [{ id: 10, src: 'https://example.com/img.jpg', alt: 'Image' }],
      categories: [{ id: 5, name: 'Category', slug: 'category' }],
    };

    it('should fetch product by ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });

      const result = await provider.getProduct(mockCredentials, 1);

      expect(mockClient.get).toHaveBeenCalledWith('products/1');
      expect(result).toEqual({
        id: 1,
        name: 'Test Product',
        status: 'publish',
        type: 'simple',
        description: 'Description',
        shortDescription: 'Short desc',
        sku: 'TEST-SKU',
        images: [{ id: 10, src: 'https://example.com/img.jpg', alt: 'Image' }],
        categories: [{ id: 5, name: 'Category', slug: 'category' }],
      });
    });

    it('should accept string product ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });

      await provider.getProduct(mockCredentials, '123');

      expect(mockClient.get).toHaveBeenCalledWith('products/123');
    });

    it('should return null when product not found', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'));

      const result = await provider.getProduct(mockCredentials, 999);

      expect(result).toBeNull();
    });
  });

  describe('getCategories()', () => {
    const mockCategories = [
      { id: 1, name: 'Electronics', slug: 'electronics', count: 10 },
      { id: 2, name: 'Clothing', slug: 'clothing', count: 25 },
      { id: 3, name: 'Books', slug: 'books', count: 5 },
    ];

    it('should fetch all categories', async () => {
      mockClient.get.mockResolvedValue({ data: mockCategories });

      const result = await provider.getCategories(mockCredentials);

      expect(mockClient.get).toHaveBeenCalledWith('products/categories', {
        per_page: 100,
        hide_empty: true,
      });
      expect(result).toEqual([
        { id: 1, name: 'Electronics', slug: 'electronics', count: 10 },
        { id: 2, name: 'Clothing', slug: 'clothing', count: 25 },
        { id: 3, name: 'Books', slug: 'books', count: 5 },
      ]);
    });

    it('should return empty array when no categories', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const result = await provider.getCategories(mockCredentials);

      expect(result).toEqual([]);
    });
  });

  describe('updateProductImages()', () => {
    const mockProduct = {
      id: 1,
      images: [
        { id: 10, src: 'https://example.com/existing.jpg', alt: 'Existing' },
      ],
    };

    it('should append new images to product', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({
        data: {
          ...mockProduct,
          images: [
            { id: 10, src: 'https://example.com/existing.jpg', alt: 'Existing' },
            { id: 20, src: 'https://example.com/new1.jpg', alt: 'New 1' },
            { id: 21, src: 'https://example.com/new2.jpg', alt: 'New 2' },
          ],
        },
      });

      const newImages = [
        { src: 'https://example.com/new1.jpg', alt: 'New 1' },
        { src: 'https://example.com/new2.jpg', alt: 'New 2' },
      ];

      const result = await provider.updateProductImages(mockCredentials, 1, newImages);

      expect(mockClient.get).toHaveBeenCalledWith('products/1');
      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: [
          { id: 10, src: 'https://example.com/existing.jpg', alt: 'Existing' },
          { src: 'https://example.com/new1.jpg', alt: 'New 1', name: '' },
          { src: 'https://example.com/new2.jpg', alt: 'New 2', name: '' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 20, src: 'https://example.com/new1.jpg', alt: 'New 1' });
      expect(result[1]).toEqual({ id: 21, src: 'https://example.com/new2.jpg', alt: 'New 2' });
    });

    it('should handle product with no existing images', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 1, images: [] } });
      mockClient.put.mockResolvedValue({
        data: {
          id: 1,
          images: [{ id: 20, src: 'https://example.com/new.jpg', alt: 'New' }],
        },
      });

      const result = await provider.updateProductImages(mockCredentials, 1, [
        { src: 'https://example.com/new.jpg', alt: 'New' },
      ]);

      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: [{ src: 'https://example.com/new.jpg', alt: 'New', name: '' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(20);
    });

    it('should handle images with name property', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({
        data: {
          ...mockProduct,
          images: [
            { id: 10, src: 'https://example.com/existing.jpg', alt: 'Existing' },
            { id: 20, src: 'https://example.com/new.jpg', alt: 'New', name: 'new-image' },
          ],
        },
      });

      const result = await provider.updateProductImages(mockCredentials, 1, [
        { src: 'https://example.com/new.jpg', alt: 'New', name: 'new-image' },
      ]);

      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: [
          { id: 10, src: 'https://example.com/existing.jpg', alt: 'Existing' },
          { src: 'https://example.com/new.jpg', alt: 'New', name: 'new-image' },
        ],
      });
      expect(result).toHaveLength(1);
    });

    it('should accept string product ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({ data: mockProduct });

      await provider.updateProductImages(mockCredentials, '123', [
        { src: 'https://example.com/new.jpg' },
      ]);

      expect(mockClient.get).toHaveBeenCalledWith('products/123');
      expect(mockClient.put).toHaveBeenCalledWith('products/123', expect.any(Object));
    });
  });

  describe('deleteProductImage()', () => {
    const mockProduct = {
      id: 1,
      images: [
        { id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' },
        { id: 20, src: 'https://example.com/img2.jpg', alt: 'Image 2' },
        { id: 30, src: 'https://example.com/img3.jpg', alt: 'Image 3' },
      ],
    };

    it('should remove image from product', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({ data: {} });

      await provider.deleteProductImage(mockCredentials, 1, 20);

      expect(mockClient.get).toHaveBeenCalledWith('products/1');
      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: [
          { id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' },
          { id: 30, src: 'https://example.com/img3.jpg', alt: 'Image 3' },
        ],
      });
    });

    it('should handle string image ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({ data: {} });

      await provider.deleteProductImage(mockCredentials, 1, '20');

      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: [
          { id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' },
          { id: 30, src: 'https://example.com/img3.jpg', alt: 'Image 3' },
        ],
      });
    });

    it('should handle non-existent image ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({ data: {} });

      await provider.deleteProductImage(mockCredentials, 1, 999);

      // Should still call update with all existing images
      expect(mockClient.put).toHaveBeenCalledWith('products/1', {
        images: mockProduct.images,
      });
    });

    it('should accept string product ID', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });
      mockClient.put.mockResolvedValue({ data: {} });

      await provider.deleteProductImage(mockCredentials, '123', 20);

      expect(mockClient.get).toHaveBeenCalledWith('products/123');
      expect(mockClient.put).toHaveBeenCalledWith('products/123', expect.any(Object));
    });
  });

  describe('registerWebhook()', () => {
    it('should register single webhook', async () => {
      mockClient.post.mockResolvedValue({
        data: { id: 1, name: 'Epox product.created webhook', status: 'active' },
      });

      const config = {
        events: ['product.created'],
        callbackUrl: 'https://app.com/webhook',
        secret: 'secret123',
      };

      const result = await provider.registerWebhook(mockCredentials, config);

      expect(mockClient.post).toHaveBeenCalledWith('webhooks', {
        name: 'Epox product.created webhook',
        topic: 'product.created',
        delivery_url: 'https://app.com/webhook',
        secret: 'secret123',
        status: 'active',
      });
      expect(result.webhookId).toBe('1');
      expect(result.events).toEqual(['product.created']);
    });

    it('should register multiple webhooks', async () => {
      mockClient.post
        .mockResolvedValueOnce({ data: { id: 1 } })
        .mockResolvedValueOnce({ data: { id: 2 } })
        .mockResolvedValueOnce({ data: { id: 3 } });

      const config = {
        events: ['product.created', 'product.updated', 'product.deleted'],
        callbackUrl: 'https://app.com/webhook',
        secret: 'secret123',
      };

      const result = await provider.registerWebhook(mockCredentials, config);

      expect(mockClient.post).toHaveBeenCalledTimes(3);
      expect(result.webhookId).toBe('1,2,3');
      expect(result.events).toEqual(['product.created', 'product.updated', 'product.deleted']);
    });

    it('should skip unsupported events', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 1 } });

      const config = {
        events: ['product.created', 'unsupported.event'] as any,
        callbackUrl: 'https://app.com/webhook',
        secret: 'secret123',
      };

      const result = await provider.registerWebhook(mockCredentials, config);

      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(result.webhookId).toBe('1');
    });
  });

  describe('deleteWebhook()', () => {
    it('should delete single webhook', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await provider.deleteWebhook(mockCredentials, '123');

      expect(mockClient.delete).toHaveBeenCalledWith('webhooks/123', { force: true });
    });

    it('should delete multiple webhooks', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await provider.deleteWebhook(mockCredentials, '1,2,3');

      expect(mockClient.delete).toHaveBeenCalledTimes(3);
      expect(mockClient.delete).toHaveBeenCalledWith('webhooks/1', { force: true });
      expect(mockClient.delete).toHaveBeenCalledWith('webhooks/2', { force: true });
      expect(mockClient.delete).toHaveBeenCalledWith('webhooks/3', { force: true });
    });

    it('should handle empty webhook ID', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await provider.deleteWebhook(mockCredentials, '');

      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('should ignore errors during deletion', async () => {
      mockClient.delete
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ data: {} });

      await expect(provider.deleteWebhook(mockCredentials, '1,2')).resolves.not.toThrow();

      expect(mockClient.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('should verify valid signature', () => {
      const payload = '{"id":1,"name":"Product"}';
      const secret = 'my-secret';
      // Generate actual HMAC signature
      const { createHmac } = require('crypto');
      const signature = createHmac('sha256', secret).update(payload).digest('base64');

      const result = provider.verifyWebhookSignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"id":1,"name":"Product"}';
      const secret = 'my-secret';
      const invalidSignature = 'invalid-signature';

      const result = provider.verifyWebhookSignature(payload, invalidSignature, secret);

      expect(result).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = '{"id":1,"name":"Product"}';
      const { createHmac } = require('crypto');
      const signature = createHmac('sha256', 'secret1').update(payload).digest('base64');

      const result = provider.verifyWebhookSignature(payload, signature, 'secret2');

      expect(result).toBe(false);
    });
  });

  describe('parseWebhookPayload()', () => {
    it('should parse webhook payload', () => {
      const payload = { id: 123, name: 'Product Name', status: 'publish' };

      const result = provider.parseWebhookPayload(payload);

      expect(result).toEqual({
        type: 'product.updated',
        productId: '123',
        timestamp: expect.any(Date),
        raw: payload,
      });
    });

    it('should handle payload without ID', () => {
      const payload = { name: 'Product Name' };

      const result = provider.parseWebhookPayload(payload);

      expect(result.productId).toBe('');
    });

    it('should preserve raw payload', () => {
      const payload = { id: 1, custom_field: 'value', nested: { data: 'test' } };

      const result = provider.parseWebhookPayload(payload);

      expect(result.raw).toEqual(payload);
    });
  });

  describe('getProductImages()', () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      status: 'publish',
      type: 'simple',
      description: 'Description',
      short_description: 'Short',
      sku: 'SKU',
      images: [
        { id: 10, src: 'https://example.com/img1.jpg', alt: 'Image 1' },
        { id: 20, src: 'https://example.com/img2.jpg', alt: 'Image 2' },
        { id: 30, src: 'https://example.com/img3.jpg', alt: 'Image 3' },
      ],
      categories: [],
    };

    it('should get all product images', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });

      const result = await provider.getProductImages(mockCredentials, '1');

      expect(result).toEqual([
        { id: '10', url: 'https://example.com/img1.jpg', position: 0, isPrimary: true },
        { id: '20', url: 'https://example.com/img2.jpg', position: 1, isPrimary: false },
        { id: '30', url: 'https://example.com/img3.jpg', position: 2, isPrimary: false },
      ]);
    });

    it('should mark first image as primary', async () => {
      mockClient.get.mockResolvedValue({ data: mockProduct });

      const result = await provider.getProductImages(mockCredentials, '1');

      expect(result[0].isPrimary).toBe(true);
      expect(result[1].isPrimary).toBe(false);
      expect(result[2].isPrimary).toBe(false);
    });

    it('should return empty array for product not found', async () => {
      mockClient.get.mockRejectedValue(new Error('Not found'));

      const result = await provider.getProductImages(mockCredentials, '999');

      expect(result).toEqual([]);
    });

    it('should return empty array for product with no images', async () => {
      mockClient.get.mockResolvedValue({
        data: { ...mockProduct, images: [] },
      });

      const result = await provider.getProductImages(mockCredentials, '1');

      expect(result).toEqual([]);
    });
  });
});
