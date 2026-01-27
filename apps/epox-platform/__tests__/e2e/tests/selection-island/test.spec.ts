/**
 * Selection Island Tests
 *
 * Tests the product selection workflow:
 * - Selection island appears when products are selected
 * - Selection count updates
 * - Show Selected / Show All toggle
 * - Clear selection functionality
 *
 * Screenshots captured:
 * - selection-island-single.png - Island with 1 product selected
 * - selection-island-multiple.png - Island with multiple products selected
 * - show-selected-before.png - Before filtering
 * - show-selected-filtered.png - After filtering to show only selected
 * - show-selected-restored.png - After restoring all products
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

// Use products client which has products seeded
test.use({ testClientName: 'products' });

test.describe('Selection Island - Basic Functionality', () => {
  test('selection island appears when products are selected', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    // Navigate to studio
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== SELECTION ISLAND FUNCTIONALITY ===\n');

    // ==========================================
    // PHASE 1: Verify initial state (no selection island)
    // ==========================================
    const initialState = await authenticatedPage.evaluate(() => {
      return {
        hasSelectionIsland: !!document.querySelector('[data-testid="selection-island"]'),
        productCards:
          document.querySelectorAll('[data-testid^="product-card--"]').length,
      };
    });

    console.log('Initial state:', initialState);
    expect(initialState.hasSelectionIsland).toBe(false);

    // ==========================================
    // PHASE 2: Select a product
    // ==========================================
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} product cards`);

    if (cardCount > 0) {
      // Click first product
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      // Check selection island appeared
      const selectionIsland = authenticatedPage.locator('[data-testid="selection-island"]');
      await expect(selectionIsland).toBeVisible({ timeout: 3000 });

      const countText = await authenticatedPage
        .locator('[data-testid="selection-island-count"]')
        .textContent();
      console.log('Selection count:', countText);

      // Screenshot: Single selection
      await selectionIsland.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'selection-island-single.png'),
      });
      console.log('Saved: selection-island-single.png');

      // ==========================================
      // PHASE 3: Select multiple products
      // ==========================================
      if (cardCount > 1) {
        await productCards.nth(1).click();
        await authenticatedPage.waitForTimeout(500);

        const afterSecondSelect = await authenticatedPage.evaluate(() => {
          const island = document.querySelector('[data-testid="selection-island"]');
          const countEl = island?.querySelector('[data-testid="selection-island-count"]');
          return {
            selectedCount: countEl?.textContent?.match(/(\d+)/)?.[1] || '0',
            hasCreateCollection:
              island?.textContent?.includes('Create Collection') ||
              !!island?.querySelector('button:has-text("Create Collection")'),
          };
        });

        console.log('After second selection:', afterSecondSelect);
        expect(parseInt(afterSecondSelect.selectedCount)).toBeGreaterThanOrEqual(2);

        // Screenshot: Multiple selections
        await selectionIsland.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'selection-island-multiple.png'),
        });
        console.log('Saved: selection-island-multiple.png');
      }
    }

    // Check for errors
    const filteredErrors = errors.consoleErrors.filter((e) => !e.includes('404'));
    expect(filteredErrors).toHaveLength(0);

    console.log('\nSelection island functionality verified!\n');
  });

  test('clear selection removes selection island', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== CLEAR SELECTION TEST ===\n');

    // Select a product
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    if ((await productCards.count()) > 0) {
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      // Verify island appeared
      const selectionIsland = authenticatedPage.locator('[data-testid="selection-island"]');
      await expect(selectionIsland).toBeVisible();

      // Find and click clear/close button
      const clearButton = authenticatedPage.locator(
        '[data-testid="selection-island-clear"], [data-testid="selection-island"] button:first-child'
      );
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await authenticatedPage.waitForTimeout(500);

        // Verify island is gone
        const afterClear = await authenticatedPage.evaluate(() => {
          return {
            hasSelectionIsland: !!document.querySelector('[data-testid="selection-island"]'),
          };
        });

        console.log('After clear:', afterClear);
        expect(afterClear.hasSelectionIsland).toBe(false);
      }
    }

    console.log('\nClear selection verified!\n');
  });
});

test.describe('Selection Island - Show Selected Toggle', () => {
  test('show selected filters products to only selected ones', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== SHOW SELECTED FILTER TEST ===\n');

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');

    // Count initial products
    const initialCount = await productCards.count();
    console.log(`Initial product count: ${initialCount}`);

    // Use "Select All" button
    const selectAllBtn = authenticatedPage.locator(
      '[data-testid="studio-product-grid--select-all"]'
    );
    await selectAllBtn.click();
    await authenticatedPage.waitForTimeout(500);

    // Verify selection island appeared
    const selectionIsland = authenticatedPage.locator('[data-testid="selection-island"]');
    await expect(selectionIsland).toBeVisible({ timeout: 5000 });
    console.log('Selection island visible');

    // Get selected count
    const countText = await authenticatedPage
      .locator('[data-testid="selection-island-count"]')
      .textContent();
    const selectedCount = parseInt(countText?.match(/(\d+)/)?.[1] || '0');
    console.log(`Selected count: ${selectedCount}`);
    expect(selectedCount).toBeGreaterThan(0);

    // Get show toggle button
    const showToggleBtn = authenticatedPage.locator('[data-testid="selection-island-show-toggle"]');
    await expect(showToggleBtn).toBeVisible();
    await expect(showToggleBtn).toContainText('Show Selected');
    console.log('Show Selected button visible');

    // Screenshot: Before filtering
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'show-selected-before.png'),
      fullPage: false,
    });
    console.log('Saved: show-selected-before.png');

    // Click "Show Selected" toggle
    await showToggleBtn.click();

    // Verify button changed to "Show All"
    await expect(showToggleBtn).toContainText('Show All');
    console.log('Button changed to "Show All"');

    await authenticatedPage.waitForTimeout(500);

    // Count filtered products
    const filteredCount = await productCards.count();
    console.log(`Filtered product count: ${filteredCount}`);
    expect(filteredCount).toBe(selectedCount);

    // Screenshot: After filtering
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'show-selected-filtered.png'),
      fullPage: false,
    });
    console.log('Saved: show-selected-filtered.png');

    // Click "Show All" to restore
    await showToggleBtn.click();
    await authenticatedPage.waitForTimeout(500);

    // Verify all products shown again
    const restoredCount = await productCards.count();
    console.log(`Restored product count: ${restoredCount}`);
    expect(restoredCount).toBe(initialCount);

    // Verify button is back to "Show Selected"
    await expect(showToggleBtn).toContainText('Show Selected');
    console.log('Button changed back to "Show Selected"');

    // Screenshot: After restoring
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'show-selected-restored.png'),
      fullPage: false,
    });
    console.log('Saved: show-selected-restored.png');

    console.log('\nShow Selected filter test complete!\n');
  });
});

test.describe('Selection Island - Selection Persistence', () => {
  test('selection persists during filter changes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== SELECTION PERSISTENCE TEST ===\n');

    // Select a product
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    if ((await productCards.count()) > 0) {
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      // Get selected count
      const beforeFilter = await authenticatedPage.evaluate(() => {
        const countEl = document.querySelector('[data-testid="selection-island-count"]');
        return {
          selectedCount: countEl?.textContent?.match(/(\d+)/)?.[1] || '0',
        };
      });
      console.log('Before filter:', beforeFilter);

      // Search for something (this should filter products but keep selection)
      const searchInput = authenticatedPage.locator(
        '[data-testid="studio-product-grid--search"] input'
      );
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await authenticatedPage.waitForTimeout(500);

        // Check selection persisted
        const afterFilter = await authenticatedPage.evaluate(() => {
          const island = document.querySelector('[data-testid="selection-island"]');
          const countEl = island?.querySelector('[data-testid="selection-island-count"]');
          return {
            hasSelectionIsland: !!island,
            selectedCount: countEl?.textContent?.match(/(\d+)/)?.[1] || '0',
          };
        });

        console.log('After filter:', afterFilter);
        expect(afterFilter.hasSelectionIsland).toBe(true);

        // Clear search
        await searchInput.fill('');
        await authenticatedPage.waitForTimeout(300);
      }
    }

    console.log('\nSelection persistence verified!\n');
  });
});
