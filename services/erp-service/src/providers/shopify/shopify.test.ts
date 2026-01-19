import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShopifyProvider, isShopifyCredentials, type ShopifyCredentials, type ShopifyCallbackParams } from './index';
import type { AuthParams, AuthState } from '../base';

describe('ShopifyProvider', () => {
  let provider: ShopifyProvider;

  beforeEach(() => {
    vi.stubEnv('SHOPIFY_API_KEY', 'test-api-key');
    vi.stubEnv('SHOPIFY_API_SECRET', 'test-api-secret');
    provider = new ShopifyProvider();
  });

  describe('config', () => {
    it('should have correct config', () => {
      expect(provider.config).toEqual({
        type: 'shopify',
        name: 'Shopify',
        authMethod: 'oauth',
        callbackMethod: 'GET',
        scopes: ['read_products', 'read_inventory'],
      });
    });
  });

  describe('buildAuthUrl()', () => {
    const baseParams: AuthParams = {
      clientId: 'client-123',
      storeUrl: 'https://mystore.myshopify.com',
      appName: 'Test App',
      callbackUrl: 'https://app.com/callback',
      returnUrl: 'https://app.com/settings',
    };

    it('should build correct auth URL for full domain', () => {
      const url = provider.buildAuthUrl(baseParams, 'state-abc');
      const parsed = new URL(url);

      expect(parsed.origin).toBe('https://mystore.myshopify.com');
      expect(parsed.pathname).toBe('/admin/oauth/authorize');
      expect(parsed.searchParams.get('client_id')).toBe('test-api-key');
      expect(parsed.searchParams.get('scope')).toBe('read_products,read_inventory');
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://app.com/callback');
      expect(parsed.searchParams.get('state')).toBe('state-abc');
    });

    it('should add .myshopify.com for simple store names', () => {
      const params = { ...baseParams, storeUrl: 'mystore' };
      const url = provider.buildAuthUrl(params, 'state-abc');
      expect(url).toContain('https://mystore.myshopify.com');
    });

    it('should handle URL with protocol', () => {
      const params = { ...baseParams, storeUrl: 'https://mystore.myshopify.com/' };
      const url = provider.buildAuthUrl(params, 'state-abc');
      expect(url).toContain('https://mystore.myshopify.com');
    });
  });

  describe('createAuthState()', () => {
    it('should create valid auth state', () => {
      const params: AuthParams = {
        clientId: 'client-123',
        storeUrl: 'https://mystore.myshopify.com',
        appName: 'App',
        callbackUrl: 'https://app.com/callback',
        returnUrl: 'https://app.com/return',
      };
      const expiresAt = new Date(Date.now() + 60000);

      const state = provider.createAuthState(params, 'state-id', expiresAt);

      expect(state.id).toBe('state-id');
      expect(state.clientId).toBe('client-123');
      expect(state.provider).toBe('shopify');
      expect(state.returnUrl).toBe('https://app.com/return');
      expect(state.expiresAt).toBe(expiresAt);
    });
  });
});

describe('isShopifyCredentials()', () => {
  it('should return true for valid credentials', () => {
    const creds: ShopifyCredentials = {
      baseUrl: 'https://mystore.myshopify.com',
      accessToken: 'shpat_xxx',
      shopName: 'mystore',
    };
    expect(isShopifyCredentials(creds)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isShopifyCredentials(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isShopifyCredentials()).toBe(false);
  });

  it('should return false for missing baseUrl', () => {
    expect(isShopifyCredentials({ accessToken: 'token', shopName: 'shop' })).toBe(false);
  });

  it('should return false for missing accessToken', () => {
    expect(isShopifyCredentials({ baseUrl: 'url', shopName: 'shop' })).toBe(false);
  });

  it('should return false for missing shopName', () => {
    expect(isShopifyCredentials({ baseUrl: 'url', accessToken: 'token' })).toBe(false);
  });
});
