/**
 * WooCommerce API Client Factory
 */

import type { WooCommerceRestApiVersion } from '@woocommerce/woocommerce-rest-api';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export interface WooCommerceClientConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: WooCommerceRestApiVersion;
  timeoutMs?: number;
}

export const createWooCommerceApi = (config: WooCommerceClientConfig): WooCommerceRestApi =>
  new WooCommerceRestApi({
    url: config.url,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    version: config.version ?? 'wc/v3',
    axiosConfig: {
      headers: { 'Content-Type': 'application/json' },
      timeout: config.timeoutMs ?? 15_000,
    },
  });
