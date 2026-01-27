/**
 * Base Provider - Abstract class for all commerce providers
 */

import { ImageRequest } from '../types/images';

export type ProviderType = 'woocommerce' | 'shopify' | 'bigcommerce';
export type ConnectionStatus = 'active' | 'disconnected' | 'error';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  authMethod: 'oauth' | 'api_key';
  callbackMethod?: 'POST' | 'GET';
  scopes: string[];
}

export interface ProviderCredentials {
  baseUrl: string;
  [key: string]: unknown;
}

export interface ProviderProduct {
  id: string | number;
  name: string;
  description: string;
  shortDescription?: string;
  sku?: string;
  status: string;
  type?: string;
  images: Array<{ id: string | number; src: string; alt?: string }>;
  categories: Array<{ id: string | number; name: string; slug: string }>;
}

export interface ProviderCategory {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
}

export interface AuthState {
  id: string;
  clientId: string;
  provider: ProviderType;
  storeUrl: string;
  createdAt: Date;
  expiresAt: Date;
  returnUrl?: string;
}

export interface AuthParams {
  clientId: string;
  storeUrl: string;
  appName: string;
  callbackUrl: string;
  returnUrl?: string;
}

export interface FetchOptions {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  ids?: Array<string | number>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface ProductImage {
  id: string | number;
  src: string;
  alt?: string;
}

// Webhook types for bidirectional sync
export type WebhookEventType = 'product.created' | 'product.updated' | 'product.deleted';

export interface WebhookConfig {
  callbackUrl: string;
  events: WebhookEventType[];
  secret: string;
}

export interface WebhookRegistration {
  webhookId: string;
  events: WebhookEventType[];
}

export interface ExternalImage {
  id: string; // Store's image ID
  url: string;
  position: number;
  isPrimary: boolean;
}

export interface WebhookPayload {
  type: WebhookEventType;
  productId: string;
  timestamp: Date;
  raw: unknown;
}

export abstract class BaseProvider {
  abstract readonly config: ProviderConfig;

  abstract buildAuthUrl(params: AuthParams, stateId: string): string;
  abstract parseCallback(payload: unknown, state: AuthState): Promise<ProviderCredentials>;
  abstract testConnection(credentials: ProviderCredentials): Promise<boolean>;
  abstract getProducts(credentials: ProviderCredentials, options?: FetchOptions): Promise<PaginatedResult<ProviderProduct>>;
  abstract getProduct(credentials: ProviderCredentials, productId: string | number): Promise<ProviderProduct | null>;
  abstract getCategories(credentials: ProviderCredentials): Promise<ProviderCategory[]>;

  /**
   * Update product images by uploading new image URLs to the store
   * @param credentials Store credentials
   * @param productId External product ID in store
   * @param imageUrls Array of image URLs to add to the product
   * @returns Array of created images in the store
   */
  abstract updateProductImages(
    credentials: ProviderCredentials,
    productId: string | number,
    imagesData: ImageRequest[]
  ): Promise<ProductImage[]>;

  /**
   * Update a single product image by replacing its source URL
   * @param credentials Store credentials
   * @param productId External product ID in store
   * @param imageId Image ID in the store to update
   * @param newImageData New image data (src, alt, name)
   * @returns Updated image info
   */
  abstract updateSingleProductImage(
    credentials: ProviderCredentials,
    productId: string | number,
    imageId: string | number,
    newImageData: ImageRequest
  ): Promise<ProductImage>;

  /**
   * Delete an image from a product in the store
   * @param credentials Store credentials
   * @param productId External product ID in store
   * @param imageId Image ID in the store to delete
   */
  abstract deleteProductImage(credentials: ProviderCredentials, productId: string | number, imageId: string | number): Promise<void>;

  // ===== WEBHOOK METHODS =====

  /**
   * Register a webhook with the store for product updates
   * @param credentials Store credentials
   * @param config Webhook configuration (URL, events, secret)
   * @returns Registration info including webhook ID
   */
  abstract registerWebhook(credentials: ProviderCredentials, config: WebhookConfig): Promise<WebhookRegistration>;

  /**
   * Delete a previously registered webhook
   * @param credentials Store credentials
   * @param webhookId ID of the webhook to delete
   */
  abstract deleteWebhook(credentials: ProviderCredentials, webhookId: string): Promise<void>;

  /**
   * Verify webhook signature from the store
   * @param payload Raw request body
   * @param signature Signature header from request
   * @param secret Webhook secret used for signing
   * @returns true if signature is valid
   */
  abstract verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Parse webhook payload into a normalized format
   * @param rawPayload Raw webhook payload from the store
   * @returns Normalized webhook payload
   */
  abstract parseWebhookPayload(rawPayload: unknown): WebhookPayload;

  /**
   * Get all images for a product from the store
   * @param credentials Store credentials
   * @param externalProductId Product ID in the store
   * @returns Array of external images
   */
  abstract getProductImages(credentials: ProviderCredentials, externalProductId: string): Promise<ExternalImage[]>;

  createAuthState(params: AuthParams, stateId: string, expiresAt: Date): AuthState {
    return {
      id: stateId,
      clientId: params.clientId,
      provider: this.config.type,
      storeUrl: this.normalizeUrl(params.storeUrl),
      createdAt: new Date(),
      expiresAt,
      returnUrl: params.returnUrl,
    };
  }

  async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  protected normalizeUrl(url: string): string {
    let normalized = url.replace(/\/+$/, '');
    // Preserve HTTP for localhost, upgrade to HTTPS for everything else
    if (normalized.startsWith('http://')) {
      // Keep HTTP for localhost (development)
      if (!normalized.includes('localhost') && !normalized.includes('127.0.0.1')) {
        normalized = normalized.replace('http://', 'https://');
      }
    } else if (!normalized.startsWith('https://')) {
      // Default to HTTPS for domains without protocol
      normalized = `https://${normalized}`;
    }
    return normalized;
  }

  protected stripHtml(html: string): string {
    return html.replaceAll(/<[^>]*>/g, '').trim();
  }
}
