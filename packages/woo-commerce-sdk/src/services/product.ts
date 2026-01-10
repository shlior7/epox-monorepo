import puppeteer from 'puppeteer';
import type { ProductData } from '../types';

export const extractProductsSlugFromUrl = async (productsData: ProductData[]) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const productData of productsData) {
    try {
      await page.goto(productData.url, { waitUntil: 'networkidle2' });

      const finalSegment = await page.evaluate(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter((segment) => segment.length > 0);
        return segments.at(-1);
      });

      productData.slug = finalSegment;
      console.log(`Product name extracted from URL: ${productData.id} => ${productData.slug}`);
    } catch (error) {
      console.error(`Error extracting product name from URL: ${productData.url}`, error);
    }
  }

  await browser.close();

  return productsData;
};
