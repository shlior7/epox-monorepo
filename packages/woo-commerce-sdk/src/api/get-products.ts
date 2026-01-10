import type WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { getWooApi } from '../woocommerce';
import fs from 'node:fs';
import type { ProductData, WooProduct } from '../types';
import _ from 'lodash';

export const enrichProductData = async (wooProduct: Partial<WooProduct>, productData: ProductData): Promise<any> => {
  return {
    ...productData,
    name: wooProduct.name ?? null,
    slug: wooProduct.slug ?? null,
    product_id: wooProduct.id ?? null,
    price: wooProduct.price ?? null,
    regular_price: wooProduct.regular_price ?? null,
    type: wooProduct.type ?? null,
    status: wooProduct.status ?? null,
    attributes: wooProduct.attributes ?? null,
    description: wooProduct.description ?? null,
    short_description: wooProduct.short_description ?? null,
    categories: wooProduct.categories ?? null,
    images: wooProduct.images ?? null,
    sku: wooProduct.sku ?? null,
  };
};

export const getProductById = async (
  productId: string,
  params: Array<keyof WooProduct>,
  api?: WooCommerceRestApi
): Promise<Partial<WooProduct> | null> => {
  try {
    const client = api ?? getWooApi();
    const product = await client
      .get(`products/${productId}`)
      .then((response) => _.pick(response.data, params))
      .catch((error: unknown) => {
        console.error(`Error fetching product ${productId}:`, error);
        return { slug: productId };
      });

    return product;
  } catch (error: any) {
    console.error('Error fetching products:', error.message);
  }

  return null;
};

export const getProductsBySlugs = async (
  productsData?: ProductData[] | void,
  api?: WooCommerceRestApi
): Promise<ProductData[]> => {
  if (!productsData) {
    console.error('No products data provided');
    return [];
  }

  console.log('Fetching products...');
  try {
    const client = api ?? getWooApi();
    const promises = productsData.map(async (productData) =>
      client
        .get('products', {
          per_page: 5,
          slug: productData.slug,
        })
        .then((response) => enrichProductData(response?.data?.[0], productData))
        .catch((error: unknown) => {
          console.error(`Error fetching product ${productData.slug}:`, error);
          return { ...productData };
        })
    );

    const products = await Promise.all(promises);

    // fs.writeFileSync('./src/data/_products.json', JSON.stringify(products, null, 2));

    return products;
  } catch (error: any) {
    console.error('Error fetching products:', error.message);
  }

  return productsData;
};

// export const getProductsByIds = async (productsData?: ProductData[] | void): Promise<ProductData[]> => {
//   if (!productsData) {
//     console.error('No products data provided');
//     return [];
//   }

//   console.log('Fetching products...');
//   try {
//     const promises = productsData.map(async (productData) =>
//       getProductData(productData.id)
//         .then((response) => enrichProductData(response?.data?.[0], productData))
//         .catch((error: unknown) => {
//           console.error(`Error fetching product ${productData.slug}:`, error);
//           return { ...productData };
//         })
//     );

//     const products = await Promise.all(promises);

//     // fs.writeFileSync('./src/data/_products.json', JSON.stringify(products, null, 2));

//     return products;
//   } catch (error: any) {
//     console.error('Error fetching products:', error.message);
//   }

//   return productsData;
// };

export const getConfigProductData = async (productId: string, configurationId?: string, api?: WooCommerceRestApi) => {
  console.log('Fetching product data...');
  try {
    const client = api ?? getWooApi();
    const response = await client.get(`products/${productId}`);

    console.log('Product data:', response.data);
    fs.writeFileSync('./src/data/_product-data.json', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error fetching product:', error.message);
  }
};

export const getProductData = async (productId: string, api?: WooCommerceRestApi) => {
  console.log('Fetching product data...');
  try {
    const client = api ?? getWooApi();
    const response = await client.get(`products/${productId}`);

    console.log('Product data:', response.data);
    // fs.writeFileSync('./src/data/_product-data.json', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error: any) {
    console.error('Error fetching product variations:', error.message);
  }
};

export const getProductVariation = async (productId: string, api?: WooCommerceRestApi) => {
  console.log('Fetching product variations...');
  try {
    const client = api ?? getWooApi();
    const response = await client.get(`products/${productId}/variations`);

    console.log('Product variations:', response.data);
    fs.writeFileSync('./src/data/_product-variations.json', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error fetching product variations:', error.message);
  }
};

export const getProductAttributes = async (api?: WooCommerceRestApi) => {
  console.log('Fetching product attributes...');
  try {
    const client = api ?? getWooApi();
    const response = await client.get(`products/attributes`);

    console.log('Product attributes:', response.data);
    // fs.writeFileSync('./src/data/_product-attributes.json', JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error: any) {
    console.error('Error fetching product attributes:', error.message);
  }
};

export const getProductAttributesTerms = async (attributeId: string, api?: WooCommerceRestApi) => {
  console.log('Fetching product attributes...');
  try {
    const client = api ?? getWooApi();
    const response = await client.get(`products/attributes/${attributeId}/terms`);

    console.log('Product attributes terms:', response.data);
    // fs.writeFileSync('./src/data/_product-attributes-terms.json', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error fetching product attributes:', error.message);
  }
};

export const getProductsStockStatus = async (api?: WooCommerceRestApi) => {
  console.log('Fetching products stock status...');
  try {
    const response = await getProductData('3429', api ?? getWooApi());

    console.log('Products stock status:', response.data);
    // fs.writeFileSync('./src/data/_products-stock-status.json', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error fetching products stock status:', error.message);
  }
};
