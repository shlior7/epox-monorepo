/**
 * Example test demonstrating the authenticated test client setup for epox-platform
 * This test shows how to:
 * 1. Use pre-authenticated test clients
 * 2. Navigate efficiently with helpers
 * 3. Extract state as text (not screenshots)
 * 4. Capture errors programmatically
 */

import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper, SELECTORS } from './helpers/navigation';

// Use the main test client (has 3 products, 2 collections)
test.use({ testClientName: 'main' });

test.describe('Dashboard Tests', () => {
  test('should load dashboard successfully', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    // Navigate to dashboard
    await nav.goToDashboard();

    // Extract page state as TEXT (efficient, ~100 tokens)
    const pageState = await nav.getPageStateSummary();

    console.log('Dashboard Page State:', {
      url: pageState.url,
      title: pageState.title,
      headingsCount: pageState.headings.length,
      buttonsCount: pageState.buttons.length,
    });

    // Verify page loaded
    expect(pageState.url).toContain('/dashboard');
    expect(pageState.errorMessages).toHaveLength(0);
  });

  test('should check for console errors and network failures', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    // Start capturing errors
    const errors = await nav.captureErrors();

    // Navigate to dashboard
    await nav.goToDashboard();

    // Wait for network idle
    await authenticatedPage.waitForLoadState('networkidle');

    // Check for errors (text-only, efficient)
    console.log('Console Errors:', errors.consoleErrors);
    console.log('Network Failures:', errors.networkFailures);

    // Assert no critical errors
    expect(errors.consoleErrors).toHaveLength(0);
    expect(errors.networkFailures).toHaveLength(0);
  });
});

test.describe('Products Page Tests', () => {
  test('should load products page', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToProducts();

    const pageState = await nav.getPageStateSummary();

    console.log('Products Page:', {
      url: pageState.url,
      title: pageState.title,
    });

    expect(pageState.url).toContain('/products');
    expect(pageState.errorMessages).toHaveLength(0);
  });
});

test.describe('Collections Page Tests', () => {
  test('should load collections page', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToCollections();

    const pageState = await nav.getPageStateSummary();

    console.log('Collections Page:', {
      url: pageState.url,
      title: pageState.title,
    });

    expect(pageState.url).toContain('/collections');
    expect(pageState.errorMessages).toHaveLength(0);
  });
});

test.describe('Studio Page Tests', () => {
  test('should load studio page', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToStudio();

    const pageState = await nav.getPageStateSummary();

    console.log('Studio Page:', {
      url: pageState.url,
      title: pageState.title,
    });

    expect(pageState.url).toContain('/studio');
    expect(pageState.errorMessages).toHaveLength(0);
  });

  test('should check config panel if it exists', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToStudio();

    // Check if config panel exists
    const panel = await nav.checkPanelExists(SELECTORS.configPanel);

    console.log('Config Panel Check:', panel);

    // Note: This test doesn't require the panel to exist
    // It just demonstrates how to check for it
  });
});

test.describe('Multi-Step User Flow', () => {
  test('should complete full navigation journey', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    // Step 1: Dashboard
    await nav.goToDashboard();
    let state = await nav.getPageStateSummary();
    console.log('✅ Step 1 - Dashboard loaded:', state.title);
    expect(state.errorMessages).toHaveLength(0);

    // Step 2: Products
    await nav.goToProducts();
    state = await nav.getPageStateSummary();
    console.log('✅ Step 2 - Products loaded:', state.title);
    expect(state.errorMessages).toHaveLength(0);

    // Step 3: Collections
    await nav.goToCollections();
    state = await nav.getPageStateSummary();
    console.log('✅ Step 3 - Collections loaded:', state.title);
    expect(state.errorMessages).toHaveLength(0);

    // Step 4: Settings
    await nav.goToSettings();
    state = await nav.getPageStateSummary();
    console.log('✅ Step 4 - Settings loaded:', state.title);
    expect(state.errorMessages).toHaveLength(0);

    // Verify no errors throughout the journey
    expect(errors.consoleErrors).toHaveLength(0);
    expect(errors.networkFailures).toHaveLength(0);

    console.log('✨ User journey completed successfully!');
  });
});

// Example test using secondary client
test.describe('Secondary Client Tests', () => {
  // Switch to secondary test client
  test.use({ testClientName: 'secondary' });

  test('should load dashboard for secondary client', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToDashboard();

    const pageState = await nav.getPageStateSummary();

    console.log('Secondary Client Dashboard:', {
      clientId,
      url: pageState.url,
      title: pageState.title,
    });

    expect(pageState.url).toContain('/dashboard');
    expect(clientId).toBe('test-client-secondary');
  });
});
