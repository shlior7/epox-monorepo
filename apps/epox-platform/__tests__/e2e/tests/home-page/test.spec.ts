/**
 * Home Page Tests
 *
 * Tests the home page layout and components:
 * - Page header and title
 * - Sidebar navigation
 * - Visualization cards section
 *
 * Screenshots captured:
 * - home-header.png - Page header with title
 * - home-sidebar.png - Sidebar navigation
 * - home-visualization-cards.png - Main visualization cards section
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

test.describe('Home Page', () => {
  test('verify home page layout and capture screenshots', async ({
    authenticatedPage,
    clientId,
  }) => {
    const nav = createNavigationHelper(authenticatedPage, clientId);
    const errors = await nav.captureErrors();

    // Navigate to home
    await authenticatedPage.goto('/home');
    await authenticatedPage.waitForLoadState('networkidle');

    console.log('\n=== HOME PAGE VERIFICATION ===\n');

    // ==========================================
    // PHASE 1: DOM State Extraction
    // ==========================================
    const pageState = await authenticatedPage.evaluate(() => {
      return {
        url: window.location.href,
        pageTitle: document.querySelector('h1')?.textContent?.trim(),

        // Visualization cards section
        visualizationSection: {
          heading: document.querySelector('h2')?.textContent?.trim(),
          cards: Array.from(document.querySelectorAll('a[href="/studio"]')).map((card) => ({
            title: card.querySelector('h3')?.textContent?.trim(),
            hasIcon: !!card.querySelector('svg'),
          })),
        },

        // Sidebar navigation
        sidebar: {
          homeLink: !!document.querySelector('nav a[href="/home"]'),
          studioLink: !!document.querySelector('nav a[href="/studio"]'),
          navItems: Array.from(document.querySelectorAll('nav a')).map((a) => ({
            text: a.textContent?.trim(),
            href: a.getAttribute('href'),
          })),
        },
      };
    });

    console.log('Page Title:', pageState.pageTitle);
    console.log(
      'Visualization Cards:',
      pageState.visualizationSection.cards.map((c) => c.title)
    );
    console.log(
      'Sidebar Nav:',
      pageState.sidebar.navItems.map((n) => n.text).filter(Boolean)
    );
    console.log('Console Errors:', errors.consoleErrors.length > 0 ? errors.consoleErrors : 'None');

    // Assertions
    expect(pageState.pageTitle).toBe('Home');
    expect(pageState.visualizationSection.cards.length).toBeGreaterThanOrEqual(4);
    expect(pageState.sidebar.homeLink).toBe(true);
    expect(errors.consoleErrors).toHaveLength(0);

    // ==========================================
    // PHASE 2: Screenshots
    // ==========================================
    console.log('\n=== CAPTURING SCREENSHOTS ===\n');

    // Screenshot 1: Visualization cards section
    const vizSection = authenticatedPage.locator('main section').first();
    if (await vizSection.isVisible()) {
      await vizSection.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'home-visualization-cards.png'),
      });
      console.log('Saved: home-visualization-cards.png');
    }

    // Screenshot 2: Sidebar navigation
    const sidebar = authenticatedPage.locator('aside, nav').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'home-sidebar.png'),
      });
      console.log('Saved: home-sidebar.png');
    }

    // Screenshot 3: Full page header area
    const header = authenticatedPage.locator('header, [class*="header"]').first();
    if (await header.isVisible()) {
      await header.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'home-header.png'),
      });
      console.log('Saved: home-header.png');
    }

    console.log('\nHome page verification complete!\n');
  });

  test('verify sidebar navigation across pages', async ({ authenticatedPage, clientId }) => {
    const pages = [
      { path: '/home', name: 'Home' },
      { path: '/studio', name: 'Studio' },
      { path: '/collections', name: 'Collections' },
      { path: '/products', name: 'Products' },
    ];

    console.log('\n=== SIDEBAR NAVIGATION VERIFICATION ===\n');

    for (const pg of pages) {
      await authenticatedPage.goto(pg.path);
      await authenticatedPage.waitForLoadState('networkidle');

      const sidebarState = await authenticatedPage.evaluate((pageName) => {
        const sidebar =
          document.querySelector('aside') || document.querySelector('nav[class*="sidebar"]');
        const navLinks = sidebar
          ? Array.from(sidebar.querySelectorAll('a')).map((a) => ({
              text: a.textContent?.trim(),
              href: a.getAttribute('href'),
              isActive:
                a.classList.contains('active') || a.getAttribute('aria-current') === 'page',
            }))
          : [];

        return {
          hasSidebar: !!sidebar,
          navLinks,
          activeLink:
            navLinks.find((l) => l.isActive)?.text ||
            navLinks.find((l) => l.href?.includes(pageName.toLowerCase()))?.text,
        };
      }, pg.name);

      console.log(`${pg.name} (${pg.path}):`);
      console.log(`  Sidebar: ${sidebarState.hasSidebar ? 'Present' : 'Missing'}`);
      console.log(`  Active: ${sidebarState.activeLink || 'none'}`);
    }

    // Take final screenshot of sidebar
    await authenticatedPage.goto('/home');
    await authenticatedPage.waitForLoadState('networkidle');

    const sidebar = authenticatedPage.locator('aside, nav[class*="sidebar"]').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'sidebar-navigation.png'),
      });
      console.log('\nSaved: sidebar-navigation.png');
    }

    console.log('\nNavigation verification complete!\n');
  });
});
