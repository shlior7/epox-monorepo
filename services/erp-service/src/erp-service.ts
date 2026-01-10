/**
 * ERP Service
 * Main service for interacting with commerce providers
 * Handles credential fetching and provider instantiation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { CredentialsService } from './services/credentials-service';
import { providerRegistry } from './registry';
import type {
  ERPProvider,
  ERPProviderType,
  ProviderCredentials,
  ProviderProduct,
  ProductFetchOptions,
  ProductFetchResult,
  CategoryFetchResult,
} from './types/provider';

/**
 * Configuration for ERP Service
 */
export interface ERPServiceConfig {
  maxImagesPerProduct?: number; // Default: 5
}

const DEFAULT_CONFIG: Required<ERPServiceConfig> = {
  maxImagesPerProduct: 5,
};

/**
 * Result type for service operations
 */
export interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * ERP Service - Main entry point for provider operations
 */
export class ERPService {
  private credentialsService: CredentialsService;
  private config: Required<ERPServiceConfig>;
  private providerCache = new Map<string, ERPProvider>();

  constructor(supabaseClient: SupabaseClient, config: ERPServiceConfig = {}) {
    this.credentialsService = new CredentialsService(supabaseClient);
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get a provider instance for a client
   * Uses caching to avoid recreating providers
   */
  async getProvider(clientId: string): Promise<ServiceResult<ERPProvider>> {
    try {
      // Check cache first
      const cached = this.providerCache.get(clientId);
      if (cached) {
        return { data: cached, error: null };
      }

      // Fetch credentials from vault
      const credResult = await this.credentialsService.getCredentials(clientId);
      if (credResult.error || !credResult.data) {
        return {
          data: null,
          error: credResult.error || new Error(`No credentials found for client: ${clientId}`),
        };
      }

      const { provider: providerType, credentials } = credResult.data;

      // Create provider instance
      const provider = providerRegistry.createProvider(providerType, credentials);

      // Cache the provider
      this.providerCache.set(clientId, provider);

      return { data: provider, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get provider'),
      };
    }
  }

  /**
   * Create a provider directly with credentials (for testing connection)
   */
  createProviderWithCredentials(providerType: ERPProviderType, credentials: ProviderCredentials): ERPProvider {
    return providerRegistry.createProvider(providerType, credentials);
  }

  /**
   * Fetch products from provider for a client
   * Automatically limits images per product
   */
  async getProducts(clientId: string, options?: ProductFetchOptions): Promise<ServiceResult<ProductFetchResult>> {
    const providerResult = await this.getProvider(clientId);
    if (providerResult.error || !providerResult.data) {
      return { data: null, error: providerResult.error };
    }

    try {
      const result = await providerResult.data.getProducts(options);

      // Limit images per product
      result.products = result.products.map((product) => this.limitProductImages(product));

      return { data: result, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch products'),
      };
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(clientId: string, productId: string | number): Promise<ServiceResult<ProviderProduct>> {
    const providerResult = await this.getProvider(clientId);
    if (providerResult.error || !providerResult.data) {
      return { data: null, error: providerResult.error };
    }

    try {
      const product = await providerResult.data.getProductById(productId);
      if (!product) {
        return { data: null, error: new Error(`Product ${productId} not found`) };
      }

      return { data: this.limitProductImages(product), error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch product'),
      };
    }
  }

  /**
   * Get categories from provider
   */
  async getCategories(clientId: string): Promise<ServiceResult<CategoryFetchResult>> {
    const providerResult = await this.getProvider(clientId);
    if (providerResult.error || !providerResult.data) {
      return { data: null, error: providerResult.error };
    }

    try {
      const result = await providerResult.data.getCategories();
      return { data: result, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch categories'),
      };
    }
  }

  /**
   * Test connection to provider
   */
  async testConnection(clientId: string): Promise<ServiceResult<boolean>> {
    const providerResult = await this.getProvider(clientId);
    if (providerResult.error || !providerResult.data) {
      return { data: null, error: providerResult.error };
    }

    try {
      const connected = await providerResult.data.testConnection();
      return { data: connected, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Connection test failed'),
      };
    }
  }

  /**
   * Download an image from the provider
   */
  async downloadImage(clientId: string, imageUrl: string): Promise<ServiceResult<Buffer>> {
    const providerResult = await this.getProvider(clientId);
    if (providerResult.error || !providerResult.data) {
      return { data: null, error: providerResult.error };
    }

    try {
      const buffer = await providerResult.data.downloadImage(imageUrl);
      return { data: buffer, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to download image'),
      };
    }
  }

  /**
   * Save provider credentials for a client
   */
  async saveCredentials(
    clientId: string,
    providerType: ERPProviderType,
    credentials: ProviderCredentials
  ): Promise<ServiceResult<void>> {
    // Clear cached provider if exists
    this.providerCache.delete(clientId);

    return await this.credentialsService.saveCredentials(clientId, providerType, credentials);
  }

  /**
   * Delete provider credentials for a client
   */
  async deleteCredentials(clientId: string): Promise<ServiceResult<void>> {
    // Clear cached provider
    this.providerCache.delete(clientId);

    return await this.credentialsService.deleteCredentials(clientId);
  }

  /**
   * Check if a client has provider credentials configured
   */
  async hasCredentials(clientId: string): Promise<ServiceResult<boolean>> {
    return await this.credentialsService.hasCredentials(clientId);
  }

  /**
   * Get the provider type for a client
   */
  async getProviderType(clientId: string): Promise<ServiceResult<ERPProviderType | null>> {
    return await this.credentialsService.getProviderType(clientId);
  }

  /**
   * Get list of supported providers
   */
  getSupportedProviders(): Array<{ type: ERPProviderType; name: string }> {
    return providerRegistry.getAllProviders();
  }

  /**
   * Clear the provider cache for a client
   */
  clearCache(clientId?: string): void {
    if (clientId) {
      this.providerCache.delete(clientId);
    } else {
      this.providerCache.clear();
    }
  }

  /**
   * Limit images per product to configured max
   */
  private limitProductImages(product: ProviderProduct): ProviderProduct {
    return {
      ...product,
      images: product.images.slice(0, this.config.maxImagesPerProduct),
    };
  }
}
