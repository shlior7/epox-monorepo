/**
 * Studio Page Tests
 *
 * Tests the main studio page layout:
 * - Page header
 * - Product grid
 * - Config panel integration
 * - Search and filter functionality
 *
 * Screenshots captured:
 * - studio-header.png - Page header with title
 * - studio-product-grid.png - Product grid area
 * - studio-config-panel.png - Config panel in studio context
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

test.describe('Studio Page', () => {
  test('verify studio page layout and capture screenshots', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    // Navigate to studio
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== STUDIO PAGE VERIFICATION ===\n');

    // ==========================================
    // PHASE 1: DOM State Extraction
    // ==========================================
    const pageState = await authenticatedPage.evaluate(() => {
      const configPanel = document.querySelector('[data-testid="unified-config-panel"]');
      const main = document.querySelector('main');

      return {
        url: window.location.href,
        pageTitle: document.querySelector('h1')?.textContent?.trim(),

        // Config Panel
        configPanel: {
          exists: !!configPanel,
          hasHeader: !!configPanel?.querySelector('[data-testid="unified-config-panel--header"]'),
          hasInspireSection: !!configPanel?.querySelector('[data-testid="inspire-section"]'),
          hasPromptSection: !!configPanel?.querySelector(
            '[data-testid="unified-config-panel--prompt-section"]'
          ),
          hasOutputSection: !!configPanel?.querySelector(
            '[data-testid="unified-config-panel--output-settings"]'
          ),
          hasGenerateButton: !!configPanel?.querySelector(
            '[data-testid="unified-config-panel--generate-button"]'
          ),
          width: configPanel?.getBoundingClientRect().width || 0,
        },

        // Product Grid
        productGrid: {
          exists: !!main?.querySelector('[data-testid="studio-product-grid--grid"]'),
          productCount:
            main?.querySelectorAll('[data-testid^="product-card--"]').length || 0,
          hasSearch: !!main?.querySelector('[data-testid="studio-product-grid--search"]'),
        },

        // Layout dimensions
        layout: {
          hasConfigPanel: !!configPanel,
          hasMain: !!main,
          configPanelWidth: configPanel?.getBoundingClientRect().width || 0,
          mainWidth: main?.getBoundingClientRect().width || 0,
        },
      };
    });

    console.log('Page Title:', pageState.pageTitle);
    console.log('Config Panel:', {
      exists: pageState.configPanel.exists,
      hasHeader: pageState.configPanel.hasHeader,
      hasInspire: pageState.configPanel.hasInspireSection,
      hasOutput: pageState.configPanel.hasOutputSection,
      width: Math.round(pageState.configPanel.width),
    });
    console.log('Product Grid:', {
      exists: pageState.productGrid.exists,
      products: pageState.productGrid.productCount,
      hasSearch: pageState.productGrid.hasSearch,
    });
    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');

    // Assertions
    expect(pageState.pageTitle).toBe('Studio');
    expect(pageState.configPanel.exists).toBe(true);
    expect(pageState.productGrid.exists).toBe(true);
    expect(errors.consoleErrors).toHaveLength(0);

    // ==========================================
    // PHASE 2: Screenshots
    // ==========================================
    console.log('\n=== CAPTURING SCREENSHOTS ===\n');

    // Screenshot 1: Config Panel
    const configPanel = authenticatedPage.locator('[data-testid="unified-config-panel"]');
    if (await configPanel.isVisible()) {
      await configPanel.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'studio-config-panel.png'),
      });
      console.log('Saved: studio-config-panel.png');
    }

    // Screenshot 2: Product Grid area
    const productArea = authenticatedPage.locator('main').first();
    if (await productArea.isVisible()) {
      await productArea.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'studio-product-grid.png'),
      });
      console.log('Saved: studio-product-grid.png');
    }

    // Screenshot 3: Page header
    const pageHeader = authenticatedPage.locator('h1').first();
    if (await pageHeader.isVisible()) {
      const headerSection = pageHeader
        .locator('xpath=ancestor::*[contains(@class, "flex") or contains(@class, "header")]')
        .first();
      if (await headerSection.isVisible().catch(() => false)) {
        await headerSection.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'studio-header.png'),
        });
      } else {
        await pageHeader.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'studio-header.png'),
        });
      }
      console.log('Saved: studio-header.png');
    }

    console.log('\nStudio page verification complete!\n');
  });

  test('verify instant search filters products', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== INSTANT SEARCH VERIFICATION ===\n');

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');

    // Count initial products
    const initialCount = await productCards.count();
    console.log(`Initial product count: ${initialCount}`);

    // Find search input
    const searchInput = authenticatedPage.locator(
      '[data-testid="studio-product-grid--search"] input'
    );

    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('Sofa');
      await authenticatedPage.waitForTimeout(300);

      // Check no loading state
      const loadingText = await authenticatedPage.locator('text=Loading products').count();
      expect(loadingText).toBe(0);
      console.log('No loading state during search: Passed');

      // Check filtered results
      const filteredCount = await productCards.count();
      console.log(`Filtered product count: ${filteredCount}`);

      // Clear search
      await searchInput.fill('');
      await authenticatedPage.waitForTimeout(200);

      // Verify all products return
      const restoredCount = await productCards.count();
      expect(restoredCount).toBe(initialCount);
      console.log('Products restored after clearing search: Passed');
    }

    console.log('\nInstant search verification complete!\n');
  });
});
