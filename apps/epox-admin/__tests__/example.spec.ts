/**
 * Example test demonstrating the authenticated test client setup
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

test.describe('Product Studio Tests', () => {
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
    expect(pageState.url).toContain(clientId);
    expect(pageState.errorMessages).toHaveLength(0);
  });

  test('should check for console errors and network failures', async ({ authenticatedPage, clientId }) => {
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

test.describe('Config Panel Tests', () => {
  test('should verify config panel exists', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    // Navigate to dashboard first
    await nav.goToDashboard();

    // Check if config panel exists anywhere on page
    const panel = await nav.checkPanelExists(SELECTORS.configPanel);

    console.log('Config Panel Check:', panel);

    // Note: Adjust assertion based on actual page structure
    // This is just an example
  });

  test('should extract config panel state as text', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    await nav.goToDashboard();

    // Get config panel state (text-only, ~200-500 tokens)
    const panelState = await nav.getConfigPanelState();

    console.log('Config Panel State:', {
      exists: panelState.exists,
      inputCount: panelState.state?.inputs?.length,
      labels: panelState.state?.labels,
    });

    // If panel exists, verify structure
    if (panelState.exists) {
      expect(panelState.state).toBeDefined();
      expect(panelState.state?.inputs).toBeDefined();
    }
  });
});

test.describe('Generation Flow Tests', () => {
  test('should extract generation flow list state', async ({ authenticatedPage, clientId }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);

    // Note: You'll need to get actual collection ID from the test data
    // For now, navigate to dashboard
    await nav.goToDashboard();

    // Try to get generation flow list if it exists
    const flowList = await nav.getGenFlowListState();

    console.log('Generation Flow List:', {
      exists: flowList.exists,
      totalFlows: flowList.state?.totalFlows,
      emptyState: flowList.state?.emptyState,
    });

    // Log flows if they exist
    if (flowList.exists && flowList.state?.flows) {
      console.log('Flows:', flowList.state.flows);
    }
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

    // Step 2: Client Settings
    await nav.goToClientSettings();
    state = await nav.getPageStateSummary();
    console.log('✅ Step 2 - Settings loaded:', state.title);
    expect(state.errorMessages).toHaveLength(0);

    // Step 3: Back to Dashboard
    await nav.goToDashboard();
    state = await nav.getPageStateSummary();
    console.log('✅ Step 3 - Back to dashboard:', state.title);

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

    expect(pageState.url).toContain(clientId);
    expect(clientId).toBe('test-client-secondary');
  });
});
