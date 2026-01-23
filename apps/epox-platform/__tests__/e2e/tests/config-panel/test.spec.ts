/**
 * Config Panel Tests
 *
 * Tests the UnifiedStudioConfigPanel component including:
 * - Panel structure and sections
 * - Output settings controls (aspect ratio, quality, variants)
 * - Inspire section with empty state and with products selected
 * - Inspiration bubble uploads
 * - Scene types section
 *
 * Screenshots captured:
 * - config-panel-full.png - Full panel
 * - config-panel-header.png - Header section
 * - config-panel-inspire-empty.png - Inspire section when no products selected
 * - config-panel-inspire-with-products.png - Inspire section when products are selected
 * - config-panel-inspire-with-image.png - Inspire section after uploading an image
 * - config-panel-scene-types.png - Scene types accordions
 * - config-panel-prompt-section.png - Prompt input area
 * - config-panel-output-settings.png - Output settings controls
 * - config-panel-footer.png - Footer with generate button
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

test.describe('Config Panel - Structure & Sections', () => {
  test('verify complete config panel structure and capture screenshots', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to studio
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    console.log('\n=== CONFIG PANEL STRUCTURE VERIFICATION ===\n');

    // ==========================================
    // PHASE 1: Console Errors & Network Check
    // ==========================================
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400 && !response.url().includes('_next/static')) {
        networkFailures.push(`${status} ${response.url()}`);
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('Console Errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);
    console.log('Network Failures:', networkFailures.length === 0 ? 'None' : networkFailures);

    expect(consoleErrors).toHaveLength(0);
    expect(networkFailures).toHaveLength(0);

    // ==========================================
    // PHASE 2: DOM State Extraction
    // ==========================================
    const domState = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="unified-config-panel"]');

      if (!panel) {
        return { panelFound: false };
      }

      return {
        panelFound: true,
        header: {
          exists: !!panel.querySelector('[data-testid="unified-config-panel--header"]'),
          text: panel
            .querySelector('[data-testid="unified-config-panel--header"]')
            ?.textContent?.trim(),
        },
        inspire: {
          exists: !!panel.querySelector('[data-testid="inspire-section"]'),
          hasEmptyState: !!panel.querySelector('[data-testid="inspire-section--empty"]'),
          emptyText: panel
            .querySelector('[data-testid="inspire-section--empty"]')
            ?.textContent?.trim(),
          sceneTypeCount: panel.querySelectorAll('[data-testid^="scene-type-accordion"]').length,
        },
        prompt: {
          exists: !!panel.querySelector('[data-testid="unified-config-panel--prompt-section"]'),
          hasTextarea: !!panel.querySelector(
            '[data-testid="unified-config-panel--user-prompt"] textarea'
          ),
        },
        outputSettings: {
          exists: !!panel.querySelector('[data-testid="unified-config-panel--output-settings"]'),
          aspectRatioCount: panel.querySelectorAll(
            '[data-testid^="unified-config-panel--aspect-ratio"]'
          ).length,
          qualityCount: panel.querySelectorAll('[data-testid^="unified-config-panel--quality"]')
            .length,
          variantCount: panel.querySelectorAll('[data-testid^="unified-config-panel--variants"]')
            .length,
        },
        footer: {
          exists: !!panel.querySelector('[data-testid="unified-config-panel--footer"]'),
          hasGenerateButton: !!panel.querySelector(
            '[data-testid="unified-config-panel--generate-button"]'
          ),
          generateButtonText: panel
            .querySelector('[data-testid="unified-config-panel--generate-button"]')
            ?.textContent?.trim(),
        },
        dimensions: {
          width: panel.getBoundingClientRect().width,
          height: panel.getBoundingClientRect().height,
        },
      };
    });

    console.log('\nConfig Panel Structure:');
    console.log(JSON.stringify(domState, null, 2));

    // Assertions
    expect(domState.panelFound).toBe(true);
    expect(domState.header?.exists).toBe(true);
    expect(domState.inspire?.exists).toBe(true);
    expect(domState.prompt?.exists).toBe(true);
    expect(domState.outputSettings?.exists).toBe(true);
    expect(domState.footer?.exists).toBe(true);
    expect(domState.outputSettings?.aspectRatioCount).toBeGreaterThan(0);
    expect(domState.outputSettings?.qualityCount).toBeGreaterThan(0);
    expect(domState.outputSettings?.variantCount).toBeGreaterThan(0);

    // ==========================================
    // PHASE 3: Screenshots - Empty State
    // ==========================================
    console.log('\n=== CAPTURING SCREENSHOTS ===\n');

    // Screenshot 1: Full config panel
    const configPanel = page.locator('[data-testid="unified-config-panel"]');
    await configPanel.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'config-panel-full.png'),
    });
    console.log('Saved: config-panel-full.png');

    // Screenshot 2: Header section
    const header = page.locator('[data-testid="unified-config-panel--header"]');
    if (await header.isVisible()) {
      await header.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-header.png'),
      });
      console.log('Saved: config-panel-header.png');
    }

    // Screenshot 3: Inspire section (empty state - no products selected)
    const inspire = page.locator('[data-testid="inspire-section"]');
    if (await inspire.isVisible()) {
      await inspire.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-inspire-empty.png'),
      });
      console.log('Saved: config-panel-inspire-empty.png');
    }

    // Screenshot 4: Prompt section
    const promptSection = page.locator('[data-testid="unified-config-panel--prompt-section"]');
    if (await promptSection.isVisible()) {
      await promptSection.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-prompt-section.png'),
      });
      console.log('Saved: config-panel-prompt-section.png');
    }

    // Screenshot 5: Output settings
    const outputSettings = page.locator('[data-testid="unified-config-panel--output-settings"]');
    if (await outputSettings.isVisible()) {
      await outputSettings.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-output-settings.png'),
      });
      console.log('Saved: config-panel-output-settings.png');
    }

    // Screenshot 6: Footer with generate button
    const footer = page.locator('[data-testid="unified-config-panel--footer"]');
    if (await footer.isVisible()) {
      await footer.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-footer.png'),
      });
      console.log('Saved: config-panel-footer.png');
    }

    console.log('\nConfig panel structure verification complete!\n');
  });
});

test.describe('Config Panel - Inspire Section with Products', () => {
  test('capture inspire section with products selected and scene types', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to studio
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    console.log('\n=== INSPIRE SECTION WITH PRODUCTS ===\n');

    // Wait for product grid to load
    const productGrid = page.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 10000 });

    // Select products using the product cards
    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} products`);

    if (cardCount > 0) {
      // Select first product
      await productCards.first().click();
      await page.waitForTimeout(500);

      // Check if scene types appeared in the inspire section
      const sceneTypesAfterSelect = await page.evaluate(() => {
        const panel = document.querySelector('[data-testid="unified-config-panel"]');
        const sceneTypes = panel?.querySelectorAll('[data-testid^="scene-type-accordion"]') || [];
        return {
          count: sceneTypes.length,
          names: Array.from(sceneTypes).map(
            (el) => el.getAttribute('data-scene-type') || el.textContent?.substring(0, 30)
          ),
        };
      });

      console.log('Scene types after selection:', sceneTypesAfterSelect);

      // Screenshot: Inspire section with products selected
      const inspireSection = page.locator('[data-testid="inspire-section"]');
      if (await inspireSection.isVisible()) {
        await inspireSection.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'config-panel-inspire-with-products.png'),
        });
        console.log('Saved: config-panel-inspire-with-products.png');
      }

      // Screenshot: Scene types section specifically
      const sceneTypesContainer = page.locator('[data-testid="inspire-section--scene-types"]');
      if (await sceneTypesContainer.isVisible()) {
        await sceneTypesContainer.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'config-panel-scene-types.png'),
        });
        console.log('Saved: config-panel-scene-types.png');
      }

      // Select another product if available for more scene type diversity
      if (cardCount > 1) {
        await productCards.nth(1).click();
        await page.waitForTimeout(500);

        // Take another screenshot with multiple products
        const inspireWithMultiple = page.locator('[data-testid="inspire-section"]');
        if (await inspireWithMultiple.isVisible()) {
          await inspireWithMultiple.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'config-panel-inspire-multiple-products.png'),
          });
          console.log('Saved: config-panel-inspire-multiple-products.png');
        }
      }
    }

    console.log('\nInspire section with products capture complete!\n');
  });

  test('capture inspire section after uploading inspiration image', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Navigate to studio
    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    console.log('\n=== INSPIRE SECTION WITH UPLOADED IMAGE ===\n');

    // Wait for product grid and select a product
    const productGrid = page.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 10000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();

    if (cardCount > 0) {
      // Select first product
      await productCards.first().click();
      await page.waitForTimeout(500);

      // Find an "Add" bubble button or empty bubble slot to click
      const addBubbleBtn = page.locator('[data-testid^="add-bubble-button"]').first();

      if (await addBubbleBtn.isVisible()) {
        // Click to add a bubble
        await addBubbleBtn.click();
        await page.waitForTimeout(300);

        // Look for inspiration option in the dropdown/menu
        const inspirationOption = page.locator(
          'button:has-text("Inspiration"), [data-testid*="inspiration"]'
        );
        if (await inspirationOption.first().isVisible()) {
          await inspirationOption.first().click();
          await page.waitForTimeout(300);
        }

        // Check if a modal opened for uploading
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          console.log('Upload modal opened');

          // Check for file input
          const fileInput = page.locator('input[type="file"]');
          if ((await fileInput.count()) > 0) {
            // Upload the test inspiration image
            const inspirationImagePath = path.join(
              __dirname,
              '../../assets/inspiration/room-inspiration-1.webp'
            );

            if (fs.existsSync(inspirationImagePath)) {
              await fileInput.setInputFiles(inspirationImagePath);
              await page.waitForTimeout(1000);
              console.log('Uploaded inspiration image');
            }
          }

          // Close modal if still open
          const closeBtn = modal.locator('button:has-text("Close"), button:has-text("Done")');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }

      // Screenshot: Inspire section after image upload attempt
      const inspireSection = page.locator('[data-testid="inspire-section"]');
      if (await inspireSection.isVisible()) {
        await inspireSection.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'config-panel-inspire-with-image.png'),
        });
        console.log('Saved: config-panel-inspire-with-image.png');
      }
    }

    console.log('\nInspire section with image capture complete!\n');
  });
});

test.describe('Config Panel - Output Settings Interaction', () => {
  test('verify aspect ratio, quality, and variant selection', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    console.log('\n=== OUTPUT SETTINGS INTERACTION ===\n');

    // Test aspect ratio selection
    const aspectRatio169 = page.locator('[data-testid="unified-config-panel--aspect-ratio--16:9"]');
    if (await aspectRatio169.isVisible()) {
      await aspectRatio169.click();
      await page.waitForTimeout(200);

      const isSelected = await page.evaluate(() => {
        const btn = document.querySelector(
          '[data-testid="unified-config-panel--aspect-ratio--16:9"]'
        );
        return btn?.classList.contains('bg-primary') || btn?.getAttribute('data-state') === 'on';
      });

      console.log('Aspect Ratio 16:9 Selection:', isSelected ? 'Selected' : 'Not selected');
    }

    // Test quality selection
    const quality4k = page.locator('[data-testid="unified-config-panel--quality--4k"]');
    if (await quality4k.isVisible()) {
      await quality4k.click();
      await page.waitForTimeout(200);
      console.log('Quality 4K clicked');
    }

    // Test variant selection
    const variant4 = page.locator('[data-testid="unified-config-panel--variants--4"]');
    if (await variant4.isVisible()) {
      await variant4.click();
      await page.waitForTimeout(200);
      console.log('Variants 4 clicked');
    }

    // Test prompt input
    const promptTextarea = page.locator(
      '[data-testid="unified-config-panel--user-prompt"] textarea'
    );
    if (await promptTextarea.isVisible()) {
      await promptTextarea.fill('A modern living room with natural lighting');
      await page.waitForTimeout(200);

      const value = await promptTextarea.inputValue();
      console.log('Prompt filled:', value.substring(0, 30) + '...');
      expect(value).toContain('modern living room');
    }

    // Screenshot output settings after interactions
    const outputSettings = page.locator('[data-testid="unified-config-panel--output-settings"]');
    if (await outputSettings.isVisible()) {
      await outputSettings.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'config-panel-output-settings-selected.png'),
      });
      console.log('Saved: config-panel-output-settings-selected.png');
    }

    console.log('\nOutput settings interaction complete!\n');
  });
});

test.describe('Config Panel - Generate Button State', () => {
  test('verify generate button visibility and state', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await page.goto('/studio');
    await page.waitForLoadState('networkidle');

    console.log('\n=== GENERATE BUTTON STATE ===\n');

    const buttonState = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="unified-config-panel--generate-button"]');
      return {
        exists: !!button,
        text: button?.textContent?.trim() || '',
        disabled: button?.hasAttribute('disabled'),
        className: button?.className,
      };
    });

    console.log('Generate Button State:', buttonState);

    expect(buttonState.exists).toBe(true);
    expect(buttonState.text).toContain('Generate');

    console.log('\nGenerate button verification complete!\n');
  });
});
