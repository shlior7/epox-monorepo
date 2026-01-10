/**
 * ERP Service
 * Abstraction layer for multiple commerce providers (WooCommerce, Shopify, Wix, etc.)
 *
 * @example
 * ```typescript
 * import { createERPService } from '@scenergy/erp-service';
 *
 * // Create service (uses supabase-service internally)
 * const erpService = createERPService();
 *
 * // Fetch products using stored credentials
 * const { data, error } = await erpService.getProducts('my-client', { limit: 10 });
 *
 * // Test connection
 * const { data: connected } = await erpService.testConnection('my-client');
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ERPService, type ERPServiceConfig } from './erp-service';

// Cached service instance
let cachedService: ERPService | null = null;

/**
 * Create an ERP service instance using the default supabase client from supabase-service
 */
export function createERPService(config?: ERPServiceConfig): ERPService {
  if (cachedService && !config) {
    return cachedService;
  }

  // Dynamic import to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { supabase } = require('@scenergy/supabase-service');
  const service = new ERPService(supabase as SupabaseClient, config);

  if (!config) {
    cachedService = service;
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
