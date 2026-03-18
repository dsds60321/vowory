"use client";

import { ReactNode, useEffect } from "react";

type InvitationFullscreenModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  embedded?: boolean;
  bodyClassName?: string;
  closeLabel?: string;
  zIndexClassName?: string;
};

export default function InvitationFullscreenModal({
  open,
  title,
  onClose,
  children,
  embedded = false,
  bodyClassName = "",
  closeLabel = "모달 닫기",
  zIndexClassName = "z-[110]",
}: InvitationFullscreenModalProps) {
  useEffect(() => {
    if (!open || embedded) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open, embedded]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  return (
    <div className={`${embedded ? "absolute" : "fixed"} inset-0 ${zIndexClassName} ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button
        type="button"
        aria-label={`${title} 배경 닫기`}
        onClick={onClose}
        className={`absolute inset-0 bg-black/85 backdrop-blur-[3px] transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0"}`}
      />

      <div className={`invite-modal-panel absolute inset-0 flex flex-col transition-all duration-300 ease-out ${open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-warm bg-white px-4">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-theme-brand">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-secondary"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto px-5 pb-8 pt-3 ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}
