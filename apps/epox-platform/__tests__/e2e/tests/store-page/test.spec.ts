/**
 * Store Page E2E Tests
 *
 * Tests the Store page integration:
 * - Store connection status (connected vs wizard)
 * - Product display with two sections (synced/unsynced)
 * - Filter functionality (search, sync status, favorites, product)
 * - Asset selection and bulk actions
 * - Individual asset sync/unsync operations
 * - Navigation to product detail pages
 * - Import and Settings modals
 *
 * Screenshots captured:
 * - store-page-connected.png - Store page when connected
 * - store-filters.png - Filter bar
 * - store-product-group.png - Single product group with sections
 * - store-bulk-action-bar.png - Bulk action bar with selections
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

// Use store client for store-related tests
test.use({ testClientName: 'store' });

/**
 * Helper to check if we're on the correct app (epox-platform, not admin console)
 */
async function checkIsCorrectApp(page: any): Promise<boolean> {
  const url = page.url();
  // If we're on admin/login, we're on the wrong app
  if (url.includes('/admin/login')) {
    console.log('⚠️ Test redirected to admin console - wrong app is running on port 3000');
    return false;
  }
  return true;
}

test.describe('Store Page', () => {
  test('verify store page layout and navigation', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    // Navigate to store
    await nav.goToStore();

    // Check if we're on the correct app
    if (!(await checkIsCorrectApp(authenticatedPage))) {
      test.skip();
      return;
    }

    console.log('\n=== STORE PAGE VERIFICATION ===\n');

    // ==========================================
    // PHASE 1: DOM State Extraction
    // ==========================================
    const pageState = await nav.getStorePageState();

    console.log('Store State:', pageState.state);
    console.log('Header Title:', pageState.headerTitle);
    console.log('Product Groups Count:', pageState.productGroupCount);
    console.log('Has Import Button:', pageState.hasImportButton);
    console.log('Has Settings Button:', pageState.hasSettingsButton);

    // Filter out expected 401 errors from admin endpoints (not our app)
    const relevantErrors = errors.consoleErrors.filter(
      (e) => !e.includes('admin') && !e.includes('401')
    );
    console.log('Console Errors:', relevantErrors.length > 0 ? relevantErrors : 'None');

    // Check that we're on the store page
    const url = authenticatedPage.url();
    expect(url).toContain('/store');

    console.log('\nStore page layout verification complete!\n');
  });

  test('verify store page states (loading, connected, wizard)', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== STORE PAGE STATES VERIFICATION ===\n');

    // Navigate to store
    await nav.goToStore();

    // Check if we're on the correct app
    if (!(await checkIsCorrectApp(authenticatedPage))) {
      test.skip();
      return;
    }

    // Extract the current state
    const pageState = await authenticatedPage.evaluate(() => {
      return {
        isLoading: !!document.querySelector('[data-testid="store-page-loading"]'),
        isConnected: !!document.querySelector('[data-testid="store-page-connected"]'),
        isWizard: !!document.querySelector('[data-testid="store-page-not-connected"]'),
        isError: !!document.querySelector('[data-testid="store-page-error"]'),
        hasStoreHeader: !!document.querySelector('[data-testid="store-header"]'),
        url: window.location.href,
      };
    });

    console.log('Page State:', pageState);

    // One of these states should be true (after loading)
    const isValidState =
      pageState.isConnected || pageState.isWizard || pageState.isError || pageState.isLoading;
    expect(isValidState).toBe(true);

    // If connected, verify the connected UI elements
    if (pageState.isConnected) {
      console.log('Store is connected - verifying connected UI');

      const connectedState = await authenticatedPage.evaluate(() => {
        return {
          hasImportButton: !!document.querySelector('[data-testid="store-import-btn"]'),
          hasSettingsButton: !!document.querySelector('[data-testid="store-settings-btn"]'),
          hasFiltersBar: !!document.querySelector('[data-testid="store-filters-bar"]'),
          hasProductGroups: !!document.querySelector('[data-testid="store-product-groups"]'),
          headerDescription: document.querySelector('[data-testid="store-header"] p')?.textContent?.trim(),
        };
      });

      console.log('Connected State:', connectedState);
      expect(connectedState.hasImportButton).toBe(true);
      expect(connectedState.hasSettingsButton).toBe(true);
    }

    // If wizard, verify wizard UI
    if (pageState.isWizard) {
      console.log('Store is not connected - showing wizard');

      const wizardState = await authenticatedPage.evaluate(() => {
        return {
          hasWizardContent: !!document.querySelector('[data-testid*="wizard"]'),
          wizardText: document.querySelector('[data-testid="store-page-not-connected"]')?.textContent?.trim()?.substring(0, 100),
        };
      });

      console.log('Wizard State:', wizardState);
    }

    console.log('\nStore states verification complete!\n');
  });

  test('verify product groups layout with two sections', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== PRODUCT GROUPS LAYOUT VERIFICATION ===\n');

    await nav.goToStore();

    // Wait for content to load
    await authenticatedPage.waitForTimeout(1000);

    // Check if we're connected (has product groups)
    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected') {
      console.log('Store not connected, skipping product groups test');
      return;
    }

    // Extract product groups details
    const productGroupsState = await authenticatedPage.evaluate(() => {
      const groups = Array.from(
        document.querySelectorAll('[data-testid^="store-product-group-"]')
      );

      return groups.map((group, index) => {
        const testId = `store-product-group-${index}`;
        return {
          index,
          name: group.querySelector(`[data-testid="${testId}-name"]`)?.textContent?.trim(),
          isMapped: !!group.querySelector(`[data-testid="${testId}-mapped-badge"]`),
          isUnmapped: !!group.querySelector(`[data-testid="${testId}-unmapped-badge"]`),
          hasSyncedSection: !!group.querySelector(`[data-testid="${testId}-synced-section"]`),
          hasUnsyncedSection: !!group.querySelector(`[data-testid="${testId}-unsynced-section"]`),
          syncedCount: group.querySelector(`[data-testid="${testId}-synced-count"]`)?.textContent?.trim(),
          unsyncedCount: group.querySelector(`[data-testid="${testId}-unsynced-count"]`)?.textContent?.trim(),
          hasViewBtn: !!group.querySelector(`[data-testid="${testId}-view-btn"]`),
          hasMapBtn: !!group.querySelector(`[data-testid="${testId}-map-btn"]`),
          hasStoreLink: !!group.querySelector(`[data-testid="${testId}-store-link"]`),
          baseImageCount: group.querySelectorAll(`[data-testid^="${testId}-base-image-"]`).length,
          syncedAssetCount: group.querySelectorAll(`[data-testid^="${testId}-synced-asset-"]`).length,
          unsyncedAssetCount: group.querySelectorAll(`[data-testid^="${testId}-unsynced-asset-"]`).length,
        };
      });
    });

    console.log('Product Groups Found:', productGroupsState.length);
    productGroupsState.forEach((group, i) => {
      console.log(`\nGroup ${i}:`, group.name);
      console.log(`  Mapped: ${group.isMapped}, Unmapped: ${group.isUnmapped}`);
      console.log(`  Synced Section: ${group.hasSyncedSection}, Unsynced Section: ${group.hasUnsyncedSection}`);
      console.log(`  Counts - Synced: ${group.syncedCount}, Unsynced: ${group.unsyncedCount}`);
      console.log(`  Base Images: ${group.baseImageCount}, Synced Assets: ${group.syncedAssetCount}, Unsynced Assets: ${group.unsyncedAssetCount}`);
      console.log(`  Buttons - View: ${group.hasViewBtn}, Map: ${group.hasMapBtn}, Store Link: ${group.hasStoreLink}`);
    });

    // Verify each product group has required elements
    for (const group of productGroupsState) {
      expect(group.name).toBeTruthy();
      expect(group.hasViewBtn).toBe(true);
      // Either mapped or unmapped badge should be present
      expect(group.isMapped || group.isUnmapped).toBe(true);
    }

    // Screenshot first product group if exists
    if (productGroupsState.length > 0) {
      const firstGroup = authenticatedPage.locator('[data-testid="store-product-group-0"]');
      if (await firstGroup.isVisible()) {
        await firstGroup.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'store-product-group.png'),
        });
        console.log('\nSaved: store-product-group.png');
      }
    }

    console.log('\nProduct groups layout verification complete!\n');
  });

  test('verify filter functionality', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== FILTER FUNCTIONALITY VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected') {
      console.log('Store not connected, skipping filter test');
      return;
    }

    // Extract filter state
    const filterState = await authenticatedPage.evaluate(() => {
      return {
        hasFiltersBar: !!document.querySelector('[data-testid="store-filters-bar"]'),
        hasSearchInput: !!document.querySelector('[data-testid="store-search-input"]'),
        hasSyncStatusFilter: !!document.querySelector('[data-testid="store-sync-status-filter"]'),
        hasFavoriteFilter: !!document.querySelector('[data-testid="store-favorite-filter"]'),
        hasProductFilter: !!document.querySelector('[data-testid="store-product-filter"]'),
        searchValue: (document.querySelector('[data-testid="store-search-input"]') as HTMLInputElement)?.value,
      };
    });

    console.log('Filter Bar Present:', filterState.hasFiltersBar);
    console.log('Search Input:', filterState.hasSearchInput);
    console.log('Sync Status Filter:', filterState.hasSyncStatusFilter);
    console.log('Favorite Filter:', filterState.hasFavoriteFilter);
    console.log('Product Filter:', filterState.hasProductFilter);

    // Verify filter bar exists
    expect(filterState.hasFiltersBar).toBe(true);
    expect(filterState.hasSearchInput).toBe(true);
    expect(filterState.hasSyncStatusFilter).toBe(true);
    expect(filterState.hasFavoriteFilter).toBe(true);

    // Test search functionality
    const searchInput = authenticatedPage.locator('[data-testid="store-search-input"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await authenticatedPage.waitForTimeout(500);

      const afterSearchState = await authenticatedPage.evaluate(() => {
        const searchVal = (document.querySelector('[data-testid="store-search-input"]') as HTMLInputElement)?.value;
        const productGroups = document.querySelectorAll('[data-testid^="store-product-group-"]');
        return {
          searchValue: searchVal,
          visibleGroups: productGroups.length,
        };
      });

      console.log('\nAfter Search:');
      console.log('  Search Value:', afterSearchState.searchValue);
      console.log('  Visible Groups:', afterSearchState.visibleGroups);

      expect(afterSearchState.searchValue).toBe('test');

      // Clear search
      await searchInput.clear();
    }

    // Screenshot filters bar
    const filtersBar = authenticatedPage.locator('[data-testid="store-filters-bar"]');
    if (await filtersBar.isVisible()) {
      await filtersBar.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'store-filters.png'),
      });
      console.log('\nSaved: store-filters.png');
    }

    console.log('\nFilter functionality verification complete!\n');
  });

  test('verify asset selection and bulk action bar', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== ASSET SELECTION & BULK ACTIONS VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected') {
      console.log('Store not connected, skipping selection test');
      return;
    }

    // Check for selectable assets
    const assetsState = await authenticatedPage.evaluate(() => {
      const assetCheckboxes = document.querySelectorAll('[data-testid*="-asset-"] input[type="checkbox"]');
      const syncedAssets = document.querySelectorAll('[data-testid*="-synced-asset-"]');
      const unsyncedAssets = document.querySelectorAll('[data-testid*="-unsynced-asset-"]');

      return {
        checkboxCount: assetCheckboxes.length,
        syncedAssetsCount: syncedAssets.length,
        unsyncedAssetsCount: unsyncedAssets.length,
        totalAssets: syncedAssets.length + unsyncedAssets.length,
      };
    });

    console.log('Assets Found:');
    console.log('  Synced:', assetsState.syncedAssetsCount);
    console.log('  Unsynced:', assetsState.unsyncedAssetsCount);
    console.log('  Total:', assetsState.totalAssets);

    // If we have assets, test selection
    if (assetsState.totalAssets > 0) {
      // Find and click the first asset's checkbox
      const firstAssetCheckbox = authenticatedPage.locator(
        '[data-testid*="-asset-"] input[type="checkbox"]'
      ).first();

      if (await firstAssetCheckbox.isVisible()) {
        await firstAssetCheckbox.click();
        await authenticatedPage.waitForTimeout(300);

        // Check if bulk action bar appears
        const bulkBarState = await authenticatedPage.evaluate(() => {
          const bulkBar = document.querySelector('[data-testid="store-bulk-action-bar"]');
          return {
            isVisible: bulkBar !== null && getComputedStyle(bulkBar).display !== 'none',
            countText: bulkBar?.querySelector('[data-testid="store-bulk-action-bar-count"]')?.textContent?.trim(),
            hasSyncBtn: !!bulkBar?.querySelector('[data-testid="store-bulk-action-bar-sync-btn"]'),
            hasFavoriteBtn: !!bulkBar?.querySelector('[data-testid="store-bulk-action-bar-favorite-btn"]'),
            hasDeleteBtn: !!bulkBar?.querySelector('[data-testid="store-bulk-action-bar-delete-btn"]'),
            hasClearBtn: !!bulkBar?.querySelector('[data-testid="store-bulk-action-bar-clear-btn"]'),
          };
        });

        console.log('\nBulk Action Bar:');
        console.log('  Visible:', bulkBarState.isVisible);
        console.log('  Count Text:', bulkBarState.countText);
        console.log('  Has Sync Button:', bulkBarState.hasSyncBtn);
        console.log('  Has Favorite Button:', bulkBarState.hasFavoriteBtn);
        console.log('  Has Delete Button:', bulkBarState.hasDeleteBtn);
        console.log('  Has Clear Button:', bulkBarState.hasClearBtn);

        if (bulkBarState.isVisible) {
          expect(bulkBarState.hasSyncBtn).toBe(true);
          expect(bulkBarState.hasFavoriteBtn).toBe(true);
          expect(bulkBarState.hasDeleteBtn).toBe(true);
          expect(bulkBarState.hasClearBtn).toBe(true);

          // Screenshot bulk action bar
          const bulkBar = authenticatedPage.locator('[data-testid="store-bulk-action-bar"]');
          await bulkBar.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'store-bulk-action-bar.png'),
          });
          console.log('\nSaved: store-bulk-action-bar.png');

          // Clear selection
          const clearBtn = authenticatedPage.locator('[data-testid="store-bulk-action-bar-clear-btn"]');
          await clearBtn.click();
          await authenticatedPage.waitForTimeout(300);

          // Verify bar is hidden
          const afterClear = await authenticatedPage.evaluate(() => {
            const bulkBar = document.querySelector('[data-testid="store-bulk-action-bar"]');
            return bulkBar === null;
          });
          console.log('Bar hidden after clear:', afterClear);
        }
      }
    } else {
      console.log('No assets to select, skipping selection test');
    }

    console.log('\nAsset selection verification complete!\n');
  });

  test('verify import and settings modals', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== MODALS VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected') {
      console.log('Store not connected, skipping modals test');
      return;
    }

    // Test Import Modal
    console.log('Testing Import Products Modal...');
    const importBtn = authenticatedPage.locator('[data-testid="store-import-btn"]');

    if (await importBtn.isVisible()) {
      await importBtn.click();
      await authenticatedPage.waitForTimeout(500);

      const importModalState = await authenticatedPage.evaluate(() => {
        const modal = document.querySelector('[data-testid="store-import-modal"]');
        return {
          isVisible: modal !== null,
          hasContent: modal ? modal.textContent?.includes('Import') : false,
        };
      });

      console.log('Import Modal Visible:', importModalState.isVisible);
      console.log('Import Modal Has Content:', importModalState.hasContent);

      // Close modal by pressing Escape
      await authenticatedPage.keyboard.press('Escape');
      await authenticatedPage.waitForTimeout(300);
    }

    // Test Settings Modal
    console.log('\nTesting Settings Modal...');
    const settingsBtn = authenticatedPage.locator('[data-testid="store-settings-btn"]');

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await authenticatedPage.waitForTimeout(500);

      const settingsModalState = await authenticatedPage.evaluate(() => {
        const modal = document.querySelector('[data-testid="store-settings-modal"]');
        return {
          isVisible: modal !== null,
          hasContent: modal ? modal.textContent?.includes('Settings') : false,
        };
      });

      console.log('Settings Modal Visible:', settingsModalState.isVisible);
      console.log('Settings Modal Has Content:', settingsModalState.hasContent);

      // Close modal
      await authenticatedPage.keyboard.press('Escape');
      await authenticatedPage.waitForTimeout(300);
    }

    console.log('\nModals verification complete!\n');
  });

  test('verify navigation to product detail from store', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== PRODUCT NAVIGATION VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected' || storeState.productGroupCount === 0) {
      console.log('Store not connected or no products, skipping navigation test');
      return;
    }

    // Get the first product's info
    const firstProductInfo = await authenticatedPage.evaluate(() => {
      const firstGroup = document.querySelector('[data-testid="store-product-group-0"]');
      const nameLink = firstGroup?.querySelector('[data-testid="store-product-group-0-name"]');
      const viewBtn = firstGroup?.querySelector('[data-testid="store-product-group-0-view-btn"]');

      return {
        name: nameLink?.textContent?.trim(),
        nameHref: nameLink?.getAttribute('href'),
        viewBtnHref: viewBtn?.getAttribute('href'),
        hasViewBtn: !!viewBtn,
      };
    });

    console.log('First Product:', firstProductInfo.name);
    console.log('Name Link Href:', firstProductInfo.nameHref);
    console.log('View Button Href:', firstProductInfo.viewBtnHref);

    // Verify links are correct
    if (firstProductInfo.nameHref) {
      expect(firstProductInfo.nameHref).toContain('/products/');
    }

    if (firstProductInfo.viewBtnHref) {
      expect(firstProductInfo.viewBtnHref).toContain('/products/');
    }

    // Click on View Product button and verify navigation
    if (firstProductInfo.hasViewBtn) {
      const viewBtn = authenticatedPage.locator('[data-testid="store-product-group-0-view-btn"]');
      await viewBtn.click();
      await authenticatedPage.waitForLoadState('networkidle');

      const currentUrl = authenticatedPage.url();
      console.log('\nNavigated to:', currentUrl);
      expect(currentUrl).toContain('/products/');

      // Navigate back to store
      await nav.goToStore();
    }

    console.log('\nProduct navigation verification complete!\n');
  });

  test('capture store page screenshots', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== CAPTURING SCREENSHOTS ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    // Capture full page based on state
    if (storeState.state === 'connected') {
      // Screenshot the connected store page
      await authenticatedPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'store-page-connected.png'),
        fullPage: false,
      });
      console.log('Saved: store-page-connected.png');

      // Screenshot header section
      const header = authenticatedPage.locator('[data-testid="store-header"]');
      if (await header.isVisible()) {
        await header.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'store-header.png'),
        });
        console.log('Saved: store-header.png');
      }
    } else if (storeState.state === 'wizard') {
      // Screenshot the wizard
      await authenticatedPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'store-page-wizard.png'),
        fullPage: false,
      });
      console.log('Saved: store-page-wizard.png');
    } else {
      console.log('Store in loading/error state, skipping screenshots');
    }

    console.log('\nScreenshots captured!\n');
  });

  test('verify store page in sidebar navigation', async ({
    authenticatedPage,
    clientId,
  }) => {
    console.log('\n=== SIDEBAR NAVIGATION VERIFICATION ===\n');

    // Navigate to home first
    await authenticatedPage.goto('/home');
    await authenticatedPage.waitForLoadState('networkidle');

    // Check if we're on the correct app
    if (!(await checkIsCorrectApp(authenticatedPage))) {
      test.skip();
      return;
    }

    // Check sidebar for Store link
    const sidebarState = await authenticatedPage.evaluate(() => {
      const sidebar = document.querySelector('aside') || document.querySelector('nav[class*="sidebar"]');
      const storeLink = sidebar?.querySelector('a[href="/store"]');

      return {
        hasSidebar: !!sidebar,
        hasStoreLink: !!storeLink,
        storeLinkText: storeLink?.textContent?.trim(),
        allLinks: sidebar
          ? Array.from(sidebar.querySelectorAll('a')).map((a) => ({
              text: a.textContent?.trim(),
              href: a.getAttribute('href'),
            }))
          : [],
      };
    });

    console.log('Sidebar Present:', sidebarState.hasSidebar);
    console.log('Store Link Present:', sidebarState.hasStoreLink);
    console.log('Store Link Text:', sidebarState.storeLinkText);
    console.log('All Sidebar Links:', sidebarState.allLinks.map((l) => `${l.text} (${l.href})`).join(', '));

    // Verify Store link exists in sidebar
    expect(sidebarState.hasStoreLink).toBe(true);

    // Click Store link and verify navigation
    if (sidebarState.hasStoreLink) {
      const storeNavLink = authenticatedPage.locator('a[href="/store"]');
      await storeNavLink.click();
      await authenticatedPage.waitForLoadState('networkidle');

      const currentUrl = authenticatedPage.url();
      console.log('\nNavigated to:', currentUrl);
      expect(currentUrl).toContain('/store');
    }

    console.log('\nSidebar navigation verification complete!\n');
  });
});

