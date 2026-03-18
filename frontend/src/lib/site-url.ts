const DEFAULT_SITE_URL = "https://vowory.com";

export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
  const normalized = raw.trim();
  if (!normalized) return DEFAULT_SITE_URL;

  try {
    return new URL(normalized).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function joinSiteUrl(pathname: string): string {
  const origin = getSiteOrigin();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${normalizedPath}`;
}

