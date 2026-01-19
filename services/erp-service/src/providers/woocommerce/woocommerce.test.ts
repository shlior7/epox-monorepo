import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WooCommerceProvider,
  isWooCommerceCredentials,
  type WooCommerceCredentials,
  type WooCommerceCallbackPayload,
} from './index';
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
      const params = { ...baseParams, returnUrl: undefined };
      const url = provider.buildAuthUrl(params, 'state-abc');
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

