"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import LandingTopHeader from "@/components/LandingTopHeader";
import type { NoticeDetail } from "@/types/notice";

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

export default function NoticeDetailPage() {
  const params = useParams<{ noticeId: string }>();
  const noticeId = params.noticeId;

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!noticeId) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        const data = await apiFetch<NoticeDetail>(`/api/public/notices/${encodeURIComponent(noticeId)}`, {
          cache: "no-store",
        });
        setNotice(data);
      } catch {
        setNotice(null);
        setErrorMessage("공지사항을 찾을 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [noticeId]);

  return (
    <div className="min-h-screen bg-theme">
      <LandingTopHeader />

      <main className="px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl border border-warm bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-[0.15em] text-theme-accent uppercase">Notice</p>
            <Link className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-theme" href="/notices">
              목록으로
            </Link>
          </div>

          {loading ? <p className="mt-8 text-sm text-theme-secondary">불러오는 중...</p> : null}
          {errorMessage ? <p className="mt-8 text-sm text-red-500">{errorMessage}</p> : null}

          {!loading && !errorMessage && notice ? (
            <article className="mt-5">
              <h1 className="text-2xl font-semibold text-theme-brand">{notice.title}</h1>
              <p className="mt-3 text-xs text-theme-secondary">
                노출 기간: {formatDate(notice.startAt)} ~ {notice.endAt ? formatDate(notice.endAt) : "상시"}
              </p>
              <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-theme-primary">{notice.content}</div>
            </article>
          ) : null}
        </div>
      </main>
    </div>
  );
}
