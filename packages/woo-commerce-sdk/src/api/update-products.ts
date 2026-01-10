import type WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import type { WooProductCreate } from '../types';
import { getWooApi } from '../woocommerce';

export const updateProduct = async (
  productId: string,
  params?: Partial<WooProductCreate>,
  api?: WooCommerceRestApi
) => {
  try {
    const client = api ?? getWooApi();
    const productResponse = await client.put(`products/${productId}`, params);
    console.log('Product updated :', productResponse?.data?.id);
  } catch (error: any) {
    console.error('Error updating product:', error);
  }
};
