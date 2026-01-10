import type WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { getWooApi } from '../woocommerce';
import type { ProductData, WooProduct } from '../types';

export const createProductVariation = async (
  product: Pick<ProductData, 'id' | 'price' | 'regular_price' | 'images'>,
  api?: WooCommerceRestApi
) => {
  const client = api ?? getWooApi();
  const response = await client
    .post(`products/${product.id}/variations`, {
      price: product.price,
      regular_price: product.regular_price,
      attributes: [],
      image: { id: product.images?.[0].id },
    })
    .catch((error: unknown) => {
      const e = error as any;
      console.error('Error creating product variation');
      throw e;
    });

  return response.data;
};

export const createProductAttribute = async (
  attribute: { name: string; slug: string; terms: Array<{ name: string; slug: string }> },
  api?: WooCommerceRestApi
) => {
  const client = api ?? getWooApi();
  const response = await client
    .post(`products/attributes`, {
      name: attribute.name,
      slug: attribute.slug,
      type: 'select',
      order_by: 'menu_order',
      has_archives: false,
    })
    .catch((error: unknown) => {
      const e = error as any;
      console.error('Error creating product attribute');
      throw e;
    });

  const attributeId = response.data.id;
  await createProductAttributeTerms(attributeId, attribute.terms, client).catch((error: unknown) => {});
};

export const createProductAttributeTerms = async (
  attributeId: string,
  terms: Array<{ name: string; slug: string }> = [],
  api?: WooCommerceRestApi
) => {
  const client = api ?? getWooApi();
  for (const term of terms) {
    await client.post(`products/attributes/${attributeId}/terms`, term).catch(() => {
      console.error('Error creating product attribute term', term.name);
    });
  }
};

export const createProduct = async (product: {
  name: string;
  price: string;
  type: 'variable' | 'simple';
  regular_price: string;
  description: string;
  short_description: string;
  categories: any[];
  images: any[];
  meta_data?: any[];
  sku?: string;
}, api?: WooCommerceRestApi): Promise<WooProduct> => {
  const client = api ?? getWooApi();
  const productResponse = await client.post('products', {
    name: product.name,
    type: product.type,
    price: product.price,
    regular_price: product.regular_price,
    description: product.description,
    short_description: product.short_description,
    categories: product.categories,
    images: product.images,
    catalog_visibility: 'hidden',
  });

  return productResponse.data;
};
