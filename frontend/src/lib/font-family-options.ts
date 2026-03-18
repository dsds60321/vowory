export type FontFamilyOption = {
  value: string;
  label: string;
};

export const DEFAULT_FONT_FAMILY = "'Noto Sans KR', sans-serif";
export const SERIF_FONT_FAMILY = "'Noto Serif KR', serif";

export const EDITOR_FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  { value: DEFAULT_FONT_FAMILY, label: "기본 폰트 (Noto Sans KR)" },
  { value: "'Pretendard', 'Noto Sans KR', sans-serif", label: "Pretendard" },
  { value: SERIF_FONT_FAMILY, label: "Noto Serif KR" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'NostalgicPoliceVibe', 'Pretendard', 'Noto Sans KR', sans-serif", label: "Nostalgic Police Vibe" },
  { value: "'Ria', 'Pretendard', 'Noto Sans KR', sans-serif", label: "Ria" },
  { value: "'KblJumpExtended', 'Pretendard', 'Noto Sans KR', sans-serif", label: "KBL Jump Extended" },
];

export function normalizeFontFamilyValue(rawValue?: string | null, fallback: string = DEFAULT_FONT_FAMILY): string {
  const normalized = rawValue?.trim();
  if (!normalized) return fallback;
  if (normalized === "'serif-kr', serif") return SERIF_FONT_FAMILY;
  return normalized;
}
