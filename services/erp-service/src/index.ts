/**
 * ERP Service - Unified commerce provider integration
 */

import type { DatabaseFacade } from 'visualizer-db';
import { StoreService } from './services/store-service';

let cachedService: StoreService | null = null;
let cachedDb: DatabaseFacade | null = null;

export function createStoreService(db: DatabaseFacade): StoreService {
  if (cachedService && cachedDb === db) {
    return cachedService;
  }
  cachedService = new StoreService(db);
  cachedDb = db;
  return cachedService;
}

export { StoreService } from './services/store-service';

export {
  providers,
  ProviderRegistry,
  BaseProvider,
  WooCommerceProvider,
  ShopifyProvider,
  isWooCommerceCredentials,
  isShopifyCredentials,
  type ProviderType,
  type ProviderConfig,
  type ProviderCredentials,
  type ProviderProduct,
  type ProviderCategory,
  type AuthState,
  type AuthParams,
  type FetchOptions,
  type PaginatedResult,
  type WooCommerceCredentials,
  type WooCommerceCallbackPayload,
  type ShopifyCredentials,
  type ShopifyCallbackParams,
} from './providers';

export type { StoreCredentialsPayload, EncryptedCredentials } from './types/credentials';
export { decryptCredentials, encryptCredentials } from './services/credentials-crypto';
