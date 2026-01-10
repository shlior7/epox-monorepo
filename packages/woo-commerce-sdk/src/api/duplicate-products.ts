import fs from 'node:fs';
import type WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { getWooApi } from '../woocommerce';
import type { WooProduct } from '../types';

export const duplicateProduct = async (slug?: string, api?: WooCommerceRestApi) => {
  try {
    const client = api ?? getWooApi();
    const productResponse = await client.post(`products/${slug}/duplicate`, {});
    console.log('Product created :', productResponse.data);
    fs.writeFileSync('./src/data/duplicate-product.json', JSON.stringify(productResponse.data, null, 2));
  } catch (error: any) {
    console.error('Error creating product:', error.response.data);
    throw error;
  }
};
