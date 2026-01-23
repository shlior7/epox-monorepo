/**
 * Multi-Selector Generator for Anton
 *
 * Generates 5-7 fallback selectors with increasing specificity:
 * 1. ID-based (highest priority)
 * 2. Unique data attributes
 * 3. Class-based with nth-child
 * 4. Full path with nth-child
 * 5. XPath
 * 6. Attribute combination
 * 7. Position-based (tree location)
 */

/**
 * Generate multiple fallback selectors for an element
 * Returns 5-7 selectors ordered from most specific to least specific
 */
export function generateMultipleSelectors(element: Element): string[] {
  const selectors: string[] = [];

  // 1. ID-based (highest priority)
  if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
    selectors.push(`#${CSS.escape(element.id)}`);
  }

  // 2. Unique data attributes (excluding test IDs)
  const dataAttrs = Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith('data-') && !attr.name.startsWith('data-testid') && attr.value)
    .map((attr) => `${element.tagName.toLowerCase()}[${attr.name}="${CSS.escape(attr.value)}"]`);

  if (dataAttrs.length > 0) {
    selectors.push(dataAttrs[0]);
  }

  // 3. Class-based with nth-child
  const classSelector = generateClassSelector(element);
  if (classSelector) {
    selectors.push(classSelector);
  }

  // 4. Full path with nth-child
  const fullPath = generateFullPath(element);
  if (fullPath) {
    selectors.push(fullPath);
  }

  // 5. XPath
  const xpath = getXPath(element);
  if (xpath) {
    selectors.push(xpath);
  }

  // 6. Attribute combination (name, type, class, etc.)
  const uniqueAttrs = getUniqueAttributes(element);
  if (uniqueAttrs) {
    selectors.push(uniqueAttrs);
  }

  // 7. Position-based (tree location)
  const positionSelector = generatePositionSelector(element);
  if (positionSelector) {
    selectors.push(positionSelector);
  }

  // Return max 7 unique selectors
  return Array.from(new Set(selectors)).slice(0, 7);
}

/**
 * Generate class-based selector with nth-child for uniqueness
 */
function generateClassSelector(element: Element): string | null {
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((cls) => cls && !/^(active|hover|focus|disabled)$/.test(cls)) // Exclude state classes
    .slice(0, 3); // Max 3 classes

  if (classes.length === 0) {
    return null;
  }

  const classSelector = `${tag}.${classes.join('.')}`;

  // Add nth-child if not unique
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((el) => el.matches(classSelector));
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1;
      return `${classSelector}:nth-child(${index})`;
    }
  }

  return classSelector;
}

/**
 * Generate full path from root to element
 */
function generateFullPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    // Add nth-child if element has siblings of same tag
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((el) => el.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;

    // Stop at body to avoid overly long selectors
    if (current?.tagName.toLowerCase() === 'body') {
      path.unshift('body');
      break;
    }
  }

  return path.join(' > ');
}

/**
 * Generate XPath for element
 */
function getXPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling: Element | null = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const segment = index > 1 ? `${tagName}[${index}]` : tagName;
    segments.unshift(segment);

    current = current.parentElement;

    // Stop at body
    if (current?.tagName.toLowerCase() === 'body') {
      segments.unshift('body');
      break;
    }
  }

  return '//' + segments.join('/');
}

/**
 * Get unique attributes selector
 */
function getUniqueAttributes(element: Element): string | null {
  const tag = element.tagName.toLowerCase();
  const attrs: string[] = [];

  // Collect useful attributes
  const attrNames = ['name', 'type', 'role', 'aria-label', 'href', 'src'];

  for (const attrName of attrNames) {
    const value = element.getAttribute(attrName);
    if (value) {
      attrs.push(`[${attrName}="${CSS.escape(value)}"]`);
    }
  }

  if (attrs.length === 0) {
    return null;
  }

  return `${tag}${attrs.join('')}`;
}

/**
 * Generate position-based selector (tree location)
 */
function generatePositionSelector(element: Element): string {
  const positions: number[] = [];
  let current: Element | null = element;

  while (current && current.parentElement) {
    const siblings = Array.from(current.parentElement.children);
    const index = siblings.indexOf(current);
    positions.unshift(index);
    current = current.parentElement;

    // Stop at body
    if (current.tagName.toLowerCase() === 'body') {
      break;
    }
  }

  return `position(${positions.join(',')})`;
}

/**
 * Test if a selector matches the element
 */
export function testSelector(element: Element, selector: string): boolean {
  try {
    // Handle position-based selectors
    if (selector.startsWith('position(')) {
      const positions = selector
        .slice(9, -1)
        .split(',')
        .map((n) => parseInt(n, 10));

      let current: Element | null = element;
      for (let i = positions.length - 1; i >= 0; i--) {
        if (!current || !current.parentElement) {
          return false;
        }
        const siblings = Array.from(current.parentElement.children);
        if (siblings[positions[i]] !== current) {
          return false;
        }
        current = current.parentElement;
      }

      return true;
    }

    // Handle XPath
    if (selector.startsWith('//')) {
      const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue === element;
    }

    // Regular CSS selector
    return element.matches(selector);
  } catch {
    return false;
  }
}

/**
 * Get element by selector with validation
 */
export function getElementBySelector(selector: string): Element | null {
  try {
    // Handle position-based selectors
    if (selector.startsWith('position(')) {
      const positions = selector
        .slice(9, -1)
        .split(',')
        .map((n) => parseInt(n, 10));

      let current: Element | null = document.body;
      for (const pos of positions) {
        if (!current) {
          return null;
        }
        const children = Array.from(current.children);
        current = children[pos] || null;
      }

      return current;
    }

    // Handle XPath
    if (selector.startsWith('//')) {
      const result = document.evaluate(selector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue as Element | null;
    }

    // Regular CSS selector
    return document.querySelector(selector);
  } catch {
    return null;
  }
}
