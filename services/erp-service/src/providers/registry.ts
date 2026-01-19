/**
 * Provider Registry - Unified registry for all commerce providers
 */

import type { BaseProvider, ProviderType } from './base';
import { WooCommerceProvider } from './woocommerce';
import { ShopifyProvider } from './shopify';

class ProviderRegistry {
  private providers = new Map<ProviderType, BaseProvider>();

  constructor() {
    this.register(new WooCommerceProvider());
    this.register(new ShopifyProvider());
  }

  register(provider: BaseProvider): void {
    this.providers.set(provider.config.type, provider);
  }

  get(type: ProviderType): BaseProvider | undefined {
    return this.providers.get(type);
  }

  require(type: ProviderType): BaseProvider {
    const provider = this.get(type);
    if (!provider) {
      throw new Error(`Provider not found: ${type}`);
    }
    return provider;
  }

  has(type: string): type is ProviderType {
    return this.providers.has(type as ProviderType);
  }

  list(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  getProviderInfo() {
    return this.list().map((p) => ({
      type: p.config.type,
      name: p.config.name,
      authMethod: p.config.authMethod,
    }));
  }
}

export const providers = new ProviderRegistry();
export { ProviderRegistry };
