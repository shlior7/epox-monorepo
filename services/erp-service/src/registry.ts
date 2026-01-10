/**
 * ERP Provider Registry
 * Central registry for all commerce providers
 */

import type { ERPProviderType, ProviderCredentials, ERPProvider, ProviderRegistration } from './types/provider';
import { WooCommerceProvider, isWooCommerceCredentials } from './providers/woocommerce';

/**
 * Registry of all available providers
 */
class ProviderRegistry {
  private providers = new Map<ERPProviderType, ProviderRegistration>();

  constructor() {
    // Register built-in providers
    this.registerWooCommerce();
  }

  /**
   * Register WooCommerce provider
   */
  private registerWooCommerce(): void {
    this.providers.set('woocommerce', {
      type: 'woocommerce',
      name: 'WooCommerce',
      factory: (credentials: ProviderCredentials) => {
        if (!isWooCommerceCredentials(credentials)) {
          throw new Error('Invalid WooCommerce credentials');
        }
        return new WooCommerceProvider(credentials);
      },
      validateCredentials: isWooCommerceCredentials,
    });
  }

  /**
   * Get a provider by type
   */
  getProviderInfo(type: ERPProviderType): ProviderRegistration | undefined {
    return this.providers.get(type);
  }

  /**
   * Create a provider instance
   */
  createProvider(type: ERPProviderType, credentials: ProviderCredentials): ERPProvider {
    const registration = this.providers.get(type);
    if (!registration) {
      throw new Error(`Unknown provider type: ${type}`);
    }

    if (!registration.validateCredentials(credentials)) {
      throw new Error(`Invalid credentials for provider: ${type}`);
    }

    return registration.factory(credentials);
  }

  /**
   * Check if a provider type is supported
   */
  isSupported(type: string): type is ERPProviderType {
    return this.providers.has(type as ERPProviderType);
  }

  /**
   * Get all registered provider types
   */
  getProviderTypes(): ERPProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get all registered providers info
   */
  getAllProviders(): Array<{ type: ERPProviderType; name: string }> {
    return Array.from(this.providers.values()).map((p) => ({
      type: p.type,
      name: p.name,
    }));
  }

  /**
   * Register a custom provider (for extensibility)
   */
  registerProvider(registration: ProviderRegistration): void {
    if (this.providers.has(registration.type)) {
      throw new Error(`Provider type '${registration.type}' is already registered`);
    }
    this.providers.set(registration.type, registration);
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();

// Export class for testing
export { ProviderRegistry };
