export {
  BaseProvider,
  type ProviderType,
  type ProviderConfig,
  type ProviderCredentials,
  type ProviderProduct,
  type ProviderCategory,
  type ProductImage,
  type AuthState,
  type AuthParams,
  type FetchOptions,
  type PaginatedResult,
  type ConnectionStatus,
  type WebhookEventType,
  type WebhookConfig,
  type WebhookRegistration,
  type ExternalImage,
  type WebhookPayload,
} from './base';

export { providers, ProviderRegistry } from './registry';

export { WooCommerceProvider, type WooCommerceCredentials, type WooCommerceCallbackPayload, isWooCommerceCredentials } from './woocommerce';
export { ShopifyProvider, type ShopifyCredentials, type ShopifyCallbackParams, isShopifyCredentials } from './shopify';
