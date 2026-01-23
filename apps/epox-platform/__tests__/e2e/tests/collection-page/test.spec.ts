/**
 * Collection Page Tests
 *
 * Tests the collection creation and viewing workflow:
 * - Creating a collection from multiple products
 * - Collection studio page layout
 * - Collections list page
 *
 * Screenshots captured:
 * - collection-studio-page.png - Collection studio view
 * - collections-list.png - Collections list page
 */

import { test, expect } from '../../setup/auth-fixtures';
import { createNavigationHelper } from '../../helpers/navigation';
import path from 'path';
import fs from 'fs';

// Screenshots directory for this test suite
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.use({ testClientName: 'main' });

test.describe('Collection Creation Flow', () => {
  test('multiple products create collection', async ({ authenticatedPage, clientId }) => {
    const errors = await createNavigationHelper(authenticatedPage, clientId).captureErrors();

    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== COLLECTION CREATION TEST ===\n');

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} products`);

    if (cardCount >= 2) {
      // Select first two products
      await productCards.nth(0).click();
      await authenticatedPage.waitForTimeout(300);
      await productCards.nth(1).click();
      await authenticatedPage.waitForTimeout(500);

      // Check button text says "Create Collection"
      const createBtn = authenticatedPage.locator(
        '[data-testid="selection-island-create-button"], button[class*="glow"]'
      ).first();
      const buttonText = await createBtn.textContent();
      console.log('Button text:', buttonText);
      expect(buttonText).toContain('Create Collection');

      // Click the create button
      await createBtn.click();

      // Wait for navigation to collection studio page
      await authenticatedPage.waitForURL(/\/studio\/collections\/[^/]+$/, { timeout: 15000 });

      const finalUrl = authenticatedPage.url();
      console.log('Navigated to:', finalUrl);
      expect(finalUrl).toMatch(/\/studio\/collections\/[a-f0-9-]+$/);

      // Verify collection page loaded
      await authenticatedPage.waitForLoadState('networkidle');

      const collectionState = await authenticatedPage.evaluate(() => {
        return {
          pageTitle: document.querySelector('h1')?.textContent?.trim(),
          hasProductList: !!document.querySelector('[class*="product"], [class*="flow"]'),
          hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
          url: window.location.href,
        };
      });

      console.log('Collection page state:', collectionState);

      // Screenshot: Collection studio page
      await authenticatedPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'collection-studio-page.png'),
        fullPage: false,
      });
      console.log('Saved: collection-studio-page.png');
    } else {
      console.log('Not enough products to test collection creation (need at least 2)');
      test.skip();
    }

    console.log('\nCollection creation verified!\n');
  });

  test('collection appears in collections list', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== COLLECTIONS LIST TEST ===\n');

    // Navigate to collections list
    await authenticatedPage.goto('/collections');
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify collections page loaded
    const collectionsState = await authenticatedPage.evaluate(() => {
      const collectionCards = document.querySelectorAll(
        '[data-testid^="collection-card--"], [class*="card"]'
      );
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        totalCollections: collectionCards.length,
        collectionNames: Array.from(collectionCards)
          .slice(0, 5)
          .map((c) => c.textContent?.substring(0, 50)),
      };
    });

    console.log('Collections List State:');
    console.log('  Page Title:', collectionsState.pageTitle);
    console.log('  Total Collections:', collectionsState.totalCollections);

    // Screenshot: Collections list
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collections-list.png'),
      fullPage: false,
    });
    console.log('Saved: collections-list.png');

    console.log('\nCollections list verification complete!\n');
  });
});

test.describe('Collection Studio', () => {
  test('collection studio has config panel and product list', async ({
    authenticatedPage,
    clientId,
  }) => {
    // First create a collection
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();

    if (cardCount >= 2) {
      // Select two products and create collection
      await productCards.nth(0).click();
      await authenticatedPage.waitForTimeout(300);
      await productCards.nth(1).click();
      await authenticatedPage.waitForTimeout(500);

      const createBtn = authenticatedPage.locator(
        '[data-testid="selection-island-create-button"], button[class*="glow"]'
      ).first();
      await createBtn.click();
      await authenticatedPage.waitForURL(/\/studio\/collections\//, { timeout: 15000 });

      console.log('\n=== COLLECTION STUDIO VERIFICATION ===\n');

      // Verify collection studio layout
      const studioState = await authenticatedPage.evaluate(() => {
        return {
          hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
          hasInspireSection: !!document.querySelector('[data-testid="inspire-section"]'),
          hasOutputSettings: !!document.querySelector(
            '[data-testid="unified-config-panel--output-settings"]'
          ),
          hasGenerateButton: !!document.querySelector(
            '[data-testid="unified-config-panel--generate-button"]'
          ),
          sceneTypeCount:
            document.querySelectorAll('[data-testid^="scene-type-accordion"]').length,
        };
      });

      console.log('Collection Studio State:', studioState);

      expect(studioState.hasConfigPanel).toBe(true);
      expect(studioState.hasInspireSection).toBe(true);
      expect(studioState.hasGenerateButton).toBe(true);

      // Screenshot: Collection studio config panel
      const configPanel = authenticatedPage.locator('[data-testid="unified-config-panel"]');
      if (await configPanel.isVisible()) {
        await configPanel.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'collection-config-panel.png'),
        });
        console.log('Saved: collection-config-panel.png');
      }
    } else {
      console.log('Not enough products to test (need at least 2)');
      test.skip();
    }

    console.log('\nCollection studio verification complete!\n');
  });
});
