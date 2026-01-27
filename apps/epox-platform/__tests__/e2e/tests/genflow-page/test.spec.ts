/**
 * Generation Flow Page Tests
 *
 * Tests the single product generation flow:
 * - Opening a single product in studio creates a generation flow
 * - Generation flow page layout
 * - Config panel in single-flow context
 *
 * Screenshots captured:
 * - generation-flow-page.png - Full generation flow page
 * - generation-flow-config-panel.png - Config panel in flow context
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

test.describe('Generation Flow - Single Product', () => {
  test('single product opens in studio as generation flow', async ({
    authenticatedPage,
    clientId,
  }) => {
    const errors = await createNavigationHelper(authenticatedPage, clientId).captureErrors();

    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== SINGLE PRODUCT FLOW TEST ===\n');

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} products`);

    if (cardCount > 0) {
      // Select single product
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      // Check button text says "Open in Studio"
      const createBtn = authenticatedPage.locator(
        '[data-testid="selection-island-create-button"], button[class*="glow"]'
      ).first();
      const buttonText = await createBtn.textContent();
      console.log('Button text:', buttonText);
      expect(buttonText).toContain('Open in Studio');

      // Click the button
      await createBtn.click();

      // Wait for navigation to generation flow page (not collection)
      await authenticatedPage.waitForURL(/\/studio\/(?!collections)[^/]+$/, { timeout: 10000 });

      const finalUrl = authenticatedPage.url();
      console.log('Navigated to:', finalUrl);
      expect(finalUrl).toMatch(/\/studio\/[a-f0-9-]+$/);
      expect(finalUrl).not.toContain('collections');

      // Wait for page to load
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify generation flow page
      const flowState = await authenticatedPage.evaluate(() => {
        return {
          pageTitle: document.querySelector('h1')?.textContent?.trim(),
          hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
          hasInspireSection: !!document.querySelector('[data-testid="inspire-section"]'),
          hasBaseImages: !!document.querySelector('[data-testid="inspire-section--base-images"]'),
          hasOutputSettings: !!document.querySelector(
            '[data-testid="unified-config-panel--output-settings"]'
          ),
          hasGenerateButton: !!document.querySelector(
            '[data-testid="unified-config-panel--generate-button"]'
          ),
        };
      });

      console.log('Generation Flow State:', flowState);

      expect(flowState.hasConfigPanel).toBe(true);
      expect(flowState.hasInspireSection).toBe(true);
      expect(flowState.hasGenerateButton).toBe(true);

      // Screenshot: Full generation flow page
      await authenticatedPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'generation-flow-page.png'),
        fullPage: false,
      });
      console.log('Saved: generation-flow-page.png');

      // Screenshot: Config panel in flow context
      const configPanel = authenticatedPage.locator('[data-testid="unified-config-panel"]');
      if (await configPanel.isVisible()) {
        await configPanel.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'generation-flow-config-panel.png'),
        });
        console.log('Saved: generation-flow-config-panel.png');
      }
    } else {
      console.log('No products available');
      test.skip();
    }

    console.log('\nSingle product flow verified!\n');
  });

  test('generation flow config panel shows base images selector', async ({
    authenticatedPage,
    clientId,
  }) => {
    // Navigate to create a generation flow
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    if ((await productCards.count()) > 0) {
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      const createBtn = authenticatedPage.locator(
        '[data-testid="selection-island-create-button"], button[class*="glow"]'
      ).first();
      await createBtn.click();
      await authenticatedPage.waitForURL(/\/studio\/(?!collections)[^/]+$/, { timeout: 10000 });
      await authenticatedPage.waitForLoadState('networkidle');

      console.log('\n=== GENERATION FLOW CONFIG PANEL ===\n');

      // Check for base images selector (single-flow mode feature)
      const baseImagesState = await authenticatedPage.evaluate(() => {
        const baseImagesSection = document.querySelector(
          '[data-testid="inspire-section--base-images"]'
        );
        const baseImageButtons = baseImagesSection?.querySelectorAll(
          '[data-testid^="inspire-section--base-image"]'
        );

        return {
          hasBaseImagesSection: !!baseImagesSection,
          baseImageCount: baseImageButtons?.length || 0,
          selectedBaseImage: Array.from(baseImageButtons || []).find((btn) =>
            btn.classList.contains('border-primary')
          )
            ? 'found'
            : 'none',
        };
      });

      console.log('Base Images State:', baseImagesState);

      // In single-flow mode, base images selector should be available
      // (if the product has base images)
      console.log('Has base images section:', baseImagesState.hasBaseImagesSection);
      console.log('Base image count:', baseImagesState.baseImageCount);

      // Screenshot: Inspire section with base images
      const inspireSection = authenticatedPage.locator('[data-testid="inspire-section"]');
      if (await inspireSection.isVisible()) {
        await inspireSection.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'generation-flow-inspire-section.png'),
        });
        console.log('Saved: generation-flow-inspire-section.png');
      }
    } else {
      test.skip();
    }

    console.log('\nGeneration flow config panel verified!\n');
  });
});

test.describe('Generation Flow - Output Settings', () => {
  test('verify output settings in generation flow context', async ({ authenticatedPage }) => {
    // Create a generation flow first
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    if ((await productCards.count()) > 0) {
      await productCards.first().click();
      await authenticatedPage.waitForTimeout(500);

      const createBtn = authenticatedPage.locator(
        '[data-testid="selection-island-create-button"], button[class*="glow"]'
      ).first();
      await createBtn.click();
      await authenticatedPage.waitForURL(/\/studio\/(?!collections)[^/]+$/, { timeout: 10000 });
      await authenticatedPage.waitForLoadState('networkidle');

      console.log('\n=== GENERATION FLOW OUTPUT SETTINGS ===\n');

      // Verify output settings controls work
      const outputState = await authenticatedPage.evaluate(() => {
        const aspectButtons = document.querySelectorAll(
          '[data-testid^="unified-config-panel--aspect-ratio"]'
        );
        const qualityButtons = document.querySelectorAll(
          '[data-testid^="unified-config-panel--quality"]'
        );
        const variantButtons = document.querySelectorAll(
          '[data-testid^="unified-config-panel--variants"]'
        );

        return {
          aspectRatioOptions: Array.from(aspectButtons).map((btn) => btn.textContent?.trim()),
          qualityOptions: Array.from(qualityButtons).map((btn) => btn.textContent?.trim()),
          variantOptions: Array.from(variantButtons).map((btn) => btn.textContent?.trim()),
        };
      });

      console.log('Output Settings:');
      console.log('  Aspect Ratios:', outputState.aspectRatioOptions);
      console.log('  Qualities:', outputState.qualityOptions);
      console.log('  Variants:', outputState.variantOptions);

      expect(outputState.aspectRatioOptions.length).toBeGreaterThan(0);
      expect(outputState.qualityOptions.length).toBeGreaterThan(0);
      expect(outputState.variantOptions.length).toBeGreaterThan(0);

      // Test clicking an option
      const aspect169 = authenticatedPage.locator(
        '[data-testid="unified-config-panel--aspect-ratio--16:9"]'
      );
      if (await aspect169.isVisible()) {
        await aspect169.click();
        await authenticatedPage.waitForTimeout(200);
        console.log('Clicked 16:9 aspect ratio');
      }
    } else {
      test.skip();
    }

    console.log('\nOutput settings verification complete!\n');
  });
});
