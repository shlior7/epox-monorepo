/**
 * Shopify Provider
 * Uses Shopify Admin API for OAuth and product data access.
 * API Docs: https://shopify.dev/docs/admin-api
 */

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

// Shopify API version - update quarterly as per Shopify versioning
// See: https://shopify.dev/docs/api/versioning
const SHOPIFY_API_VERSION = '2024-10';

export interface ShopifyCredentials extends ProviderCredentials {
  accessToken: string;
  shopName: string;
}

export interface ShopifyCallbackParams {
  code: string;
  hmac: string;
  host: string;
  shop: string;
  state: string;
  timestamp: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string | null;
  product_type: string;
  status: string;
  images: Array<{ id: number; src: string; alt: string | null }>;
}

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  products_count: number;
}

export class ShopifyProvider extends BaseProvider {
  private apiKey = process.env.SHOPIFY_API_KEY ?? '';
  private apiSecret = process.env.SHOPIFY_API_SECRET ?? '';

  readonly config: ProviderConfig = {
    type: 'shopify',
    name: 'Shopify',
    authMethod: 'oauth',
    callbackMethod: 'GET',
    scopes: ['read_products', 'read_inventory'],
  };

  buildAuthUrl(params: AuthParams, stateId: string): string {
    const shopDomain = this.extractShopDomain(params.storeUrl);
    const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', this.apiKey);
    authUrl.searchParams.set('scope', this.config.scopes.join(','));
    authUrl.searchParams.set('redirect_uri', params.callbackUrl);
    authUrl.searchParams.set('state', stateId);
    return authUrl.toString();
  }

  async parseCallback(payload: unknown, state: AuthState): Promise<ShopifyCredentials> {
    const params = payload as ShopifyCallbackParams;
    const shopDomain = this.extractShopDomain(state.storeUrl);
    const accessToken = await this.exchangeCodeForToken(shopDomain, params.code);
    return {
      baseUrl: `https://${shopDomain}`,
      accessToken,
      shopName: shopDomain.replace('.myshopify.com', ''),
    };
  }

  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    try {
      const response = await this.fetch(credentials as ShopifyCredentials, `/admin/api/${SHOPIFY_API_VERSION}/shop.json`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getProducts(credentials: ProviderCredentials, options: FetchOptions = {}): Promise<PaginatedResult<ProviderProduct>> {
    const { limit = 10, page = 1 } = options;
    const response = await this.fetch(
      credentials as ShopifyCredentials,
      `/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${limit}&status=active`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();
    const products: ShopifyProduct[] = data.products;

    return {
      items: products.map((p) => this.mapProduct(p)),
      total: products.length,
      page,
      hasMore: products.length === limit,
    };
  }

  async getProduct(credentials: ProviderCredentials, productId: string | number): Promise<ProviderProduct | null> {
    try {
      const response = await this.fetch(credentials as ShopifyCredentials, `/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return this.mapProduct(data.product);
    } catch {
      return null;
    }
  }

  async getCategories(credentials: ProviderCredentials): Promise<ProviderCategory[]> {
    const response = await this.fetch(credentials as ShopifyCredentials, `/admin/api/${SHOPIFY_API_VERSION}/custom_collections.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`);
    }
    const data = await response.json();
    return (data.custom_collections as ShopifyCollection[]).map((c) => ({
      id: c.id,
      name: c.title,
      slug: c.handle,
      count: c.products_count,
    }));
  }

  private extractShopDomain(url: string): string {
    let domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`;
    }
    return domain;
  }

  private async exchangeCodeForToken(shopDomain: string, code: string): Promise<string> {
    const response = await globalThis.fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.apiKey, client_secret: this.apiSecret, code }),
    });
    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.status}`);
    }
    return (await response.json()).access_token;
  }

  private fetch(creds: ShopifyCredentials, path: string): Promise<Response> {
    return globalThis.fetch(`${creds.baseUrl}${path}`, {
      headers: { 'X-Shopify-Access-Token': creds.accessToken, 'Content-Type': 'application/json' },
    });
  }

  private mapProduct(p: ShopifyProduct): ProviderProduct {
    return {
      id: p.id,
      name: p.title,
      description: this.stripHtml(p.body_html ?? ''),
      status: p.status,
      type: p.product_type,
      images: p.images.map((i) => ({ id: i.id, src: i.src, alt: i.alt ?? '' })),
      categories: [],
    };
  }
}

export function isShopifyCredentials(creds: unknown): creds is ShopifyCredentials {
  const c = creds as Record<string, unknown> | null;
  return !!c && typeof c.baseUrl === 'string' && typeof c.accessToken === 'string' && typeof c.shopName === 'string';
}
