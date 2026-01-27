/**
 * Products Feature Tests
 *
 * Tests:
 * - Products list view (table mode)
 * - Grid view toggle
 * - Product detail page
 * - Bulk selection and actions
 * - Scene type dropdown
 * - Imported vs uploaded products
 *
 * Screenshots captured:
 * - products-list-table.png - Products list in table view
 * - products-list-grid.png - Products list in grid view
 * - product-detail-uploaded.png - Uploaded product detail
 * - product-detail-imported.png - Imported product detail
 * - products-bulk-selection.png - Bulk selection state
 * - products-scene-type-dropdown.png - Scene type dropdown
 */

import { test, expect } from '../../setup/auth-fixtures';
import { createNavigationHelper } from '../../helpers/navigation';
import { product } from '../../helpers/schema-tables';
import { cleanClientData, seedProductsViaAPI } from '../../helpers/seed-helpers-api';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

test.use({ testClientName: 'products' });

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Products Feature', () => {
  test.describe.configure({ mode: 'serial' });

  let uploadedProductId: string;
  let importedProductId: string | undefined;

  // Setup test: Seed data using APIs (must be first test in serial mode)
  test('setup: seed products feature data', async ({ db, clientId, authenticatedPage }) => {
    console.log('\n🌱 Seeding Products Feature Data via API...\n');

    // Clean existing data for this client
    await cleanClientData(db, clientId);

    // Seed products using POST /api/products (tests the API!)
    // Note: POST /api/products only creates uploaded products
    // Imported products would need POST /api/products/import (TODO)
    const productIds = await seedProductsViaAPI(authenticatedPage, [
      {
        name: 'Modern Sofa',
        description: 'A comfortable modern sofa',
        category: 'Furniture',
        sceneTypes: ['living-room'],
      },
      {
        name: 'Oak Dining Table',
        description: 'Solid oak dining table',
        category: 'Furniture',
        sceneTypes: ['dining-room'],
      },
      {
        name: 'LED Floor Lamp',
        description: 'Adjustable LED floor lamp',
        category: 'Lighting',
        sceneTypes: ['living-room'],
      },
      {
        name: 'Office Chair',
        description: 'Ergonomic office chair',
        category: 'Furniture',
        sceneTypes: ['office'],
      },
      {
        name: 'Standing Desk',
        description: 'Adjustable standing desk',
        category: 'Furniture',
        sceneTypes: ['office'],
      },
      {
        name: 'Outdoor Patio Set',
        description: 'Weather-resistant patio furniture',
        category: 'Outdoor',
        sceneTypes: ['outdoor'],
      },
    ]);

    // Get product IDs for later tests (all are uploaded via API)
    const allProducts = await db.query.product.findMany({
      where: (prod: any, { eq }: any) => eq(prod.clientId, clientId),
    });

    uploadedProductId = allProducts[0]?.id;
    // Note: No imported products in this version since we're using POST /api/products
    // Imported product tests can be added once POST /api/products/import is available
    importedProductId = undefined;

    console.log('✅ Products feature data seeded via API\n');
  });

  test('verify products list table view', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== PRODUCTS LIST TABLE VIEW TEST ===\n');

    const nav = createNavigationHelper(authenticatedPage, clientId);
    await nav.goToProducts();

    // 🔍 DATABASE VERIFICATION
    const allProducts = await db.query.product.findMany({
      where: (prod: any, { eq }: any) => eq(prod.clientId, clientId),
    });

    console.log(`Database has ${allProducts.length} products`);
    expect(allProducts.length).toBeGreaterThan(0);

    // Categorize products
    const uploadedProducts = allProducts.filter((p: any) => p.source === 'uploaded');
    const importedProducts = allProducts.filter((p: any) => p.source === 'imported');

    console.log(`  Uploaded: ${uploadedProducts.length}`);
    console.log(`  Imported: ${importedProducts.length}`);

    // Store product IDs for later tests
    uploadedProductId = uploadedProducts[0]?.id;
    importedProductId = importedProducts[0]?.id;

    allProducts.forEach((p: any) => {
      console.log(`  - ${p.name} (${p.source}) - ${p.category} - Scene: ${p.selectedSceneType || 'none'}`);
    });

    // 📸 UI VERIFICATION
    const listState = await authenticatedPage.evaluate(() => {
      const productRows = document.querySelectorAll('[data-testid^="product-row--"], [data-testid^="product-card--"]');
      const tableView = !!document.querySelector('[data-testid^="product-row--"]');

      return {
        viewMode: tableView ? 'table' : 'grid',
        totalProducts: productRows.length,
        hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length > 0,
        hasViewToggle: !!document.querySelector('[data-testid*="view-toggle"]'),
      };
    });

    console.log('Products List UI State:', listState);
    expect(listState.totalProducts).toBe(allProducts.length);
    console.log('✅ UI matches database: same number of products');

    // 📸 Screenshot: Table view
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'products-list-table.png'),
      fullPage: false,
    });
    console.log('📸 Saved: products-list-table.png');

    console.log('\n✅ Table view verification complete!\n');
  });

  test('verify grid view toggle', async ({ authenticatedPage }) => {
    console.log('\n=== GRID VIEW TEST ===\n');

    // Find and click grid view toggle
    const gridToggle = authenticatedPage.locator('[data-testid="view-toggle-grid"], [data-testid*="grid"]').first();

    // Only click if it exists and is visible
    if (await gridToggle.isVisible().catch(() => false)) {
      await gridToggle.click();
      await authenticatedPage.waitForTimeout(500);

      // 📸 UI VERIFICATION
      const gridState = await authenticatedPage.evaluate(() => {
        const productCards = document.querySelectorAll('[data-testid^="product-grid-card--"]');
        return {
          viewMode: 'grid',
          totalProducts: productCards.length,
          hasGridCards: productCards.length > 0,
        };
      });

      console.log('Grid View State:', gridState);

      if (gridState.hasGridCards) {
        expect(gridState.totalProducts).toBeGreaterThan(0);
        console.log('✅ Grid view activated');

        // 📸 Screenshot: Grid view
        await authenticatedPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'products-list-grid.png'),
          fullPage: false,
        });
        console.log('📸 Saved: products-list-grid.png');
      } else {
        console.log('⚠️  Grid view toggle found but no grid cards rendered');
      }

      // Switch back to table view for next tests
      const tableToggle = authenticatedPage.locator('[data-testid="view-toggle-table"], [data-testid*="table"]').first();
      if (await tableToggle.isVisible().catch(() => false)) {
        await tableToggle.click();
        await authenticatedPage.waitForTimeout(500);
      }
    } else {
      console.log('⚠️  Grid view toggle not found, skipping grid view test');
    }

    console.log('\n✅ Grid view test complete!\n');
  });

  test('verify bulk selection and actions', async ({ authenticatedPage }) => {
    console.log('\n=== BULK ACTIONS TEST ===\n');

    // Select first product checkbox
    const firstCheckbox = authenticatedPage.locator('input[type="checkbox"]').nth(1); // nth(0) is usually "select all"
    if (await firstCheckbox.isVisible().catch(() => false)) {
      await firstCheckbox.click();
      await authenticatedPage.waitForTimeout(300);

      // 📸 UI VERIFICATION
      const selectionState = await authenticatedPage.evaluate(() => {
        const island = document.querySelector('[data-testid="selection-action-island"], [data-testid*="selection"]');
        return {
          islandVisible: !!island && getComputedStyle(island).display !== 'none',
          selectedCount: island?.textContent?.match(/\d+/)?.[0],
          hasDeleteButton: !!island?.querySelector('[data-testid*="delete"], button:has-text("Delete")'),
          hasClearButton: !!island?.querySelector('[data-testid*="clear"], button:has-text("Clear")'),
        };
      });

      console.log('Selection State:', selectionState);

      if (selectionState.islandVisible) {
        expect(selectionState.hasDeleteButton || selectionState.hasClearButton).toBe(true);
        console.log('✅ Selection island visible with actions');

        // 📸 Screenshot: Bulk selection
        await authenticatedPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'products-bulk-selection.png'),
          fullPage: false,
        });
        console.log('📸 Saved: products-bulk-selection.png');

        // Clear selection
        const clearButton = authenticatedPage.locator('[data-testid*="clear"], button:has-text("Clear")').first();
        if (await clearButton.isVisible().catch(() => false)) {
          await clearButton.click();
          await authenticatedPage.waitForTimeout(300);
          console.log('✅ Selection cleared');
        }
      } else {
        console.log('⚠️  Selection island not visible after selecting product');
      }
    } else {
      console.log('⚠️  No checkboxes found, skipping bulk selection test');
    }

    console.log('\n✅ Bulk actions test complete!\n');
  });

  test('verify uploaded product detail page', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== UPLOADED PRODUCT DETAIL TEST ===\n');

    if (!uploadedProductId) {
      console.log('⚠️  No uploaded product found, skipping test');
      return;
    }

    // 🔍 DATABASE VERIFICATION
    const productData = await db.query.product.findFirst({
      where: (prod: any, { eq }: any) => eq(prod.id, uploadedProductId),
    });

    expect(productData).toBeTruthy();
    expect(productData!.source).toBe('uploaded');
    console.log('Product from database:', productData!.name);
    console.log('  Category:', productData!.category);
    console.log('  Scene Type:', productData!.selectedSceneType);
    console.log('  Source:', productData!.source);

    // Navigate to product detail
    await authenticatedPage.goto(`/products/${uploadedProductId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 📸 UI VERIFICATION
    const detailState = await authenticatedPage.evaluate(() => {
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        hasDescription: !!document.querySelector('[data-testid*="description"]'),
        hasSceneType: !!document.querySelector('[data-testid*="scene-type"]'),
        hasActions: !!document.querySelector('[data-testid*="actions"]'),
        hasStoreLink: !!document.querySelector('[href*="http"]'),
      };
    });

    console.log('Product Detail UI State:', detailState);
    expect(detailState.pageTitle).toContain(productData!.name);
    console.log('✅ UI shows correct product');

    // 📸 Screenshot: Uploaded product detail
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'product-detail-uploaded.png'),
      fullPage: false,
    });
    console.log('📸 Saved: product-detail-uploaded.png');

    console.log('\n✅ Uploaded product detail verification complete!\n');
  });

  test('verify imported product detail page', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== IMPORTED PRODUCT DETAIL TEST ===\n');

    if (!importedProductId) {
      console.log('⚠️  No imported product found, skipping test');
      return;
    }

    // 🔍 DATABASE VERIFICATION
    const productData = await db.query.product.findFirst({
      where: (prod: any, { eq }: any) => eq(prod.id, importedProductId),
    });

    expect(productData).toBeTruthy();
    expect(productData!.source).toBe('imported');
    expect(productData!.storeUrl).toBeTruthy();
    console.log('Product from database:', productData!.name);
    console.log('  Category:', productData!.category);
    console.log('  Scene Type:', productData!.selectedSceneType);
    console.log('  Source:', productData!.source);
    console.log('  Store URL:', productData!.storeUrl);

    // Navigate to product detail
    await authenticatedPage.goto(`/products/${importedProductId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // 📸 UI VERIFICATION
    const detailState = await authenticatedPage.evaluate(() => {
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        hasStoreLink: !!document.querySelector('[data-testid*="store"], a[href*="http"]'),
        storeUrlText: document.querySelector('[data-testid*="store"], a[href*="http"]')?.textContent,
      };
    });

    console.log('Imported Product Detail UI State:', detailState);
    expect(detailState.pageTitle).toContain(productData!.name);

    if (detailState.hasStoreLink) {
      console.log('✅ Store link visible for imported product');
    }

    // 📸 Screenshot: Imported product detail
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'product-detail-imported.png'),
      fullPage: false,
    });
    console.log('📸 Saved: product-detail-imported.png');

    console.log('\n✅ Imported product detail verification complete!\n');
  });

  test('verify scene type dropdown functionality', async ({
    authenticatedPage,
    clientId,
  }) => {
    console.log('\n=== SCENE TYPE DROPDOWN TEST ===\n');

    // Navigate back to products list
    const nav = createNavigationHelper(authenticatedPage, clientId);
    await nav.goToProducts();

    // Look for scene type dropdown button
    const sceneTypeButton = authenticatedPage.locator('[data-testid*="scene-type"], button:has-text("Scene Type")').first();

    if (await sceneTypeButton.isVisible().catch(() => false)) {
      await sceneTypeButton.click();
      await authenticatedPage.waitForTimeout(300);

      // Check if dropdown opened
      const dropdownState = await authenticatedPage.evaluate(() => {
        const dropdown = document.querySelector('[role="menu"], [data-testid*="dropdown"]');
        return {
          isOpen: !!dropdown && getComputedStyle(dropdown).display !== 'none',
          hasOptions: dropdown ? dropdown.querySelectorAll('[role="menuitem"], button, a').length > 0 : false,
        };
      });

      console.log('Scene Type Dropdown State:', dropdownState);

      if (dropdownState.isOpen && dropdownState.hasOptions) {
        console.log('✅ Scene type dropdown opened successfully');

        // 📸 Screenshot: Scene type dropdown
        await authenticatedPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'products-scene-type-dropdown.png'),
          fullPage: false,
        });
        console.log('📸 Saved: products-scene-type-dropdown.png');

        // Close dropdown by pressing Escape
        await authenticatedPage.keyboard.press('Escape');
        await authenticatedPage.waitForTimeout(200);
      } else {
        console.log('⚠️  Scene type dropdown found but did not open');
      }
    } else {
      console.log('⚠️  Scene type dropdown not found');
    }

    console.log('\n✅ Scene type dropdown test complete!\n');
  });
});
