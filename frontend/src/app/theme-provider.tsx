"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, normalizeTheme, type ThemeKey } from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeKey;
  setTheme: (nextTheme: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

declare global {
  interface Window {
    __WEDDING_THEME__?: string;
  }
}

function applyTheme(theme: ThemeKey): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function resolveInitialTheme(): ThemeKey {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  // 우선순위: 백엔드 주입(window 전역) -> 서버 렌더 속성(data-theme) -> 기본 테마
  const fromBackend = window.__WEDDING_THEME__;
  const fromServerAttr = document.documentElement.getAttribute("data-theme");

  return normalizeTheme(fromBackend ?? fromServerAttr);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 현재는 사용자 선택 UI를 노출하지 않고, 추후 백엔드 응답 시 코드에서 호출 가능하게 유지
  const setTheme = useCallback((nextTheme: string) => {
    const normalizedTheme = normalizeTheme(nextTheme);
    setThemeState(normalizedTheme);
    applyTheme(normalizedTheme);
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
