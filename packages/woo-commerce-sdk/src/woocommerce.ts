import type { WooCommerceRestApiVersion } from '@woocommerce/woocommerce-rest-api';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import axios, { type AxiosInstance } from 'axios';

export interface WooCommerceClientConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: WooCommerceRestApiVersion;
  timeoutMs?: number;
  debug?: boolean;
}

const createAxiosInstance = (debug?: boolean): AxiosInstance => {
  const axiosInstance = axios.create();

  if (debug) {
    axiosInstance.interceptors.request.use(
      (config) => {
        console.log('WooCommerce request', config?.method?.toUpperCase(), config?.url);
        return config;
      },
      (error) => {
        console.error('WooCommerce request error', error);
        return Promise.reject(error);
      }
    );

    axiosInstance.interceptors.response.use(
      (response) => {
        console.log('WooCommerce response', response?.status, response?.config?.url);
        return response;
      },
      (error) => {
        console.error('WooCommerce response error', error);
        return Promise.reject(error);
      }
    );
  }

  return axiosInstance;
};

export const createWooCommerceApi = (config: WooCommerceClientConfig) =>
  new WooCommerceRestApi({
    url: config.url,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    version: config.version ?? 'wc/v3',
    axiosConfig: {
      axiosInstance: createAxiosInstance(config.debug),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: config.timeoutMs ?? 15_000,
    },
  });

const defaultConfig: WooCommerceClientConfig = {
  url: process.env.WOO_COMMERCE_URL ?? '',
  consumerKey: process.env.WOO_COMMERCE_CONSUMER_KEY ?? '',
  consumerSecret: process.env.WOO_COMMERCE_CONSUMER_SECRET ?? '',
  version: (process.env.WOO_COMMERCE_API_VERSION as WooCommerceRestApiVersion | undefined) ?? 'wc/v3',
  timeoutMs: process.env.WOO_COMMERCE_TIMEOUT_MS ? Number(process.env.WOO_COMMERCE_TIMEOUT_MS) : 15_000,
  debug: process.env.WOO_COMMERCE_DEBUG === 'true',
};

let cachedWooApi: WooCommerceRestApi | null = null;

// Lazily create the default API instance (uses env vars)
export const getWooApi = (): WooCommerceRestApi => {
  if (cachedWooApi) {
    return cachedWooApi;
  }

  if (!defaultConfig.url) {
    throw new Error('WOO_COMMERCE_URL is required to create the default WooCommerce client.');
  }

  if (!defaultConfig.consumerKey || !defaultConfig.consumerSecret) {
    throw new Error('WOO_COMMERCE_CONSUMER_KEY and WOO_COMMERCE_CONSUMER_SECRET are required to create the default WooCommerce client.');
  }

  cachedWooApi = createWooCommerceApi(defaultConfig);
  return cachedWooApi;
};
