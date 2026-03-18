export function sanitizeRichTextHtml(input: string): string {
  if (!input) return "";

  // 1) 위험 태그 제거
  let sanitized = input.replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");

  // 2) on* 이벤트 핸들러 제거
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // 3) javascript: 스킴 제거
  sanitized = sanitized.replace(/javascript\s*:/gi, "");

  return sanitized;
}
