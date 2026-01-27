/**
 * Collections Feature Tests
 *
 * Tests the complete collection workflow:
 * - Creating collections from multiple products
 * - Collection studio page and config panel
 * - Collections list view
 * - Generation flows
 *
 * Screenshots captured:
 * - create-collection-selection.png - Product selection in studio
 * - create-collection-button.png - Create collection button state
 * - collection-studio-page.png - Collection studio view
 * - collection-config-panel.png - Config panel detail
 * - collection-inspire-section.png - Inspire section
 * - collections-list.png - Collections list page
 * - collection-card.png - Individual collection card
 *
 * Database verification:
 * - Collection created with correct products
 * - Generation flow auto-created
 * - Collection appears in list
 * - Products correctly associated
 */

import { test, expect } from '../../setup/auth-fixtures';
import { createNavigationHelper } from '../../helpers/navigation';
import { collectionSession, generationFlow } from '../../helpers/schema-tables';
import {
  cleanClientData,
  seedProductsViaAPI,
  seedCollectionsViaAPI,
} from '../../helpers/seed-helpers-api';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

// Use collections test client
test.use({ testClientName: 'collections' });

// Screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Collections Feature', () => {
  // Run tests sequentially to share state
  test.describe.configure({ mode: 'serial' });

  let createdCollectionId: string;
  let seededProductIds: string[];

  // Setup test: Seed data using APIs (must be first test in serial mode)
  test('setup: seed collections feature data', async ({ db, clientId, authenticatedPage }) => {
    console.log('\n🌱 Seeding Collections Feature Data via API...\n');

    // Clean existing data for this client
    await cleanClientData(db, clientId);

    // Seed products using POST /api/products (tests the API!)
    seededProductIds = await seedProductsViaAPI(authenticatedPage, [
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
        name: 'Leather Armchair',
        description: 'Luxury leather armchair',
        category: 'Furniture',
        sceneTypes: ['living-room'],
      },
    ]);

    // Seed pre-existing collections using POST /api/collections (tests the API!)
    await seedCollectionsViaAPI(authenticatedPage, seededProductIds, [
      {
        name: 'Living Room Collection',
        productCount: 2,
      },
      {
        name: 'Dining Room Set',
        productCount: 2,
      },
    ]);

    console.log('✅ Collections feature data seeded\n');
  });

  test('create collection from multiple products', async ({ authenticatedPage, clientId, db }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    console.log('\n=== CREATE COLLECTION TEST ===\n');

    // Navigate to studio
    await nav.goToStudio();
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for product grid
    const productGrid = authenticatedPage.locator('[data-testid="studio-product-grid--grid"]');
    await expect(productGrid).toBeVisible({ timeout: 15000 });

    const productCards = productGrid.locator('> [data-testid^="product-card--"]');
    const cardCount = await productCards.count();
    console.log(`Found ${cardCount} products`);

    expect(cardCount).toBeGreaterThanOrEqual(2);

    // 📸 Screenshot: Initial studio page with products
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'studio-product-grid.png'),
      fullPage: false,
    });
    console.log('📸 Saved: studio-product-grid.png');

    // Select first two products
    await productCards.nth(0).click();
    await authenticatedPage.waitForTimeout(300);
    await productCards.nth(1).click();
    await authenticatedPage.waitForTimeout(500);

    // 📸 Screenshot: Product selection with island
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'create-collection-selection.png'),
      fullPage: false,
    });
    console.log('📸 Saved: create-collection-selection.png');

    // Click create collection button
    const createBtn = authenticatedPage
      .locator('[data-testid="selection-island-create-button"]')
      .first();

    const buttonText = await createBtn.textContent();
    console.log('Button text:', buttonText);
    expect(buttonText).toContain('Create Collection');

    // 📸 Screenshot: Create button
    await createBtn.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'create-collection-button.png'),
    });
    console.log('📸 Saved: create-collection-button.png');

    await createBtn.click();

    // Wait for navigation to collection studio
    await authenticatedPage.waitForURL(/\/studio\/collections\/[^/]+$/, { timeout: 15000 });

    const finalUrl = authenticatedPage.url();
    const collectionIdMatch = finalUrl.match(/\/studio\/collections\/([a-f0-9-]+)$/);
    expect(collectionIdMatch).toBeTruthy();

    createdCollectionId = collectionIdMatch![1];
    console.log('Created collection ID:', createdCollectionId);

    // 🔍 DATABASE VERIFICATION
    const collection = await db.query.collectionSession.findFirst({
      where: (coll: any, { eq }: any) => eq(coll.id, createdCollectionId),
    });

    expect(collection).toBeTruthy();
    expect(collection!.clientId).toBe(clientId);
    expect(collection!.productIds).toHaveLength(2);
    console.log('✅ Database: Collection created with 2 products');
    console.log(`   Collection name: ${collection!.name}`);
    console.log(`   Status: ${collection!.status}`);

    // Verify generation flow was auto-created
    const flows = await db.query.generationFlow.findMany({
      where: (flow: any, { eq }: any) => eq(flow.collectionSessionId, createdCollectionId),
    });

    expect(flows.length).toBeGreaterThan(0);
    console.log(`✅ Database: ${flows.length} generation flow(s) created`);

    // 📸 UI VERIFICATION
    await authenticatedPage.waitForLoadState('networkidle');

    const collectionState = await authenticatedPage.evaluate(() => {
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
        hasGenerateButton: !!document.querySelector(
          '[data-testid="unified-config-panel--generate-button"]'
        ),
        hasInspireSection: !!document.querySelector('[data-testid="inspire-section"]'),
      };
    });

    console.log('Collection Studio UI State:', collectionState);

    expect(collectionState.hasConfigPanel).toBe(true);
    expect(collectionState.hasGenerateButton).toBe(true);
    console.log('✅ UI: Collection studio page loaded correctly');

    // 📸 Screenshot: Collection studio page
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collection-studio-page.png'),
      fullPage: false,
    });
    console.log('📸 Saved: collection-studio-page.png');

    console.log('\n✅ Collection creation complete!\n');
  });

  test('verify collection studio layout and components', async ({
    authenticatedPage,
    clientId,
  }) => {
    console.log('\n=== COLLECTION STUDIO LAYOUT TEST ===\n');

    // Navigate to the collection we created
    await authenticatedPage.goto(`/studio/collections/${createdCollectionId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify all studio elements
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
        sceneTypeCount: document.querySelectorAll('[data-testid^="scene-type-accordion"]').length,
        hasProductList: document.querySelectorAll('[data-testid^="product-card--"]').length > 0,
      };
    });

    console.log('Studio Layout State:', studioState);

    expect(studioState.hasConfigPanel).toBe(true);
    expect(studioState.hasInspireSection).toBe(true);
    expect(studioState.hasGenerateButton).toBe(true);
    expect(studioState.sceneTypeCount).toBeGreaterThan(0);
    expect(studioState.hasProductList).toBe(true);

    console.log('✅ All studio components present');

    // 📸 Screenshot: Config panel detail
    const configPanel = authenticatedPage.locator('[data-testid="unified-config-panel"]');
    if (await configPanel.isVisible()) {
      await configPanel.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'collection-config-panel.png'),
      });
      console.log('📸 Saved: collection-config-panel.png');
    }

    // 📸 Screenshot: Inspire section
    const inspireSection = authenticatedPage.locator('[data-testid="inspire-section"]');
    if (await inspireSection.isVisible()) {
      await inspireSection.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'collection-inspire-section.png'),
      });
      console.log('📸 Saved: collection-inspire-section.png');
    }

    console.log('\n✅ Studio layout verification complete!\n');
  });

  test('verify collection appears in collections list', async ({
    authenticatedPage,
    clientId,
    db,
  }) => {
    console.log('\n=== COLLECTIONS LIST TEST ===\n');

    // Navigate to collections list
    await authenticatedPage.goto('/collections');
    await authenticatedPage.waitForLoadState('networkidle');

    // 🔍 DATABASE VERIFICATION
    const allCollections = await db.query.collectionSession.findMany({
      where: (coll: any, { eq }: any) => eq(coll.clientId, clientId),
    });

    console.log(`Database has ${allCollections.length} collection(s)`);
    expect(allCollections.length).toBeGreaterThan(0);

    allCollections.forEach((coll: any) => {
      console.log(`  - ${coll.name} (${coll.status}) - ${coll.productIds.length} products`);
    });

    // 📸 UI VERIFICATION
    const listState = await authenticatedPage.evaluate(() => {
      const collectionCards = document.querySelectorAll('[data-testid^="collection-card--"]');
      return {
        pageTitle: document.querySelector('h1')?.textContent?.trim(),
        totalCollections: collectionCards.length,
        collectionNames: Array.from(collectionCards).map((c) => c.textContent?.substring(0, 50)),
      };
    });

    console.log('Collections List UI State:');
    console.log('  Page Title:', listState.pageTitle);
    console.log('  Total Collections:', listState.totalCollections);
    console.log('  Collection Names:', listState.collectionNames);

    expect(listState.totalCollections).toBe(allCollections.length);
    console.log('✅ UI matches database: same number of collections');

    // Verify our created collection appears
    const ourCollectionCard = authenticatedPage.locator(
      `[data-testid="collection-card--${createdCollectionId}"]`
    );
    await expect(ourCollectionCard).toBeVisible();
    console.log('✅ Created collection visible in list');

    // 📸 Screenshot: Collections list
    await authenticatedPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'collections-list.png'),
      fullPage: false,
    });
    console.log('📸 Saved: collections-list.png');

    // 📸 Screenshot: Individual collection card
    if (await ourCollectionCard.isVisible()) {
      await ourCollectionCard.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'collection-card.png'),
      });
      console.log('📸 Saved: collection-card.png');
    }

    console.log('\n✅ Collections list verification complete!\n');
  });

  test('verify generation flows for collection', async ({ authenticatedPage, clientId, db }) => {
    console.log('\n=== GENERATION FLOWS TEST ===\n');

    // 🔍 DATABASE VERIFICATION
    const flows = await db.query.generationFlow.findMany({
      where: (flow: any, { eq }: any) => eq(flow.collectionSessionId, createdCollectionId),
    });

    console.log(`Database has ${flows.length} flow(s) for this collection`);
    expect(flows.length).toBeGreaterThan(0);

    const flow = flows[0];
    console.log('Flow details:');
    console.log('  ID:', flow.id);
    console.log('  Name:', flow.name);
    console.log('  Status:', flow.status);
    console.log('  Products:', flow.productIds.length);
    console.log('  Collection ID:', flow.collectionSessionId);

    // Verify flow has correct products
    expect(flow.productIds.length).toBe(2);
    expect(flow.collectionSessionId).toBe(createdCollectionId);
    console.log('✅ Generation flow has correct data');

    // Navigate to collection studio to see flows UI
    await authenticatedPage.goto(`/studio/collections/${createdCollectionId}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Check if generation flows section exists in UI
    const flowsState = await authenticatedPage.evaluate(() => {
      const flowsList = document.querySelector('[data-testid*="generation-flow"]');
      const flowItems = document.querySelectorAll('[data-testid^="flow-item--"]');

      return {
        hasFlowsList: !!flowsList,
        flowItemsCount: flowItems.length,
      };
    });

    console.log('Generation Flows UI State:', flowsState);

    if (flowsState.hasFlowsList) {
      console.log('✅ Generation flows section visible in UI');
    }

    console.log('\n✅ Generation flows verification complete!\n');
  });

  test('verify pre-seeded collections exist', async ({ authenticatedPage, clientId, db }) => {
    console.log('\n=== PRE-SEEDED COLLECTIONS TEST ===\n');

    // 🔍 DATABASE VERIFICATION - Check for pre-seeded collections
    const allCollections = await db.query.collectionSession.findMany({
      where: (coll: any, { eq }: any) => eq(coll.clientId, clientId),
    });

    console.log(`Total collections in database: ${allCollections.length}`);

    // Should have at least 3 collections (2 pre-seeded + 1 created in tests)
    expect(allCollections.length).toBeGreaterThanOrEqual(3);

    const preSeededCollections = allCollections.filter(
      (c: any) => c.name === 'Living Room Collection' || c.name === 'Dining Room Set'
    );

    console.log(`Pre-seeded collections found: ${preSeededCollections.length}`);
    expect(preSeededCollections.length).toBe(2);

    preSeededCollections.forEach((coll: any) => {
      console.log(`  - ${coll.name} (${coll.status}) - ${coll.productIds.length} products`);
    });

    console.log('✅ All pre-seeded collections verified');

    console.log('\n✅ Pre-seeded collections test complete!\n');
  });
});
