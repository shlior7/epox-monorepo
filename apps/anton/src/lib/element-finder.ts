/**
 * Element Finder with Fallback Logic
 *
 * Tries to find elements using multiple strategies:
 * 1. Try selectors bottom-up (most specific last)
 * 2. Fallback to screen location if selectors fail
 */

import { getElementBySelector } from './selector-generator';

export interface FindElementOptions {
  selectors: string[];
  fallbackLocation?: {
    x: number; // Viewport percentage (0-100)
    y: number; // Viewport percentage (0-100)
  };
}

export interface FindElementResult {
  element: Element | null;
  matchedSelector: string | null;
  usedFallback: boolean;
  warnings: string[];
}

/**
 * Find element with fallback logic
 *
 * Tries selectors from most specific to least specific.
 * If all selectors fail, falls back to screen location.
 */
export function findElementWithFallback(options: FindElementOptions): FindElementResult {
  const { selectors, fallbackLocation } = options;
  const warnings: string[] = [];

  // Try each selector from bottom up (most specific last)
  for (let i = selectors.length - 1; i >= 0; i--) {
    const selector = selectors[i];
    const element = getElementBySelector(selector);

    if (element) {
      // Found element!
      if (i < selectors.length - 1) {
        warnings.push(`Element found using fallback selector #${i + 1}: "${selector}"`);
      }

      return {
        element,
        matchedSelector: selector,
        usedFallback: false,
        warnings,
      };
    }
  }

  // All selectors failed - try location fallback
  if (fallbackLocation) {
    const element = findElementAtLocation(fallbackLocation.x, fallbackLocation.y);

    if (element) {
      warnings.push('⚠️ Element found by location fallback (selectors failed)');

      return {
        element,
        matchedSelector: null,
        usedFallback: true,
        warnings,
      };
    }
  }

  // Nothing found
  warnings.push('❌ Element not found - all selectors and location fallback failed');

  return {
    element: null,
    matchedSelector: null,
    usedFallback: false,
    warnings,
  };
}

/**
 * Find element at screen location (viewport percentage)
 */
export function findElementAtLocation(xPercent: number, yPercent: number): Element | null {
  // Convert viewport percentage to pixels
  const x = (xPercent / 100) * window.innerWidth;
  const y = (yPercent / 100) * window.innerHeight;

  // Get element at point
  const element = document.elementFromPoint(x, y);

  // Ignore body and html elements (too generic)
  if (element && element.tagName.toLowerCase() !== 'body' && element.tagName.toLowerCase() !== 'html') {
    return element;
  }

  return null;
}

/**
 * Calculate viewport percentage from pixel coordinates
 */
export function pixelsToViewportPercent(x: number, y: number): { x: number; y: number } {
  return {
    x: (x / window.innerWidth) * 100,
    y: (y / window.innerHeight) * 100,
  };
}

/**
 * Calculate pixel coordinates from viewport percentage
 */
export function viewportPercentToPixels(xPercent: number, yPercent: number): { x: number; y: number } {
  return {
    x: (xPercent / 100) * window.innerWidth,
    y: (yPercent / 100) * window.innerHeight,
  };
}

/**
 * Check if an element is still valid (in DOM and visible)
 */
export function isElementValid(element: Element): boolean {
  // Check if element is still in DOM
  if (!document.body.contains(element)) {
    return false;
  }

  // Check if element is visible (basic check)
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * Get element's current screen location as viewport percentage
 */
export function getElementLocation(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return pixelsToViewportPercent(centerX, centerY);
}

/**
 * Compare two locations and return distance as percentage
 */
export function calculateLocationDistance(loc1: { x: number; y: number }, loc2: { x: number; y: number }): number {
  const dx = loc1.x - loc2.x;
  const dy = loc1.y - loc2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find closest element to a target location
 * Useful when exact location doesn't match but we want to find nearby elements
 */
export function findClosestElementToLocation(
  targetX: number,
  targetY: number,
  tolerance: number = 10
): Element | null {
  const targetPixels = viewportPercentToPixels(targetX, targetY);

  // Get elements in a radius around the target
  const elements: Array<{ element: Element; distance: number }> = [];

  // Sample points in a grid around the target
  for (let dx = -tolerance; dx <= tolerance; dx += 5) {
    for (let dy = -tolerance; dy <= tolerance; dy += 5) {
      const x = targetPixels.x + dx;
      const y = targetPixels.y + dy;

      if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
        continue;
      }

      const element = document.elementFromPoint(x, y);
      if (element && element.tagName.toLowerCase() !== 'body' && element.tagName.toLowerCase() !== 'html') {
        const distance = Math.sqrt(dx * dx + dy * dy);
        elements.push({ element, distance });
      }
    }
  }

  // Return closest unique element
  if (elements.length === 0) {
    return null;
  }

  elements.sort((a, b) => a.distance - b.distance);
  return elements[0].element;
}
