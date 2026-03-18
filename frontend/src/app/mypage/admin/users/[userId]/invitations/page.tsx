"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchAuthMe } from "@/lib/auth";
import LandingTopHeader from "@/components/LandingTopHeader";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import FilterBar from "@/components/admin/FilterBar";
import StatusBadge from "@/components/admin/StatusBadge";
import { ToastViewport, useToast } from "@/components/admin/Toast";
import type { AdminUserInvitationSummary } from "@/types/invitation";
import type { PagedResponse } from "@/types/notice";

type PublishFilter = "ALL" | "PUBLISHED" | "UNPUBLISHED";

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

function parsePage(raw: string | null): number {
  const parsed = Number(raw ?? "0");
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function AdminUserInvitationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { toasts, pushToast, removeToast } = useToast();

  const userId = decodeURIComponent(params.userId ?? "");
  const userName = searchParams.get("name") ?? "";

  const [authReady, setAuthReady] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("ALL");
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState<PagedResponse<AdminUserInvitationSummary> | null>(null);
  const [loading, setLoading] = useState(true);

  const visibleRows = useMemo(() => {
    const rows = payload?.content ?? [];
    const normalizedKeyword = keyword.trim().toLowerCase();

    return rows.filter((row) => {
      if (publishFilter === "PUBLISHED" && !row.isPublished) return false;
      if (publishFilter === "UNPUBLISHED" && row.isPublished) return false;

      if (!normalizedKeyword) return true;

      const candidate = `${row.invitationId} ${row.slug ?? ""}`.toLowerCase();
      return candidate.includes(normalizedKeyword);
    });
  }, [payload, keyword, publishFilter]);

  const summary = useMemo(() => {
    const publishedCount = visibleRows.filter((row) => row.isPublished).length;
    return {
      total: payload?.totalElements ?? 0,
      published: publishedCount,
      unpublished: Math.max(visibleRows.length - publishedCount, 0),
    };
  }, [payload, visibleRows]);

  const syncUrl = (next: { q: string; publish: PublishFilter; page: number }) => {
    const params = new URLSearchParams();

    if (next.q) params.set("q", next.q);
    if (next.publish !== "ALL") params.set("publish", next.publish);
    if (next.page > 0) params.set("page", String(next.page));
    if (userName) params.set("name", userName);

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const applyFilters = (next: Partial<{ q: string; publish: PublishFilter; page: number }> = {}) => {
    const applied = {
      q: (next.q ?? keyword).trim(),
      publish: next.publish ?? publishFilter,
      page: next.page ?? page,
    };

    setKeyword(applied.q);
    setPublishFilter(applied.publish);
    setPage(applied.page);
    syncUrl(applied);
  };

  useEffect(() => {
    const guard = async () => {
      const me = await fetchAuthMe();
      if (!me.loggedIn) {
        router.replace("/login");
        return;
      }
      if (!me.isAdmin) {
        router.replace("/mypage");
        return;
      }
      setAuthReady(true);
    };

    void guard();
  }, [router]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const publish = (searchParams.get("publish") as PublishFilter | null) ?? "ALL";
    const nextPage = parsePage(searchParams.get("page"));

    setKeywordInput(q);
    setKeyword(q);
    setPublishFilter(publish === "PUBLISHED" || publish === "UNPUBLISHED" ? publish : "ALL");
    setPage(nextPage);
  }, [searchParams]);

  useEffect(() => {
    if (!authReady || !userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<PagedResponse<AdminUserInvitationSummary>>(
          `/api/admin/users/${encodeURIComponent(userId)}/invitations?page=${page}&size=20`,
          { cache: "no-store" },
        );
        setPayload(data);
      } catch {
        setPayload(null);
        pushToast("사용자 청첩장 목록을 불러오지 못했습니다.", "error");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authReady, userId, page, pushToast]);

  return (
    <div className="min-h-screen bg-theme">
      <LandingTopHeader />

      <main className="px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-5">
          <nav className="text-xs text-theme-secondary">
            <Link className="hover:underline" href="/mypage?menu=adminUsers">
              사용자 목록
            </Link>
            <span className="mx-2">&gt;</span>
            <span>
              사용자: {userName || "-"} ({userId || "-"})
            </span>
          </nav>

          <AdminPageHeader
            title="관리자 | 사용자 청첩장"
            description="사용자별 청첩장 발행 현황을 확인하고, 미리보기/관리 화면으로 이동할 수 있습니다."
            actions={
              <Link className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-white" href="/mypage?menu=adminUsers">
                사용자 목록
              </Link>
            }
          />

          <FilterBar
            onSearch={() => applyFilters({ q: keywordInput, page: 0 })}
            onReset={() => {
              setKeywordInput("");
              applyFilters({ q: "", publish: "ALL", page: 0 });
            }}
          >
            <input
              className="h-10 w-full rounded-xl border border-warm px-3 text-sm outline-none"
              placeholder="ID/slug 검색"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters({ q: keywordInput, page: 0 });
                }
              }}
            />

            <select
              className="h-10 w-full rounded-xl border border-warm px-3 text-sm outline-none"
              value={publishFilter}
              onChange={(event) => applyFilters({ q: keywordInput, publish: event.target.value as PublishFilter, page: 0 })}
            >
              <option value="ALL">발행 상태 전체</option>
              <option value="PUBLISHED">발행</option>
              <option value="UNPUBLISHED">미발행</option>
            </select>

            <div className="h-10" />
            <div className="h-10" />
          </FilterBar>

          <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-warm bg-white p-4">
              <p className="text-xs text-theme-secondary">총 청첩장</p>
              <p className="mt-1 text-2xl font-bold text-theme-brand">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-warm bg-white p-4">
              <p className="text-xs text-theme-secondary">발행</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{summary.published}</p>
            </div>
            <div className="rounded-2xl border border-warm bg-white p-4">
              <p className="text-xs text-theme-secondary">미발행</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{summary.unpublished}</p>
            </div>
          </section>

          <div className="overflow-x-auto rounded-2xl border border-warm bg-white">
            {loading ? <p className="px-6 py-8 text-sm text-theme-secondary">불러오는 중...</p> : null}
            {!loading && !visibleRows.length ? <p className="px-6 py-8 text-sm text-theme-secondary">청첩장이 없습니다.</p> : null}

            {!loading && visibleRows.length ? (
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-theme text-xs text-theme-secondary">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="hidden px-4 py-3 md:table-cell">생성일</th>
                    <th className="px-4 py-3">발행 여부</th>
                    <th className="px-4 py-3">발행일시</th>
                    <th className="hidden px-4 py-3 md:table-cell">워터마크</th>
                    <th className="px-4 py-3 text-right">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm">
                  {visibleRows.map((row) => (
                    <tr key={row.invitationId}>
                      <td className="px-4 py-3 font-medium text-theme-brand">{row.invitationId}</td>
                      <td className="px-4 py-3">{row.slug ?? "-"}</td>
                      <td className="hidden px-4 py-3 md:table-cell">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge label={row.isPublished ? "발행" : "미발행"} tone={row.isPublished ? "success" : "neutral"} />
                      </td>
                      <td className="px-4 py-3">{row.publishedAt ? formatDate(row.publishedAt) : "-"}</td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {row.watermarkEnabledSnapshot == null ? "-" : <StatusBadge label={row.watermarkEnabledSnapshot ? "워터마크 ON" : "워터마크 OFF"} tone={row.watermarkEnabledSnapshot ? "warning" : "neutral"} />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {row.isPublished ? (
                            <Link
                              className="rounded-lg border border-warm px-3 py-1.5 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
                              href={`/invitation/${row.invitationId}`}
                              target="_blank"
                            >
                              미리보기
                            </Link>
                          ) : (
                            <button className="rounded-lg border border-warm px-3 py-1.5 text-xs font-bold text-theme-secondary opacity-40" type="button" disabled>
                              미리보기
                            </button>
                          )}
                          <Link
                            className="rounded-lg border border-warm px-3 py-1.5 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
                            href={`/editor?id=${row.invitationId}`}
                          >
                            관리
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          {payload ? (
            <div className="flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary disabled:opacity-50"
                type="button"
                disabled={payload.page <= 0}
                onClick={() => applyFilters({ q: keywordInput, page: Math.max(page - 1, 0) })}
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
                onClick={() => applyFilters({ q: keywordInput, page: page + 1 })}
              >
                다음
              </button>
            </div>
          ) : null}
        </div>
      </main>

      <ToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default function AdminUserInvitationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-theme px-6 py-10 text-sm text-theme-secondary">페이지 로딩 중...</div>}>
      <AdminUserInvitationsPageContent />
    </Suspense>
  );
}
