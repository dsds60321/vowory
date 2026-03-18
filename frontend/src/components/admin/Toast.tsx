"use client";

import { useCallback, useMemo, useState } from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
};

const toneClassName: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2600);
  }, []);

  return useMemo(
    () => ({
      toasts,
      pushToast,
      removeToast,
    }),
    [toasts, pushToast, removeToast],
  );
}

type ToastViewportProps = {
  toasts: ToastMessage[];
  onClose: (id: number) => void;
};

export function ToastViewport({ toasts, onClose }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((item) => (
        <div key={item.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toneClassName[item.tone]}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="leading-5">{item.message}</p>
            <button className="text-xs opacity-70" type="button" onClick={() => onClose(item.id)}>
              닫기
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
