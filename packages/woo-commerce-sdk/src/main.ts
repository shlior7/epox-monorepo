import { getProductsBySlugs } from './api/get-products';
import { productsData } from './data/productData';
import { extractProductsSlugFromUrl } from './services/product';
import fs from 'node:fs';

const main = async () => {
  console.log('Done');
};

main().catch(console.error);
