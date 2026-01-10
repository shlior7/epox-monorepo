import type { UrlObject } from 'url';

export function stringToUrlObject(href: string, base = 'http://_'): UrlObject {
  // Use a dummy base so relative paths parse too
  const u = new URL(href, base);

  // Collect query params (support repeated keys -> string[])
  const query: Record<string, string | string[]> = {};
  u.searchParams.forEach((value, key) => {
    if (key in query) {
      const prev = query[key];
      query[key] = Array.isArray(prev) ? [...prev, value] : [prev as string, value];
    } else {
      query[key] = value;
    }
  });

  return {
    pathname: u.pathname || undefined,
    query: Object.keys(query).length ? query : undefined,
    // Next expects hash without the leading '#'
    hash: u.hash ? u.hash.slice(1) : undefined,
  };
}
