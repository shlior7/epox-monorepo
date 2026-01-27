/**
 * WooCommerce Provider
 */

import { createHmac } from 'crypto';
import { createWooCommerceApi } from './woocommerce';
import type WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import {
  BaseProvider,
  type ProviderConfig,
  type ProviderCredentials,
  type ProviderProduct,
  type ProviderCategory,
  type AuthParams,
  type AuthState,
  type FetchOptions,
  type PaginatedResult,
  type WebhookConfig,
  type WebhookRegistration,
  type WebhookPayload,
  type ExternalImage,
} from '../base';
import { ImageRequest } from '../../types/images';

export interface WooCommerceCredentials extends ProviderCredentials {
  consumerKey: string;
  consumerSecret: string;
  keyId?: number;
  userId?: number;
  keyPermissions?: 'read' | 'write' | 'read_write';
}

export interface WooCommerceCallbackPayload {
  key_id: number;
  user_id: number;
  consumer_key: string;
  consumer_secret: string;
  key_permissions: 'read' | 'write' | 'read_write';
}

interface WooProduct {
  id: number;
  name: string;
  status: string;
  type: string;
  description: string;
  short_description: string;
  sku: string;
  images: Array<{ id: number; src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
}

interface WooCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface WooWebhook {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'disabled';
  topic: string;
  delivery_url: string;
  secret: string;
}

// WooCommerce webhook topic mapping
const WOO_WEBHOOK_TOPICS: Record<string, string> = {
  'product.created': 'product.created',
  'product.updated': 'product.updated',
  'product.deleted': 'product.deleted',
};

export class WooCommerceProvider extends BaseProvider {
  readonly config: ProviderConfig = {
    type: 'woocommerce',
    name: 'WooCommerce',
    authMethod: 'oauth',
    callbackMethod: 'POST',
    scopes: ['read_write'],
  };

  buildAuthUrl(params: AuthParams, stateId: string): string {
    const storeUrl = this.normalizeUrl(params.storeUrl);
    const authUrl = new URL(`${storeUrl}/wc-auth/v1/authorize`);
    authUrl.searchParams.set('app_name', params.appName);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('user_id', stateId);
    authUrl.searchParams.set('return_url', params.returnUrl ?? params.callbackUrl.replace('/callback', '/complete'));
    authUrl.searchParams.set('callback_url', params.callbackUrl);
    return authUrl.toString();
  }

  async parseCallback(payload: unknown, state: AuthState): Promise<WooCommerceCredentials> {
    const data = payload as WooCommerceCallbackPayload;
    if (!data.consumer_key || !data.consumer_secret) {
      throw new Error('Missing consumer_key or consumer_secret');
    }
    return {
      baseUrl: state.storeUrl,
      consumerKey: data.consumer_key,
      consumerSecret: data.consumer_secret,
      keyId: data.key_id,
      userId: data.user_id,
      keyPermissions: data.key_permissions,
    };
  }

  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    try {
      await this.createClient(credentials).get('products', { per_page: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async getProducts(credentials: ProviderCredentials, options: FetchOptions = {}): Promise<PaginatedResult<ProviderProduct>> {
    const { limit = 10, page = 1, search, category, ids } = options;
    const params: Record<string, unknown> = { per_page: Math.min(limit, 100), page, status: 'publish' };

    if (search) {
      params.search = search;
    }
    if (category) {
      params.category = category;
    }
    if (ids?.length) {
      params.include = ids.map(Number);
    }

    const response = await this.createClient(credentials).get('products', params);
    const products: WooProduct[] = response.data;

    return {
      items: products.map((p) => this.mapProduct(p)),
      total: parseInt(response.headers['x-wp-total'] ?? '0', 10),
      page,
      hasMore: page < parseInt(response.headers['x-wp-totalpages'] ?? '1', 10),
    };
  }

  async getProduct(credentials: ProviderCredentials, productId: string | number): Promise<ProviderProduct | null> {
    try {
      const response = await this.createClient(credentials).get(`products/${productId}`);
      return this.mapProduct(response.data);
    } catch {
      return null;
    }
  }

  async getCategories(credentials: ProviderCredentials): Promise<ProviderCategory[]> {
    const response = await this.createClient(credentials).get('products/categories', { per_page: 100, hide_empty: true });
    return (response.data as WooCategory[]).map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }));
  }

  async updateProductImages(
    credentials: ProviderCredentials,
    productId: string | number,
    imagesData: ImageRequest[]
  ): Promise<Array<{ id: number; src: string; alt?: string }>> {
    const client = this.createClient(credentials);
    const productResponse = await client.get(`products/${productId}`);
    const currentImages = productResponse.data.images;

    // WooCommerce expects images as array of objects with src property
    const newImages = [...currentImages, ...imagesData.map((img) => ({ src: img.src, alt: img.alt || '', name: img.name || '' }))];

    // Update product with new images (appends to existing images)
    const response = await client.put(`products/${productId}`, {
      images: newImages,
    });

    const product = response.data as WooProduct;
    // Return the newly added images (last N items)
    return product.images.slice(-imagesData.length).map((img) => ({
      id: img.id,
      src: img.src,
      alt: img.alt,
    }));
  }

