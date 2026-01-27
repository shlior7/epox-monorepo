/**
 * Utility helpers to build stable `data-testid` strings.
 * We use kebab-case to keep selectors predictable for the visual recorder.
 */
function normalizePart(part: string | number): string {
  return String(part)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildTestId(...parts: Array<string | number | false | null | undefined>): string {
  const tokens = parts
    .filter((part) => part !== undefined && part !== null && part !== false)
    .map((part) => normalizePart(part))
    .filter(Boolean);

  return tokens.join('-') || 'interactive-element';
}
