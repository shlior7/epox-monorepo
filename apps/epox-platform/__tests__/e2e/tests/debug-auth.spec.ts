/**
 * Debug Auth Loading
 * Extracts all console logs and page state to debug authentication issues
 */

import { test, expect } from '../setup/auth-fixtures';

test.use({ testClientName: 'collections' });

test('debug auth loading on studio page', async ({ authenticatedPage, clientId }) => {
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];

  // Capture all console messages
  authenticatedPage.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    } else {
      consoleLogs.push(text);
    }
  });

  // Check cookies before navigation
  const cookiesBefore = await authenticatedPage.context().cookies();
  const sessionCookie = cookiesBefore.find((c) => c.name === 'better-auth.session_token');
  console.log('\n=== COOKIES BEFORE NAVIGATION ===');
  console.log('Session cookie present:', !!sessionCookie);
  if (sessionCookie) {
    console.log('Session cookie value (first 20 chars):', sessionCookie.value.substring(0, 20) + '...');
    console.log('Session cookie domain:', sessionCookie.domain);
    console.log('Session cookie path:', sessionCookie.path);
  }

  // Navigate to studio
  await authenticatedPage.goto('/studio');
  await authenticatedPage.waitForTimeout(5000); // Wait 5 seconds

  // Check cookies after navigation
  const cookiesAfter = await authenticatedPage.context().cookies();
  const sessionCookieAfter = cookiesAfter.find((c) => c.name === 'better-auth.session_token');
  console.log('\n=== COOKIES AFTER NAVIGATION ===');
  console.log('Session cookie still present:', !!sessionCookieAfter);

  // Extract page state
  const pageState = await authenticatedPage.evaluate(() => {
    return {
      url: window.location.href,
      title: document.title,
      h1Text: document.querySelector('h1')?.textContent,
      hasProductGrid: !!document.querySelector('[data-testid="studio-product-grid--grid"]'),
      hasConfigPanel: !!document.querySelector('[data-testid="unified-config-panel"]'),
      hasSkeletons: document.querySelectorAll('[role="status"]').length,
      bodyText: document.body.textContent?.substring(0, 500),
    };
  });

  console.log('\n=== PAGE STATE ===');
  console.log(JSON.stringify(pageState, null, 2));

  console.log('\n=== CONSOLE LOGS (last 50) ===');
  consoleLogs.slice(-50).forEach((log, i) => {
    console.log(`${i + 1}. ${log}`);
  });

  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach((err, i) => {
    console.log(`${i + 1}. ${err}`);
  });

  // Take screenshot
  await authenticatedPage.screenshot({ path: 'debug-auth-studio.png', fullPage: true });
  console.log('\n📸 Screenshot saved to debug-auth-studio.png');
});
