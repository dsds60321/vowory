"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type EditorToastType = "success" | "error";

export type EditorToastMessage = {
  message: string;
  type: EditorToastType;
};

const DEFAULT_TOAST_DURATION_MS = 3000;

export function useEditorToast(durationMs: number = DEFAULT_TOAST_DURATION_MS) {
  const [toast, setToast] = useState<EditorToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: EditorToastType = "success") => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setToast({ message, type });
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setToast(null);
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      toast,
      showToast,
      clearToast,
    }),
    [toast, showToast, clearToast],
  );
}

type EditorToastProps = {
  toast: EditorToastMessage | null;
};

export default function EditorToast({ toast }: EditorToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-10 left-1/2 z-[200] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`flex items-center gap-3 rounded-full px-6 py-3 text-white shadow-2xl ${toast.type === "success" ? "bg-theme-brand" : "bg-red-500"}`}>
        <span className="material-symbols-outlined text-[20px]">{toast.type === "success" ? "check_circle" : "error"}</span>
        <span className="text-sm font-bold">{toast.message}</span>
      </div>
    </div>
  );
}
