import type { Page } from '@playwright/test';

/**
 * Hide Next.js development overlays and indicators in E2E tests
 * Uses MutationObserver to ensure overlays stay hidden even if dynamically added
 */
export async function hideNextDevOverlay(page: Page) {
  // Add CSS to hide Next.js portal and overlays
  await page.addStyleTag({
    content: `
      /* Hide Next.js dev indicators and overlays */
      nextjs-portal,
      #__next-build-watcher,
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [data-nextjs-toast],
      .__next-dev-overlay-framework,
      [data-nextjs-build-indicator],
      [data-nextjs-turbopack-indicator] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `,
  });

  // Add MutationObserver to ensure overlays stay hidden even if dynamically added
  await page.addInitScript(() => {
    const hideOverlays = () => {
      const selectors = [
        'nextjs-portal',
        '#__next-build-watcher',
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-dialog]',
        '[data-nextjs-toast]',
        '.__next-dev-overlay-framework',
        '[data-nextjs-build-indicator]',
        '[data-nextjs-turbopack-indicator]',
      ];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
          }
        });
      });
    };

    // Hide overlays immediately
    hideOverlays();

    // Watch for dynamically added overlays
    const observer = new MutationObserver(() => {
      hideOverlays();
    });

    // Start observing when DOM is ready
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        hideOverlays();
      });
    }
  });
}
