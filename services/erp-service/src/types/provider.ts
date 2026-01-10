/**
 * ERP Provider Types
 * Defines the interface that all commerce providers must implement
 */

// Supported provider types
export type ERPProviderType = 'woocommerce' | 'shopify' | 'wix';

// Base credentials interface - each provider extends this
export interface BaseCredentials {
  baseUrl: string;
}

// WooCommerce specific credentials
export interface WooCommerceCredentials extends BaseCredentials {
  consumerKey: string;
  consumerSecret: string;
}

// Shopify credentials (for future implementation)
export interface ShopifyCredentials extends BaseCredentials {
  accessToken: string;
  shopName: string;
}

// Wix credentials (for future implementation)
export interface WixCredentials extends BaseCredentials {
  apiKey: string;
  siteId: string;
}

// Union type of all credentials
export type ProviderCredentials = WooCommerceCredentials | ShopifyCredentials | WixCredentials;

// Product image from provider
export interface ProviderProductImage {
  id: string | number;
  src: string;
  alt?: string;
  name?: string;
  position?: number;
}

// Category from provider
export interface ProviderCategory {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
}

// Simplified product from provider
export interface ProviderProduct {
  id: string | number;
  name: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  status: string;
  type?: string;
  images: ProviderProductImage[];
  categories: ProviderCategory[];
}

// Filter options for fetching products
export interface ProductFetchOptions {
  limit?: number;           // Max products to fetch (default: 10, max: 100)
  productIds?: Array<string | number>;  // Specific product IDs to fetch
  category?: string;        // Category slug or ID
  status?: string;          // Product status (e.g., 'publish', 'active')
  search?: string;          // Search term
  page?: number;            // Page number for pagination
}

// Result of fetching products
export interface ProductFetchResult {
  products: ProviderProduct[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Result of fetching categories
export interface CategoryFetchResult {
  categories: ProviderCategory[];
  total: number;
}

/**
 * ERP Provider Interface
 * All commerce providers must implement this interface
 */
export interface ERPProvider {
  // Provider identification
  readonly providerType: ERPProviderType;
  readonly providerName: string;

  // Product operations (read-only for now)
  getProducts: (options?: ProductFetchOptions) => Promise<ProductFetchResult>;
  getProductById: (productId: string | number) => Promise<ProviderProduct | null>;

  // Category operations
  getCategories: () => Promise<CategoryFetchResult>;

  // Utility methods
  testConnection: () => Promise<boolean>;

  // Image download helper
  downloadImage: (imageUrl: string) => Promise<Buffer>;
}

/**
 * Provider factory function type
 * Each provider must export a factory function that creates an instance
 */
export type ERPProviderFactory<T extends ProviderCredentials> = (credentials: T) => ERPProvider;

/**
 * Provider registration info
 */
export interface ProviderRegistration {
  type: ERPProviderType;
  name: string;
  factory: ERPProviderFactory<ProviderCredentials>;
  validateCredentials: (credentials: unknown) => credentials is ProviderCredentials;
}
