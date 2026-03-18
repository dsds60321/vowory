"use client";

import { useEffect, useState } from "react";

type CopyTextButtonProps = {
  text: string;
  className?: string;
  defaultLabel?: string;
  successLabel?: string;
};

const DEFAULT_BUTTON_CLASS = "border-b border-[var(--theme-accent)] text-[10px] font-bold text-theme-accent";

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error("Copy failed.");
  }
}

export default function CopyTextButton({
  text,
  className = DEFAULT_BUTTON_CLASS,
  defaultLabel = "복사하기",
  successLabel = "복사됨",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      className={className}
      type="button"
      onClick={async () => {
        if (!text.trim()) return;
        try {
          await copyText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? successLabel : defaultLabel}
    </button>
  );
}