  async updateSingleProductImage(
    credentials: ProviderCredentials,
    productId: string | number,
    imageId: string | number,
    newImageData: ImageRequest
  ): Promise<{ id: number; src: string; alt?: string }> {
    const client = this.createClient(credentials);

    // Get current product to retrieve existing images
    const productResponse = await client.get(`products/${productId}`);
    const product = productResponse.data as WooProduct;

    // Find and update the specific image
    const updatedImages = product.images.map((img) =>
      img.id === Number(imageId)
        ? { id: img.id, src: newImageData.src, alt: newImageData.alt || img.alt, name: newImageData.name || '' }
        : img
    );

    // Update product with modified images
    const response = await client.put(`products/${productId}`, {
      images: updatedImages,
    });

    const updatedProduct = response.data as WooProduct;
    const updatedImage = updatedProduct.images.find((img) => img.id === Number(imageId));

    if (!updatedImage) {
      throw new Error(`Image ${imageId} not found after update`);
    }

    return {
      id: updatedImage.id,
      src: updatedImage.src,
      alt: updatedImage.alt,
    };
  }

  async deleteProductImage(credentials: ProviderCredentials, productId: string | number, imageId: string | number): Promise<void> {
    const client = this.createClient(credentials);

    // Get current product to retrieve existing images
    const productResponse = await client.get(`products/${productId}`);
    const product = productResponse.data as WooProduct;

    // Filter out the image to delete
    const updatedImages = product.images.filter((img) => img.id !== Number(imageId));

    // Update product with filtered images
    await client.put(`products/${productId}`, {
      images: updatedImages,
    });
  }

  // ===== WEBHOOK METHODS =====

  async registerWebhook(credentials: ProviderCredentials, config: WebhookConfig): Promise<WebhookRegistration> {
    const client = this.createClient(credentials);
    const registeredWebhooks: string[] = [];

    // WooCommerce requires one webhook per topic, so we create multiple if needed
    for (const event of config.events) {
      const topic = WOO_WEBHOOK_TOPICS[event];
      if (!topic) continue;

      const response = await client.post('webhooks', {
        name: `Epox ${event} webhook`,
        topic,
        delivery_url: config.callbackUrl,
        secret: config.secret,
        status: 'active',
      });

      const webhook = response.data as WooWebhook;
      registeredWebhooks.push(String(webhook.id));
    }

    // Return concatenated webhook IDs (since WooCommerce needs separate webhooks per event)
    return {
      webhookId: registeredWebhooks.join(','),
      events: config.events,
    };
  }

  async deleteWebhook(credentials: ProviderCredentials, webhookId: string): Promise<void> {
    const client = this.createClient(credentials);

    // webhookId may contain multiple IDs separated by commas
    const webhookIds = webhookId.split(',').filter(Boolean);

    for (const id of webhookIds) {
      try {
        await client.delete(`webhooks/${id}`, { force: true });
      } catch {
        // Ignore errors for individual webhook deletion (may already be deleted)
      }
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // WooCommerce uses HMAC-SHA256 with base64 encoding
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64');
    return signature === expectedSignature;
  }

  parseWebhookPayload(rawPayload: unknown): WebhookPayload {
    const data = rawPayload as Record<string, unknown>;

    // WooCommerce webhook payload contains the full product object
    // The webhook topic is sent via the X-WC-Webhook-Topic header, not in payload
    // We determine the type based on context (caller provides this info)
    const productId = data.id ? String(data.id) : '';

    return {
      type: 'product.updated', // Default; actual type is determined by webhook topic header
      productId,
      timestamp: new Date(),
      raw: rawPayload,
    };
  }

  async getProductImages(credentials: ProviderCredentials, externalProductId: string): Promise<ExternalImage[]> {
    const product = await this.getProduct(credentials, externalProductId);
    if (!product) return [];

    return product.images.map((img, index) => ({
      id: String(img.id),
      url: img.src,
      position: index,
      isPrimary: index === 0,
    }));
  }

  private createClient(credentials: ProviderCredentials): WooCommerceRestApi {
    const c = credentials as WooCommerceCredentials;
    return createWooCommerceApi({ url: c.baseUrl, consumerKey: c.consumerKey, consumerSecret: c.consumerSecret });
  }

  private mapProduct(p: WooProduct): ProviderProduct {
    return {
      id: p.id,
      name: p.name,
      description: this.stripHtml(p.description),
      shortDescription: this.stripHtml(p.short_description),
      sku: p.sku,
      status: p.status,
      type: p.type,
      images: p.images.map((i) => ({ id: i.id, src: i.src, alt: i.alt })),
      categories: p.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    };
  }
}

export function isWooCommerceCredentials(creds: unknown): creds is WooCommerceCredentials {
  const c = creds as Record<string, unknown> | null;
  return !!c && typeof c.baseUrl === 'string' && typeof c.consumerKey === 'string' && typeof c.consumerSecret === 'string';
}
