/**
 * WooCommerce Provider
 */

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
} from '../base';

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
