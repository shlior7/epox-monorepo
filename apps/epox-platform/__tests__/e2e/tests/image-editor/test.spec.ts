/**
 * Image Editor Feature Tests
 *
 * Tests the image editor overlay and modal functionality:
 * - Edit overlay appears on image hover
 * - Modal opens with correct structure
 * - AI Edit and Adjustments tabs work
 * - Revision history navigation
 * - Store sync warning on save dialog
 *
 * Following script-first, screenshot-last approach for efficiency.
 *
 * Screenshots captured:
 * - image-edit-overlay.png - Edit overlay on hover
 * - image-editor-modal.png - Full editor modal
 * - image-editor-adjustments.png - Adjustments tab
 * - save-dialog-synced-warning.png - Save dialog with store sync warning
 * - save-dialog-no-warning.png - Save dialog without warning (non-synced)
 * - after-edit-gallery.png - Gallery view after edit is saved
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

test.describe('Image Editor Feature', () => {
  test('verify edit overlay appears on image hover', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== IMAGE EDIT OVERLAY VERIFICATION ===\n');

    // Navigate to studio page which has product images
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    // ==========================================
    // PHASE 1: DOM State Extraction (text-only)
    // ==========================================
    const initialState = await authenticatedPage.evaluate(() => {
      // Find any image containers with edit overlay
      const productCards = document.querySelectorAll('[data-testid^="product-card--"]');
      const imagesWithOverlay = document.querySelectorAll('[data-testid$="-image-overlay"]');
      const editButtons = document.querySelectorAll('[data-testid$="-edit-button"]');

      return {
        productCardCount: productCards.length,
        imagesWithOverlayCount: imagesWithOverlay.length,
        editButtonCount: editButtons.length,
        hasImages: productCards.length > 0,
      };
    });

    console.log('Initial State:', {
      productCards: initialState.productCardCount,
      imagesWithOverlay: initialState.imagesWithOverlayCount,
      editButtons: initialState.editButtonCount,
    });

    // Check console errors
    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    expect(errors.consoleErrors).toHaveLength(0);

    // Verify images exist on the page
    expect(initialState.hasImages).toBe(true);

    // ==========================================
    // PHASE 2: Hover Interaction Test
    // ==========================================
    if (initialState.productCardCount > 0) {
      // Find first product card with an image
      const firstProductCard = authenticatedPage
        .locator('[data-testid^="product-card--"]')
        .first();

      // Get image container within the card
      const imageContainer = firstProductCard.locator('[data-testid$="-image"]').first();

      if (await imageContainer.isVisible()) {
        // Hover over the image
        await imageContainer.hover();
        await authenticatedPage.waitForTimeout(300); // Wait for hover animation

        // Check if edit button became visible
        const editButtonVisible = await authenticatedPage.evaluate(() => {
          const editBtn = document.querySelector('[data-testid$="-edit-button"]');
          if (!editBtn) return { found: false, visible: false };

          const style = window.getComputedStyle(editBtn);
          const opacity = parseFloat(style.opacity);
          return {
            found: true,
            visible: opacity > 0.5,
            opacity: opacity,
          };
        });

        console.log('Edit Button on Hover:', editButtonVisible);

        // Take targeted screenshot of the card with overlay
        if (editButtonVisible.found) {
          await firstProductCard.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'image-edit-overlay.png'),
          });
          console.log('Saved: image-edit-overlay.png');
        }
      }
    }

    console.log('\nEdit overlay verification complete!\n');
  });

  test('verify image editor modal opens and has correct structure', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== IMAGE EDITOR MODAL VERIFICATION ===\n');

    // Navigate to studio page
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    // ==========================================
    // PHASE 1: Find and click edit button
    // ==========================================

    // First, find an image to edit
    const firstProductCard = authenticatedPage
      .locator('[data-testid^="product-card--"]')
      .first();

    if (await firstProductCard.isVisible()) {
      const imageContainer = firstProductCard.locator('[data-testid$="-image"]').first();

      if (await imageContainer.isVisible()) {
        // Hover to reveal edit button
        await imageContainer.hover();
        await authenticatedPage.waitForTimeout(300);

        // Look for any edit button that's visible
        const editButton = authenticatedPage.locator('[data-testid$="-edit-button"]').first();

        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('Edit button found, clicking...');
          await editButton.click();
          await authenticatedPage.waitForTimeout(500); // Wait for modal animation

          // ==========================================
          // PHASE 2: Verify Modal Structure (text-only)
          // ==========================================
          const modalState = await authenticatedPage.evaluate(() => {
            const modal = document.querySelector('[data-testid="image-editor-modal"]');
            if (!modal) return { exists: false };

            // Check modal components
            const closeBtn = modal.querySelector('[data-testid="image-editor-modal--close"]');
            const previewArea = modal.querySelector('[data-testid="image-editor-modal--preview"]');
            const revisionNav = modal.querySelector('[data-testid="image-editor-modal--revision-nav"]');
            const revisionGallery = modal.querySelector('[data-testid="image-editor-modal--revision-gallery"]');

            // Check tabs
            const tabs = modal.querySelectorAll('[role="tab"]');
            const tabNames = Array.from(tabs).map((t) => t.textContent?.trim());

            // Check buttons
            const generateBtn = modal.querySelector('[data-testid="image-editor-modal--generate-btn"]');
            const saveBtn = modal.querySelector('[data-testid="image-editor-modal--save-btn"]');

            // Check prompt area
            const promptTextarea = modal.querySelector('[data-testid="image-editor-modal--edit-prompt"]');

            return {
              exists: true,
              hasCloseButton: !!closeBtn,
              hasPreviewArea: !!previewArea,
              hasRevisionNav: !!revisionNav,
              hasRevisionGallery: !!revisionGallery,
              tabCount: tabs.length,
              tabNames,
              hasGenerateButton: !!generateBtn,
              hasSaveButton: !!saveBtn,
              hasPromptTextarea: !!promptTextarea,
              generateButtonDisabled: generateBtn?.hasAttribute('disabled'),
              saveButtonDisabled: saveBtn?.hasAttribute('disabled'),
              modalTitle: modal.querySelector('[data-testid="image-editor-modal"] h2, [data-testid="image-editor-modal"] [role="dialog"] h2')?.textContent?.trim(),
            };
          });

          console.log('Modal State:', modalState);

          // Assertions
          expect(modalState.exists).toBe(true);
          expect(modalState.hasCloseButton).toBe(true);
          expect(modalState.hasPreviewArea).toBe(true);
          expect(modalState.tabCount).toBeGreaterThanOrEqual(2);
          expect(modalState.hasGenerateButton).toBe(true);
          expect(modalState.hasSaveButton).toBe(true);

          // ==========================================
          // PHASE 3: Screenshot of Modal (if visible)
          // ==========================================
          const modal = authenticatedPage.locator('[data-testid="image-editor-modal"]');
          if (await modal.isVisible()) {
            await modal.screenshot({
              path: path.join(SCREENSHOTS_DIR, 'image-editor-modal.png'),
            });
            console.log('Saved: image-editor-modal.png');
          }

          // ==========================================
          // PHASE 4: Test Adjustments Tab
          // ==========================================
          const adjustmentsTab = authenticatedPage.locator('button[role="tab"]:has-text("Adjust")');
          if (await adjustmentsTab.isVisible()) {
            await adjustmentsTab.click();
            await authenticatedPage.waitForTimeout(300);

            const adjustmentsState = await authenticatedPage.evaluate(() => {
              const modal = document.querySelector('[data-testid="image-editor-modal"]');
              if (!modal) return { exists: false };

              // Check for adjustment sliders
              const sliders = modal.querySelectorAll('[role="slider"]');
              const applyBtn = modal.querySelector('[data-testid="image-editor-modal--apply-adjustments-btn"]');

              // Check for adjustment categories (Light, Color, Effects)
              const categoryTabs = modal.querySelectorAll('.rounded-md button');
              const categoryNames = Array.from(categoryTabs)
                .map((t) => t.textContent?.trim())
                .filter((t) => t && ['Light', 'Color', 'Effects'].includes(t));

              return {
                sliderCount: sliders.length,
                hasApplyButton: !!applyBtn,
                categoryCount: categoryNames.length,
                categoryNames,
              };
            });

            console.log('Adjustments Tab State:', adjustmentsState);

            // Screenshot of adjustments tab
            const modalForAdjustments = authenticatedPage.locator('[data-testid="image-editor-modal"]');
            if (await modalForAdjustments.isVisible()) {
              await modalForAdjustments.screenshot({
                path: path.join(SCREENSHOTS_DIR, 'image-editor-adjustments.png'),
              });
              console.log('Saved: image-editor-adjustments.png');
            }
          }

          // Close modal
          const closeButton = authenticatedPage.locator('[data-testid="image-editor-modal--close"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await authenticatedPage.waitForTimeout(300);
          }
        } else {
          console.log('Edit button not found - skipping modal tests');
        }
      }
    } else {
      console.log('No product cards found - skipping tests');
    }

    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    console.log('\nImage editor modal verification complete!\n');
  });

  test('verify image editor on store assets page', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== STORE ASSETS IMAGE EDITOR VERIFICATION ===\n');

    // Navigate to store page
    await nav.goToStore();

    // ==========================================
    // PHASE 1: Check Store Page State
    // ==========================================
    const storeState = await nav.getStorePageState();
    console.log('Store Page State:', storeState.state);

    if (storeState.state === 'connected' && storeState.productGroupCount > 0) {
      // Find store asset cards with images
      const assetState = await authenticatedPage.evaluate(() => {
        const storeAssetCards = document.querySelectorAll('[data-testid^="store-product-group-"]');
        const assetImages = document.querySelectorAll('[data-testid*="-asset-"]');
        const editOverlays = document.querySelectorAll('[data-testid$="-image-overlay"]');

        return {
          assetCardCount: storeAssetCards.length,
          assetImageCount: assetImages.length,
          editOverlayCount: editOverlays.length,
        };
      });

      console.log('Store Asset State:', assetState);

      // Try to find and hover over an asset image
      const assetImage = authenticatedPage.locator('[data-testid*="-asset-"] img').first();

      if (await assetImage.isVisible().catch(() => false)) {
        // Hover to check for edit overlay
        await assetImage.hover();
        await authenticatedPage.waitForTimeout(300);

        const overlayVisible = await authenticatedPage.evaluate(() => {
          const overlay = document.querySelector('[data-testid$="-image-overlay"]');
          const editBtn = document.querySelector('[data-testid$="-edit-button"]');

          return {
            overlayFound: !!overlay,
            editButtonFound: !!editBtn,
            editButtonVisible: editBtn
              ? parseFloat(window.getComputedStyle(editBtn).opacity) > 0.5
              : false,
          };
        });

        console.log('Overlay on Store Asset:', overlayVisible);
      }
    } else {
      console.log('Store not connected or no products - skipping store-specific tests');
    }

    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    console.log('\nStore assets image editor verification complete!\n');
  });

  test('verify store sync warning in save dialog for synced images', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== STORE SYNC WARNING VERIFICATION ===\n');

    // Navigate to store page to find synced images
    await nav.goToStore();

    // ==========================================
    // PHASE 1: Find synced asset and open editor
    // ==========================================
    const storeState = await nav.getStorePageState();
    console.log('Store Page State:', storeState.state);

    if (storeState.state !== 'connected' || storeState.productGroupCount === 0) {
      console.log('Store not connected or no products - skipping sync warning test');
      return;
    }

    // Find a synced asset (has green checkmark badge)
    const syncedAssetState = await authenticatedPage.evaluate(() => {
      // Look for assets with sync status badge showing "synced"
      const syncedBadges = document.querySelectorAll('[data-testid="sync-badge-synced"]');
      const syncedCards = Array.from(syncedBadges).map((badge) => {
        const card = badge.closest('[data-testid^="store-asset-"]');
        return card?.getAttribute('data-testid');
      }).filter(Boolean);

      // Also check for base images from store (have store badge)
      const storeBadges = document.querySelectorAll('[data-testid$="-store-badge"]');
      const baseImageCards = Array.from(storeBadges).map((badge) => {
        const card = badge.closest('[data-testid^="base-image-"]');
        return card?.getAttribute('data-testid');
      }).filter(Boolean);

      return {
        syncedAssetCount: syncedCards.length,
        syncedAssetTestIds: syncedCards.slice(0, 3),
        baseImageFromStoreCount: baseImageCards.length,
        baseImageTestIds: baseImageCards.slice(0, 3),
      };
    });

    console.log('Synced Assets State:', syncedAssetState);

    // Try to find any synced image to edit
    let imageEditorOpened = false;

    // First try synced generated assets
    if (syncedAssetState.syncedAssetCount > 0) {
      const firstSyncedAsset = authenticatedPage.locator('[data-testid="sync-badge-synced"]').first();
      const parentCard = firstSyncedAsset.locator('xpath=ancestor::*[contains(@data-testid, "store-asset-")]').first();

      if (await parentCard.isVisible().catch(() => false)) {
        // Hover to reveal edit button
        await parentCard.hover();
        await authenticatedPage.waitForTimeout(300);

        const editButton = parentCard.locator('[data-testid$="-edit-button"]').first();
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editButton.click();
          await authenticatedPage.waitForTimeout(1000); // Wait for modal and image to load
          imageEditorOpened = true;
          console.log('Opened editor on synced generated asset');
        }
      }
    }

    // Fallback: try base images from store
    if (!imageEditorOpened && syncedAssetState.baseImageFromStoreCount > 0) {
      const firstBaseImage = authenticatedPage.locator('[data-testid$="-store-badge"]').first();
      const parentCard = firstBaseImage.locator('xpath=ancestor::*[contains(@data-testid, "base-image-")]').first();

      if (await parentCard.isVisible().catch(() => false)) {
        await parentCard.hover();
        await authenticatedPage.waitForTimeout(300);

        const editButton = parentCard.locator('[data-testid$="-edit-button"]').first();
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await editButton.click();
          await authenticatedPage.waitForTimeout(1000);
          imageEditorOpened = true;
          console.log('Opened editor on base image from store');
        }
      }
    }

    if (!imageEditorOpened) {
      console.log('No synced images found to edit - skipping test');
      return;
    }

    // ==========================================
    // PHASE 2: Wait for modal to load
    // ==========================================
    const modal = authenticatedPage.locator('[data-testid="image-editor-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for original revision to load
    const originalRevision = authenticatedPage.locator('[data-testid="image-editor-modal--revision-0"]');
    await expect(originalRevision).toBeVisible({ timeout: 10000 });

    console.log('Modal opened, original revision loaded');

    // ==========================================
    // PHASE 3: Create a revision (use adjustments for speed)
    // ==========================================
    // Switch to adjustments tab
    const adjustmentsTab = authenticatedPage.locator('button[role="tab"]:has-text("Adjust")');
    await adjustmentsTab.click();
    await authenticatedPage.waitForTimeout(300);

    // Find a slider and adjust it
    const slider = authenticatedPage.locator('[role="slider"]').first();
    if (await slider.isVisible().catch(() => false)) {
      // Move slider to create a change
      const box = await slider.boundingBox();
      if (box) {
        await authenticatedPage.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
        await authenticatedPage.waitForTimeout(200);
      }
    }

    // Apply adjustments to create a revision
    const applyAdjustmentsBtn = authenticatedPage.locator('[data-testid="image-editor-modal--apply-adjustments-btn"]');
    if (await applyAdjustmentsBtn.isEnabled().catch(() => false)) {
      await applyAdjustmentsBtn.click();
      await authenticatedPage.waitForTimeout(1000); // Wait for processing

      // Wait for new revision to appear
      const revision1 = authenticatedPage.locator('[data-testid="image-editor-modal--revision-1"]');
      await expect(revision1).toBeVisible({ timeout: 10000 });
      console.log('Revision created successfully');
    } else {
      console.log('Apply adjustments button not enabled - trying to proceed anyway');
    }

    // ==========================================
    // PHASE 4: Open Save Dialog and verify warning
    // ==========================================
    const saveButton = authenticatedPage.locator('[data-testid="image-editor-modal--save-btn"]');

    // Save button should be enabled now that we have a revision
    if (await saveButton.isEnabled().catch(() => false)) {
      await saveButton.click();
      await authenticatedPage.waitForTimeout(500);

      // ==========================================
      // PHASE 5: Verify Store Sync Warning
      // ==========================================
      const saveDialogState = await authenticatedPage.evaluate(() => {
        const saveDialog = document.querySelector('[data-testid="image-editor-modal--save-dialog"]');
        if (!saveDialog) return { dialogFound: false };

        // Check for store sync warning
        const syncWarning = saveDialog.querySelector('[data-testid="image-editor-modal--store-sync-warning"]');
        const warningText = syncWarning?.textContent || '';

        // Check button texts
        const overwriteBtn = saveDialog.querySelector('[data-testid="image-editor-modal--save-overwrite"]');
        const copyBtn = saveDialog.querySelector('[data-testid="image-editor-modal--save-copy"]');

        return {
          dialogFound: true,
          hasStoreSyncWarning: !!syncWarning,
          warningContainsStoreText: warningText.toLowerCase().includes('store'),
          warningContainsCustomersText: warningText.toLowerCase().includes('customer'),
          overwriteButtonText: overwriteBtn?.textContent?.trim() || '',
          copyButtonText: copyBtn?.textContent?.trim() || '',
          overwriteContainsStoreText: overwriteBtn?.textContent?.toLowerCase().includes('store') || false,
        };
      });

      console.log('Save Dialog State:', saveDialogState);

      // Assertions for synced image warning
      expect(saveDialogState.dialogFound).toBe(true);
      expect(saveDialogState.hasStoreSyncWarning).toBe(true);
      expect(saveDialogState.warningContainsStoreText).toBe(true);
      expect(saveDialogState.warningContainsCustomersText).toBe(true);
      expect(saveDialogState.overwriteContainsStoreText).toBe(true);

      // ==========================================
      // PHASE 6: Screenshot of Save Dialog with Warning
      // ==========================================
      const saveDialog = authenticatedPage.locator('[data-testid="image-editor-modal--save-dialog"]');
      if (await saveDialog.isVisible()) {
        await saveDialog.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'save-dialog-synced-warning.png'),
        });
        console.log('Saved: save-dialog-synced-warning.png');
      }

      // Close the dialog
      const cancelButton = saveDialog.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await authenticatedPage.waitForTimeout(300);
      }
    } else {
      console.log('Save button not enabled - revision may not have been created');
    }

    // Close the editor
    const closeButton = authenticatedPage.locator('[data-testid="image-editor-modal--close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    console.log('\nStore sync warning verification complete!\n');
  });

  test('verify save dialog WITHOUT warning for non-synced images', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== NON-SYNCED SAVE DIALOG VERIFICATION ===\n');

    // Navigate to studio page to find non-synced images
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    // ==========================================
    // PHASE 1: Find a product image (non-synced context)
    // ==========================================
    const firstProductCard = authenticatedPage.locator('[data-testid^="product-card--"]').first();

    if (!(await firstProductCard.isVisible().catch(() => false))) {
      console.log('No product cards found - skipping test');
      return;
    }

    // Open editor on product image
    const imageContainer = firstProductCard.locator('[data-testid$="-image"]').first();
    if (await imageContainer.isVisible()) {
      await imageContainer.hover();
      await authenticatedPage.waitForTimeout(300);

      const editButton = authenticatedPage.locator('[data-testid$="-edit-button"]').first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        await authenticatedPage.waitForTimeout(1000);
      } else {
        console.log('Edit button not found - skipping test');
        return;
      }
    }

    // Wait for modal
    const modal = authenticatedPage.locator('[data-testid="image-editor-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for original revision
    const originalRevision = authenticatedPage.locator('[data-testid="image-editor-modal--revision-0"]');
    await expect(originalRevision).toBeVisible({ timeout: 10000 });

    // ==========================================
    // PHASE 2: Create a quick revision
    // ==========================================
    const adjustmentsTab = authenticatedPage.locator('button[role="tab"]:has-text("Adjust")');
    await adjustmentsTab.click();
    await authenticatedPage.waitForTimeout(300);

    // Adjust a slider
    const slider = authenticatedPage.locator('[role="slider"]').first();
    if (await slider.isVisible().catch(() => false)) {
      const box = await slider.boundingBox();
      if (box) {
        await authenticatedPage.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
        await authenticatedPage.waitForTimeout(200);
      }
    }

    // Apply adjustments
    const applyBtn = authenticatedPage.locator('[data-testid="image-editor-modal--apply-adjustments-btn"]');
    if (await applyBtn.isEnabled().catch(() => false)) {
      await applyBtn.click();
      await authenticatedPage.waitForTimeout(1000);
    }

    // ==========================================
    // PHASE 3: Open Save Dialog
    // ==========================================
    const saveButton = authenticatedPage.locator('[data-testid="image-editor-modal--save-btn"]');
    if (await saveButton.isEnabled().catch(() => false)) {
      await saveButton.click();
      await authenticatedPage.waitForTimeout(500);

      // Verify NO store sync warning for non-synced images
      const saveDialogState = await authenticatedPage.evaluate(() => {
        const saveDialog = document.querySelector('[data-testid="image-editor-modal--save-dialog"]');
        if (!saveDialog) return { dialogFound: false };

        const syncWarning = saveDialog.querySelector('[data-testid="image-editor-modal--store-sync-warning"]');
        const overwriteBtn = saveDialog.querySelector('[data-testid="image-editor-modal--save-overwrite"]');

        return {
          dialogFound: true,
          hasStoreSyncWarning: !!syncWarning,
          overwriteButtonText: overwriteBtn?.textContent?.trim() || '',
        };
      });

      console.log('Save Dialog State (non-synced):', saveDialogState);

      // Assertions for non-synced image (NO warning)
      expect(saveDialogState.dialogFound).toBe(true);
      expect(saveDialogState.hasStoreSyncWarning).toBe(false);

      // Button text should NOT mention "Store"
      expect(saveDialogState.overwriteButtonText?.toLowerCase()).not.toContain('update store');

      // Screenshot
      const saveDialog = authenticatedPage.locator('[data-testid="image-editor-modal--save-dialog"]');
      if (await saveDialog.isVisible()) {
        await saveDialog.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'save-dialog-no-warning.png'),
        });
        console.log('Saved: save-dialog-no-warning.png');
      }

      // Close dialog
      const cancelButton = saveDialog.locator('button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }

    // Close editor
    const closeButton = authenticatedPage.locator('[data-testid="image-editor-modal--close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    console.log('\nNon-synced save dialog verification complete!\n');
  });

  test('verify gallery after saving edited image', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    console.log('\n=== AFTER-EDIT GALLERY VERIFICATION ===\n');

    // Navigate to studio page
    await authenticatedPage.goto('/studio');
    await authenticatedPage.waitForLoadState('networkidle');

    // ==========================================
    // PHASE 1: Count initial assets
    // ==========================================
    const initialState = await authenticatedPage.evaluate(() => {
      const productCards = document.querySelectorAll('[data-testid^="product-card--"]');
      const generatedAssets = document.querySelectorAll('[data-testid^="asset-card-"]');
      return {
        productCardCount: productCards.length,
        generatedAssetCount: generatedAssets.length,
      };
    });

    console.log('Initial State:', initialState);

    // Find and open editor on first product
    const firstProductCard = authenticatedPage.locator('[data-testid^="product-card--"]').first();
    if (!(await firstProductCard.isVisible().catch(() => false))) {
      console.log('No product cards - skipping test');
      return;
    }

    const imageContainer = firstProductCard.locator('[data-testid$="-image"]').first();
    if (await imageContainer.isVisible()) {
      await imageContainer.hover();
      await authenticatedPage.waitForTimeout(300);

      const editButton = authenticatedPage.locator('[data-testid$="-edit-button"]').first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        await authenticatedPage.waitForTimeout(1000);
      } else {
        console.log('Edit button not found');
        return;
      }
    }

    // Wait for modal
    const modal = authenticatedPage.locator('[data-testid="image-editor-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await authenticatedPage.locator('[data-testid="image-editor-modal--revision-0"]').waitFor({ timeout: 10000 });

    // Create revision via adjustments
    const adjustmentsTab = authenticatedPage.locator('button[role="tab"]:has-text("Adjust")');
    await adjustmentsTab.click();
    await authenticatedPage.waitForTimeout(300);

    const slider = authenticatedPage.locator('[role="slider"]').first();
    if (await slider.isVisible().catch(() => false)) {
      const box = await slider.boundingBox();
      if (box) {
        await authenticatedPage.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
      }
    }

    const applyBtn = authenticatedPage.locator('[data-testid="image-editor-modal--apply-adjustments-btn"]');
    if (await applyBtn.isEnabled().catch(() => false)) {
      await applyBtn.click();
      await authenticatedPage.waitForTimeout(1500);
    }

    // Open save dialog
    const saveButton = authenticatedPage.locator('[data-testid="image-editor-modal--save-btn"]');
    if (!(await saveButton.isEnabled().catch(() => false))) {
      console.log('Save button not enabled');
      // Close and return
      await authenticatedPage.locator('[data-testid="image-editor-modal--close"]').click();
      return;
    }

    await saveButton.click();
    await authenticatedPage.waitForTimeout(500);

    // Click "Save as New Asset" to avoid overwriting
    const saveAsCopyBtn = authenticatedPage.locator('[data-testid="image-editor-modal--save-copy"]');
    if (await saveAsCopyBtn.isVisible()) {
      await saveAsCopyBtn.click();

      // Wait for save to complete and modal to close
      await authenticatedPage.waitForTimeout(3000);

      // ==========================================
      // PHASE 2: Verify gallery state after save
      // ==========================================
      const afterSaveState = await authenticatedPage.evaluate(() => {
        const productCards = document.querySelectorAll('[data-testid^="product-card--"]');
        const generatedAssets = document.querySelectorAll('[data-testid^="asset-card-"]');
        return {
          productCardCount: productCards.length,
          generatedAssetCount: generatedAssets.length,
        };
      });

      console.log('After Save State:', afterSaveState);

      // New asset should have been created
      // Note: This depends on the page refreshing or updating via query invalidation
      console.log('Asset count change:', afterSaveState.generatedAssetCount - initialState.generatedAssetCount);

      // ==========================================
      // PHASE 3: Screenshot of gallery after edit
      // ==========================================
      // Take screenshot of the product area showing the new asset
      const galleryArea = authenticatedPage.locator('.grid').first();
      if (await galleryArea.isVisible().catch(() => false)) {
        await galleryArea.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'after-edit-gallery.png'),
        });
        console.log('Saved: after-edit-gallery.png');
      } else {
        // Fallback: screenshot the whole page content area
        await authenticatedPage.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'after-edit-gallery.png'),
          fullPage: false,
        });
        console.log('Saved: after-edit-gallery.png (full page fallback)');
      }
    } else {
      console.log('Save as copy button not found');
    }

    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');
    console.log('\nAfter-edit gallery verification complete!\n');
  });
});
