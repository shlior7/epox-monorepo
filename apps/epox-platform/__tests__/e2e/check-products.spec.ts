/**
 * Quick check of the products page
 */

import { test, expect } from './setup/auth-fixtures';
import { createNavigationHelper } from './helpers/navigation';

test.use({ testClientName: 'main' });

test('check products page', async ({ authenticatedPage, clientId }) => {
  const nav = createNavigationHelper(authenticatedPage, clientId);

  // Start capturing errors
  const errors = await nav.captureErrors();

  // Navigate to products page
  await nav.goToProducts();
  await authenticatedPage.waitForLoadState('networkidle');

  // Extract page state as TEXT (efficient)
  const pageState = await authenticatedPage.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map((h) =>
        h.textContent?.trim()
      ),

      // Look for product cards/items
      productCards: Array.from(
        document.querySelectorAll('[data-testid*="product"], .product-card, [class*="product"]')
      ).length,

      // Get all visible text content from main sections
      mainContent: document.querySelector('main')?.textContent?.trim().substring(0, 500),

      // Check for buttons
      buttons: Array.from(document.querySelectorAll('button'))
        .map((b) => ({
          text: b.textContent?.trim(),
          disabled: b.disabled,
        }))
        .slice(0, 10), // First 10 buttons

      // Check for empty states
      emptyState: document.querySelector('[data-testid="empty-state"]')?.textContent?.trim(),

      // Check for loading states
      isLoading: !!document.querySelector('[data-testid="loading"], .loading, [class*="spinner"]'),

      // Error messages
      errorMessages: Array.from(
        document.querySelectorAll('[role="alert"], .error, [data-error], [class*="error"]')
      ).map((e) => e.textContent?.trim()),
    };
  });

  // Log findings
  console.log('\n📊 Products Page State:');
  console.log('━'.repeat(50));
  console.log('URL:', pageState.url);
  console.log('Title:', pageState.title);
  console.log('Headings:', pageState.headings);
  console.log('Product Cards Found:', pageState.productCards);
  console.log('Is Loading:', pageState.isLoading);
  console.log('Empty State:', pageState.emptyState || 'None');
  console.log(
    'Error Messages:',
    pageState.errorMessages.length > 0 ? pageState.errorMessages : 'None'
  );
  console.log('\nButtons:', pageState.buttons.map((b) => b.text).filter(Boolean));
  console.log('\nMain Content Preview:', pageState.mainContent?.substring(0, 200) + '...');

  // Check for errors
  console.log('\n🔍 Error Check:');
  console.log('━'.repeat(50));
  console.log(
    'Console Errors:',
    errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None ✅'
  );
  console.log(
    'Network Failures:',
    errors.networkFailures.length > 0 ? errors.networkFailures : 'None ✅'
  );

  // Assertions
  expect(pageState.url).toContain('/products');
  expect(pageState.errorMessages).toHaveLength(0);
  expect(errors.consoleErrors).toHaveLength(0);
  expect(errors.networkFailures).toHaveLength(0);
  expect(pageState.isLoading).toBe(false);

  console.log('\n✅ Products page check complete!\n');
});
