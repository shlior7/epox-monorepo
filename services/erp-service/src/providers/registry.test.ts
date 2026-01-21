import { describe, it, expect, beforeEach } from 'vitest';
import { providers, ProviderRegistry, WooCommerceProvider, ShopifyProvider } from './index';

describe('ProviderRegistry', () => {
  describe('singleton instance', () => {
    it('should have woocommerce provider registered', () => {
      expect(providers.has('woocommerce')).toBe(true);
    });

    it('should have shopify provider registered', () => {
      expect(providers.has('shopify')).toBe(true);
    });

    it('should not have unregistered providers', () => {
      expect(providers.has('unknown')).toBe(false);
    });
  });

  describe('get()', () => {
    it('should return WooCommerce provider', () => {
      const provider = providers.get('woocommerce');
      expect(provider).toBeInstanceOf(WooCommerceProvider);
      expect(provider?.config.type).toBe('woocommerce');
    });

    it('should return Shopify provider', () => {
      const provider = providers.get('shopify');
      expect(provider).toBeInstanceOf(ShopifyProvider);
      expect(provider?.config.type).toBe('shopify');
    });

    it('should return undefined for unknown provider', () => {
      expect(providers.get('unknown' as any)).toBeUndefined();
    });
  });

  describe('require()', () => {
    it('should return provider when exists', () => {
      const provider = providers.require('woocommerce');
      expect(provider).toBeInstanceOf(WooCommerceProvider);
    });

    it('should throw for unknown provider', () => {
      expect(() => providers.require('unknown' as any)).toThrow('Provider not found: unknown');
    });
  });

  describe('list()', () => {
    it('should return all registered providers', () => {
      const list = providers.list();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.some((p) => p.config.type === 'woocommerce')).toBe(true);
      expect(list.some((p) => p.config.type === 'shopify')).toBe(true);
    });
  });

  describe('getProviderInfo()', () => {
    it('should return provider info for UI', () => {
      const info = providers.getProviderInfo();
      expect(info.length).toBeGreaterThanOrEqual(2);

      const woo = info.find((p) => p.type === 'woocommerce');
      expect(woo).toEqual({
        type: 'woocommerce',
        name: 'WooCommerce',
        authMethod: 'oauth',
      });

      const shopify = info.find((p) => p.type === 'shopify');
      expect(shopify).toEqual({
        type: 'shopify',
        name: 'Shopify',
        authMethod: 'oauth',
      });
    });
  });

  describe('custom registry', () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
      registry = new ProviderRegistry();
    });

    it('should allow registering custom providers', () => {
      const customProvider = new WooCommerceProvider();
      registry.register(customProvider);
      expect(registry.get('woocommerce')).toBe(customProvider);
    });
  });
});
