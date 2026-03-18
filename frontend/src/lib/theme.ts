export type ThemeKey = string;

export const DEFAULT_THEME: ThemeKey = "gh";

const THEME_KEY_REGEX = /^[a-z0-9-]{2,40}$/;

export function normalizeTheme(value?: string | null): ThemeKey {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_THEME;
  if (!THEME_KEY_REGEX.test(normalized)) return DEFAULT_THEME;
  return normalized;
}
