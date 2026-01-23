export type TestIdPart = string | number | undefined | null | false;

export function buildTestId(...parts: TestIdPart[]): string | undefined {
  const filtered = parts
    .filter((part) => part !== undefined && part !== null && part !== false)
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0);

  if (filtered.length === 0) {
    return undefined;
  }

  return filtered.join('--');
}
