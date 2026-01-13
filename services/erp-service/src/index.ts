/**
 * ERP Service
 * Abstraction layer for multiple commerce providers (WooCommerce, Shopify, Wix, etc.)
 *
 * @example
 * ```typescript
 * import { createERPService } from '@scenergy/erp-service';
 *
 * // Create service using Neon drizzle client
 * const erpService = createERPService(db);
 *
 * // Fetch products using stored credentials
 * const { data, error } = await erpService.getProducts('my-client', { limit: 10 });
 *
 * // Test connection
 * const { data: connected } = await erpService.testConnection('my-client');
 * ```
 */

import { ERPService, type ERPServiceConfig } from './erp-service';
import type { DrizzleClient } from 'visualizer-db';

// Cached service instance
let cachedService: ERPService | null = null;
let cachedDrizzle: DrizzleClient | null = null;

/**
 * Create an ERP service instance using a Neon Drizzle client
 */
export function createERPService(drizzle: DrizzleClient, config?: ERPServiceConfig): ERPService {
  if (cachedService && cachedDrizzle === drizzle && !config) {
    return cachedService;
  }

  const service = new ERPService(drizzle, config);

  if (!config) {
    cachedService = service;
    cachedDrizzle = drizzle;
  }

  return service;
}

// Main service
export { ERPService, type ERPServiceConfig, type ServiceResult } from './erp-service';

// Provider registry
export { providerRegistry, ProviderRegistry } from './registry';

// Credentials service
export { CredentialsService, type ClientProviderSecret, type CredentialsResult } from './services/credentials-service';

// Provider types
export type {
  ERPProviderType,
  ERPProvider,
  BaseCredentials,
  WooCommerceCredentials,
  ShopifyCredentials,
  WixCredentials,
  ProviderCredentials,
  ProviderProduct,
  ProviderProductImage,
  ProviderCategory,
  ProductFetchOptions,
  ProductFetchResult,
  CategoryFetchResult,
  ERPProviderFactory,
  ProviderRegistration,
} from './types/provider';

// WooCommerce provider (for direct use if needed)
export {
  WooCommerceProvider,
  createWooCommerceProvider,
  isWooCommerceCredentials,
} from './providers/woocommerce';
