export {
  BaseProvider,
  type ProviderType,
  type ProviderConfig,
  type ProviderCredentials,
  type ProviderProduct,
  type ProviderCategory,
  type AuthState,
  type AuthParams,
  type FetchOptions,
  type PaginatedResult,
  type ConnectionStatus,
} from './base';

export { providers, ProviderRegistry } from './registry';

export { WooCommerceProvider, type WooCommerceCredentials, type WooCommerceCallbackPayload, isWooCommerceCredentials } from './woocommerce';
export { ShopifyProvider, type ShopifyCredentials, type ShopifyCallbackParams, isShopifyCredentials } from './shopify';
