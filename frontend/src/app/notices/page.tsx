"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { NoticeSummary, PagedResponse } from "@/types/notice";
import LandingTopHeader from "@/components/LandingTopHeader";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NoticeListPage() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<PagedResponse<NoticeSummary> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await apiFetch<PagedResponse<NoticeSummary>>(`/api/public/notices?page=${page}&size=10`, {
          cache: "no-store",
        });
        setPayload(data);
      } catch {
        setErrorMessage("공지사항을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page]);

  return (
    <div className="min-h-screen bg-theme">
      <LandingTopHeader />

      <main className="px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex items-end justify-between">
            <h1 className="serif-font text-3xl text-theme-brand">공지사항</h1>
            <Link className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-white" href="/">
              홈으로
            </Link>
          </div>

          {loading ? <p className="text-sm text-theme-secondary">불러오는 중...</p> : null}
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

          {!loading && !errorMessage ? (
            <div className="overflow-hidden rounded-2xl border border-warm bg-white">
              {payload?.content.length ? (
                <ul className="divide-y divide-warm">
                  {payload.content.map((notice) => (
                    <li key={notice.id}>
                      <Link className="block px-6 py-5 hover:bg-theme" href={`/notices/${notice.id}`}>
                        <p className="text-base font-semibold text-theme-brand">{notice.title}</p>
                        <p className="mt-2 text-xs text-theme-secondary">
                          노출 기간: {formatDate(notice.startAt)} ~ {notice.endAt ? formatDate(notice.endAt) : "상시"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-10 text-center text-sm text-theme-secondary">현재 노출 중인 공지사항이 없습니다.</p>
              )}
            </div>
          ) : null}

          {payload ? (
            <div className="flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                type="button"
                disabled={payload.page <= 0}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              >
                이전
              </button>
              <span className="text-xs text-theme-secondary">
                {payload.page + 1} / {Math.max(payload.totalPages, 1)}
              </span>
              <button
                className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                type="button"
                disabled={payload.last}
                onClick={() => setPage((prev) => prev + 1)}
              >
                다음
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
