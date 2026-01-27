import type { Page } from '@playwright/test';

/**
 * Navigation helpers for common user flows in the epox-platform application
 * These utilities help reduce token usage by providing text-based navigation
 * instead of relying on screenshots and visual inspection
 */

export class NavigationHelper {
  constructor(
    private page: Page,
    private clientId: string
  ) {}

  /**
   * Navigate to the dashboard
   */
  async goToHome() {
    await this.page.goto('/home');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to products page
   */
  async goToProducts() {
    await this.page.goto('/products');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific product page
   * @param productId - The product ID
   */
  async goToProduct(productId: string) {
    await this.page.goto(`/products/${productId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to collections page
   */
  async goToCollections() {
    await this.page.goto('/collections');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific collection page
   * @param collectionId - The collection ID
   */
  async goToCollection(collectionId: string) {
    await this.page.goto(`/collections/${collectionId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to new collection page
   */
  async goToNewCollection() {
    await this.page.goto('/collections/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to studio page
   */
  async goToStudio() {
    await this.page.goto('/studio');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific studio session
   * @param studioId - The studio session ID
   */
  async goToStudioSession(studioId: string) {
    await this.page.goto(`/studio/${studioId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a collection studio
   * @param collectionId - The collection ID
   */
  async goToCollectionStudio(collectionId: string) {
    await this.page.goto(`/studio/collections/${collectionId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to assets page
   */
  async goToAssets() {
    await this.page.goto('/assets');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to settings page
   */
  async goToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to store page
   */
  async goToStore() {
    await this.page.goto('/store');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get store page state (text-only, efficient)
   */
  async getStorePageState() {
    return await this.page.evaluate(() => {
      // Check if connection wizard is shown
      const wizardVisible = !!document.querySelector('[data-testid="store-page-not-connected"]');
      const connectedVisible = !!document.querySelector('[data-testid="store-page-connected"]');
      const loadingVisible = !!document.querySelector('[data-testid="store-page-loading"]');
      const errorVisible = !!document.querySelector('[data-testid="store-page-error"]');

      // Get product groups if connected
      const productGroups = Array.from(
        document.querySelectorAll('[data-testid^="store-product-group-"]')
      ).map((group) => {
        const header = group.querySelector('[data-testid$="-header"]');
        const name = group.querySelector('[data-testid$="-name"]')?.textContent?.trim();
        const isMapped = !!group.querySelector('[data-testid$="-mapped-badge"]');
        const syncedCount = group
          .querySelector('[data-testid$="-synced-count"]')
          ?.textContent?.trim();
        const unsyncedCount = group
          .querySelector('[data-testid$="-unsynced-count"]')
          ?.textContent?.trim();

        // Count images in each section
        const syncedSection = group.querySelector('[data-testid$="-synced-section"]');
        const unsyncedSection = group.querySelector('[data-testid$="-unsynced-section"]');
        const baseImageCount = group.querySelectorAll('[data-testid*="-base-image-"]').length;
        const syncedAssetCount = group.querySelectorAll('[data-testid*="-synced-asset-"]').length;
        const unsyncedAssetCount = group.querySelectorAll(
          '[data-testid*="-unsynced-asset-"]'
        ).length;

        return {
          name,
          isMapped,
          syncedCount,
          unsyncedCount,
          baseImageCount,
          syncedAssetCount,
          unsyncedAssetCount,
          hasSyncedSection: !!syncedSection,
          hasUnsyncedSection: !!unsyncedSection,
        };
      });

      // Get filter state
      const searchInput = document.querySelector(
        '[data-testid="store-search-input"]'
      ) as HTMLInputElement | null;
      const syncStatusFilter = document
        .querySelector('[data-testid="store-sync-status-filter"]')
        ?.textContent?.trim();

      // Get bulk action bar
      const bulkActionBar = document.querySelector('[data-testid="store-bulk-action-bar"]');
      const selectedCount = bulkActionBar
        ?.querySelector('[data-testid*="selected-count"]')
        ?.textContent?.trim();

      // Get header info
      const headerTitle = document
        .querySelector('[data-testid="store-header"] h1')
        ?.textContent?.trim();
      const headerDescription = document
        .querySelector('[data-testid="store-header"] p')
        ?.textContent?.trim();

      return {
        state: wizardVisible
          ? 'wizard'
          : connectedVisible
            ? 'connected'
            : loadingVisible
              ? 'loading'
              : errorVisible
                ? 'error'
                : 'unknown',
        headerTitle,
        headerDescription,
        productGroups,
        productGroupCount: productGroups.length,
        filters: {
          searchValue: searchInput?.value,
          syncStatusFilter,
        },
        bulkSelection: {
          isVisible: !!bulkActionBar && getComputedStyle(bulkActionBar).display !== 'none',
          selectedCount,
        },
        hasImportButton: !!document.querySelector('[data-testid="store-import-btn"]'),
        hasSettingsButton: !!document.querySelector('[data-testid="store-settings-btn"]'),
      };
    });
  }

  /**
   * Check if a specific panel/section exists on the page
   * Returns text-based data instead of screenshot
   * @param selector - CSS selector for the panel
   */
  async checkPanelExists(selector: string): Promise<{ exists: boolean; text?: string }> {
    const exists = await this.page
      .locator(selector)
      .isVisible()
      .catch(() => false);

    if (!exists) {
      return { exists: false };
    }

    const text = await this.page
      .locator(selector)
      .innerText()
      .catch(() => undefined);
    return { exists: true, text };
  }

  /**
   * Get DOM state of config panel (text-only, no screenshot)
   * @param panelSelector - Selector for the config panel
   */
  async getConfigPanelState(panelSelector: string = '[data-testid="config-panel"]') {
    const exists = await this.page
      .locator(panelSelector)
      .isVisible()
      .catch(() => false);

    if (!exists) {
      return { exists: false };
    }

    // Extract text-based state
    const state = await this.page.evaluate((selector) => {
      const panel = document.querySelector(selector);
      if (!panel) return null;

      // Get all form inputs
      const inputs = Array.from(panel.querySelectorAll('input, select, textarea'));
      const inputStates = inputs.map((input) => ({
        type: input.tagName.toLowerCase(),
        name: input.getAttribute('name') || input.getAttribute('id'),
        value: (input as HTMLInputElement).value,
        checked: (input as HTMLInputElement).checked,
        disabled: (input as HTMLInputElement).disabled,
      }));

      // Get all headings/labels
      const labels = Array.from(panel.querySelectorAll('label, h1, h2, h3, h4, h5, h6')).map((el) =>
        el.textContent?.trim()
      );

      return {
        panelText: panel.textContent?.trim(),
        inputs: inputStates,
        labels,
        classList: Array.from(panel.classList),
      };
    }, panelSelector);

    return { exists: true, state };
  }

  /**
   * Get generation flow list view state (text-only)
   * @param listSelector - Selector for the flow list
   */
  async getGenFlowListState(listSelector: string = '[data-testid="generation-flow-list"]') {
    const exists = await this.page
      .locator(listSelector)
      .isVisible()
      .catch(() => false);

    if (!exists) {
      return { exists: false };
    }

    const state = await this.page.evaluate((selector) => {
      const list = document.querySelector(selector);
      if (!list) return null;

      // Get all flow items
      const flowItems = Array.from(list.querySelectorAll('[data-testid^="flow-item--"]'));
      const flows = flowItems.map((item) => ({
        id: item.getAttribute('data-flow-id'),
        name: item.querySelector('[data-testid$="--name"]')?.textContent?.trim(),
        status: item.querySelector('[data-testid$="--status"]')?.textContent?.trim(),
        productCount: item.querySelectorAll('[data-testid^="product-card--"]').length,
      }));

      return {
        totalFlows: flowItems.length,
        flows,
        emptyState: list
          .querySelector('[data-testid="generation-flow-empty"]')
          ?.textContent?.trim(),
      };
    }, listSelector);

    return { exists: true, state };
  }

  /**
   * Capture console errors and network failures (text-based)
   */
  async captureErrors(): Promise<{ consoleErrors: string[]; networkFailures: string[] }> {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    // Listen to console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen to network failures (exclude 304 Not Modified - cached responses)
    this.page.on('response', (response) => {
      const status = response.status();
      // Only count actual failures (>= 400), not 304 (cached) or other 3xx redirects
      if (status >= 400 && !response.url().includes('_next/static')) {
        networkFailures.push(`${status} ${response.url()}`);
      }
    });

    return { consoleErrors, networkFailures };
  }

  /**
   * Get page state summary (text-only, efficient)
   */
  async getPageStateSummary() {
    return await this.page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map((h) =>
          h.textContent?.trim()
        ),
        buttons: Array.from(document.querySelectorAll('button')).map((b) => ({
          text: b.textContent?.trim(),
          disabled: b.disabled,
          type: b.type,
        })),
        forms: Array.from(document.querySelectorAll('form')).map((f) => ({
          action: f.action,
          method: f.method,
          inputCount: f.querySelectorAll('input').length,
        })),
        errorMessages: Array.from(
          document.querySelectorAll('[role="alert"], .error, [data-error]')
        ).map((e) => e.textContent?.trim()),
      };
    });
  }

  /**
   * Wait for a specific element to appear with timeout
   * @param selector - CSS selector
   * @param timeout - Timeout in milliseconds
   */
  async waitForElement(selector: string, timeout: number = 5000) {
    try {
      await this.page.waitForSelector(selector, { timeout, state: 'visible' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click on an element by selector
   */
  async click(selector: string) {
    await this.page.click(selector);
  }

  /**
   * Fill a form field
   */
  async fill(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string | null> {
    return await this.page
      .locator(selector)
      .innerText()
      .catch(() => null);
  }
}

/**
 * Create a navigation helper for a page and client
 */
export function createNavigationHelper(page: Page, clientId: string): NavigationHelper {
  return new NavigationHelper(page, clientId);
}

/**
 * Common selectors used in the application
 */
export const SELECTORS = {
  // Config panel
  configPanel: '[data-testid="config-panel"]',
  configPanelHeading: '[data-testid="config-panel--heading"]',

  // Generation flows
  genFlowList: '[data-testid="generation-flow-list"]',
  genFlowItem: '[data-testid^="flow-item--"]',
  genFlowName: '[data-testid$="--name"]',
  genFlowStatus: '[data-testid$="--status"]',

  // Products
  productCard: '[data-testid^="product-card--"]',
  productName: '[data-testid$="--name"]',

  // Collections
  collectionCard: '[data-testid^="collection-card--"]',
  collectionName: '[data-testid$="--name"]',

  // Common
  userMenu: '[data-testid="app-shell--sidebar--user-menu"]',
  errorAlert: '[role="alert"]',
  loadingSpinner: '[data-testid*="loading"]',
} as const;

// Re-export helper utilities
export { hideNextDevOverlay } from './hide-next-dev-overlay';
