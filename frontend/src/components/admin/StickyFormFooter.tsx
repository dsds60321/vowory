import { ReactNode } from "react";

type StickyFormFooterProps = {
  children: ReactNode;
};

export default function StickyFormFooter({ children }: StickyFormFooterProps) {
  return (
    <div className="sticky bottom-0 z-40 -mx-6 border-t border-warm bg-white/95 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">{children}</div>
    </div>
  );
}
