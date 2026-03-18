"use client";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-warm bg-white p-5 shadow-2xl">
        <h2 className="text-base font-bold text-theme-brand">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-theme-secondary">{description}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary" type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-xs font-bold text-white ${danger ? "bg-rose-500" : "bg-theme-brand"} disabled:opacity-60`}
            type="button"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
