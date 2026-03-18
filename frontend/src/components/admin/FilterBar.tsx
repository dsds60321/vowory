import { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
  onSearch?: () => void;
  onReset?: () => void;
  searchLabel?: string;
  resetLabel?: string;
};

export default function FilterBar({ children, onSearch, onReset, searchLabel = "검색", resetLabel = "초기화" }: FilterBarProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-warm bg-white p-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="flex items-center justify-end gap-2">
        {onReset ? (
          <button
            className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
            type="button"
            onClick={onReset}
          >
            {resetLabel}
          </button>
        ) : null}
        {onSearch ? (
          <button className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white" type="button" onClick={onSearch}>
            {searchLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
