const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://vowory.com";

function normalizeBaseOrigin(baseUrl: string): string {
  const trimmedBase = baseUrl.trim();
  if (!trimmedBase) return "";

  try {
    return new URL(trimmedBase).origin;
  } catch {
    return trimmedBase.replace(/\/+$/, "");
  }
}

export function resolveAssetUrl(url?: string | null, baseUrl?: string): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const resolvedBase = normalizeBaseOrigin(baseUrl ?? DEFAULT_API_BASE_URL);
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${resolvedBase}${normalizedPath}`;
}