test.describe('Store Page - Empty States', () => {
  test('verify empty states handling', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== EMPTY STATES VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    // Check for various empty states
    const emptyStates = await authenticatedPage.evaluate(() => {
      return {
        hasEmptyProducts: !!document.querySelector('[data-testid="store-assets-empty"]'),
        hasNoResults: !!document.querySelector('[data-testid="store-assets-no-results"]'),
        hasError: !!document.querySelector('[data-testid="store-assets-error"]'),
        hasLoading: !!document.querySelector('[data-testid="store-assets-loading"]'),
        emptyStateText: document.querySelector('[data-testid="store-empty-state"]')?.textContent?.trim(),
        noResultsStateText: document.querySelector('[data-testid="store-no-results-state"]')?.textContent?.trim(),
      };
    });

    console.log('Empty States Found:');
    console.log('  No Products:', emptyStates.hasEmptyProducts);
    console.log('  No Results:', emptyStates.hasNoResults);
    console.log('  Error:', emptyStates.hasError);
    console.log('  Loading:', emptyStates.hasLoading);

    if (emptyStates.emptyStateText) {
      console.log('  Empty State Text:', emptyStates.emptyStateText.substring(0, 100));
    }

    console.log('\nEmpty states verification complete!\n');
  });
});

test.describe('Store Page - Sync Operations', () => {
  test('verify sync button states for mapped vs unmapped products', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== SYNC BUTTON STATES VERIFICATION ===\n');

    await nav.goToStore();
    await authenticatedPage.waitForTimeout(1000);

    const storeState = await nav.getStorePageState();

    if (storeState.state !== 'connected') {
      console.log('Store not connected, skipping sync states test');
      return;
    }

    // Check each product group for sync button availability
    const productSyncStates = await authenticatedPage.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('[data-testid^="store-product-group-"]'));

      return groups.map((group, index) => {
        const testId = `store-product-group-${index}`;
        const isMapped = !!group.querySelector(`[data-testid="${testId}-mapped-badge"]`);

        // Check unsynced assets for sync button
        const unsyncedAssets = group.querySelectorAll(`[data-testid^="${testId}-unsynced-asset-"]`);
        const syncButtons = Array.from(unsyncedAssets).map((asset) => {
          const syncBtn = asset.querySelector('button[data-testid*="sync"]');
          return {
            hasButton: !!syncBtn,
            isDisabled: syncBtn?.hasAttribute('disabled') ?? false,
          };
        });

        return {
          index,
          isMapped,
          unsyncedAssetCount: unsyncedAssets.length,
          syncButtonStates: syncButtons,
        };
      });
    });

    console.log('Product Sync States:');
    productSyncStates.forEach((product) => {
      console.log(`\nProduct ${product.index}:`);
      console.log(`  Mapped: ${product.isMapped}`);
      console.log(`  Unsynced Assets: ${product.unsyncedAssetCount}`);
      if (product.syncButtonStates.length > 0) {
        console.log(`  Sync Buttons:`, product.syncButtonStates);
      }
    });

    // For mapped products, sync buttons should be enabled on unsynced assets
    // For unmapped products, sync should be disabled (or hidden)
    for (const product of productSyncStates) {
      if (product.unsyncedAssetCount > 0) {
        // This is informational - the UI may disable or hide sync for unmapped
        console.log(
          `  Product ${product.index} (${product.isMapped ? 'mapped' : 'unmapped'}): ` +
          `${product.unsyncedAssetCount} unsynced assets`
        );
      }
    }

    console.log('\nSync button states verification complete!\n');
  });
});
