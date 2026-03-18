"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, getApiErrorMessage } from "@/lib/api";
import { fetchAuthMe } from "@/lib/auth";
import LandingTopHeader from "@/components/LandingTopHeader";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StickyFormFooter from "@/components/admin/StickyFormFooter";
import { ToastViewport, useToast } from "@/components/admin/Toast";
import type { NoticeDetail, NoticeStatus, NoticeUpsertRequest } from "@/types/notice";

type NoticeFormStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getDateRangeError(startAt: string, endAt: string): string | null {
  if (!startAt.trim() || !endAt.trim()) {
    return "노출기간(시작/종료일시)은 필수입니다.";
  }

  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "노출기간 형식이 올바르지 않습니다.";
  }

  if (start > end) {
    return "시작일시는 종료일시보다 늦을 수 없습니다.";
  }

  return null;
}

function toFormStatus(status: NoticeStatus, startAt: string): NoticeFormStatus {
  if (status === "DRAFT" || status === "HIDDEN") {
    return "DRAFT";
  }

  const start = new Date(startAt).getTime();
  if (!Number.isNaN(start) && start > Date.now()) {
    return "SCHEDULED";
  }

  return "PUBLISHED";
}

function mapStatusForApi(formStatus: NoticeFormStatus, asDraft: boolean): NoticeStatus {
  if (asDraft) return "DRAFT";
  if (formStatus === "DRAFT") return "DRAFT";
  return "PUBLISHED";
}

export default function AdminNoticeEditPage() {
  const router = useRouter();
  const params = useParams<{ noticeId: string }>();
  const noticeId = params.noticeId;
  const { toasts, pushToast, removeToast } = useToast();

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isBanner, setIsBanner] = useState(false);
  const [status, setStatus] = useState<NoticeFormStatus>("DRAFT");

  const dateRangeError = useMemo(() => getDateRangeError(startAt, endAt), [startAt, endAt]);

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
    if (!authReady || !noticeId) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<NoticeDetail>(`/api/admin/notices/${encodeURIComponent(noticeId)}`, {
          cache: "no-store",
        });

        const normalizedStartAt = toDateTimeLocal(data.startAt);
        const normalizedEndAt = toDateTimeLocal(data.endAt) || normalizedStartAt;

        setTitle(data.title ?? "");
        setContent(data.content ?? "");
        setStartAt(normalizedStartAt);
        setEndAt(normalizedEndAt);
        setIsBanner(Boolean(data.isBanner));
        setStatus(toFormStatus(data.status, normalizedStartAt));
      } catch {
        pushToast("공지사항을 찾을 수 없습니다.", "error");
        router.replace("/mypage?menu=adminNotices");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authReady, noticeId, router, pushToast]);

  const submitNotice = async (asDraft: boolean) => {
    if (!noticeId) return;

    if (dateRangeError) {
      pushToast(dateRangeError, "error");
      return;
    }

    setSaving(true);
    try {
      const payload: NoticeUpsertRequest = {
        title: title.trim(),
        content: content.trim(),
        startAt,
        endAt,
        isBanner,
        status: mapStatusForApi(status, asDraft),
      };

      await apiFetch<NoticeDetail>(`/api/admin/notices/${encodeURIComponent(noticeId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      pushToast("공지 수정이 완료되었습니다.", "success");
      window.setTimeout(() => {
        router.push("/mypage?menu=adminNotices");
      }, 350);
    } catch (error) {
      pushToast(getApiErrorMessage(error, "공지 수정에 실패했습니다."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitNotice(false);
  };

  return (
    <div className="min-h-screen bg-theme">
      <LandingTopHeader />

      {!authReady ? (
        <main className="px-6 py-10 text-sm text-theme-secondary">권한 확인 중...</main>
      ) : loading ? (
        <main className="px-6 py-10 text-sm text-theme-secondary">공지사항 불러오는 중...</main>
      ) : (
        <main className="px-6 py-10">
          <div className="mx-auto max-w-4xl space-y-5">
            <AdminPageHeader
              title="공지 수정"
              description="기존 공지 내용을 수정하고, 노출기간/상태를 다시 설정할 수 있습니다."
              actions={
                <Link className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-theme" href="/mypage?menu=adminNotices">
                  목록
                </Link>
              }
            />

            <form className="space-y-5 rounded-2xl border border-warm bg-white p-6 pb-24" onSubmit={handleSubmit}>
              <input
                className="h-11 w-full rounded-xl border border-warm px-3 text-sm outline-none"
                placeholder="제목"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />

              <textarea
                className="min-h-[220px] w-full rounded-xl border border-warm px-3 py-3 text-sm outline-none"
                placeholder="내용"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs font-bold text-theme-secondary">
                  시작일시
                  <input
                    className="h-11 w-full rounded-xl border border-warm px-3 text-sm font-normal outline-none"
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    required
                  />
                </label>

                <label className="space-y-2 text-xs font-bold text-theme-secondary">
                  종료일시
                  <input
                    className="h-11 w-full rounded-xl border border-warm px-3 text-sm font-normal outline-none"
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    required
                  />
                </label>
              </div>

              {dateRangeError ? <p className="text-sm font-medium text-rose-600">{dateRangeError}</p> : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-theme-secondary">
                    <input checked={isBanner} type="checkbox" onChange={(event) => setIsBanner(event.target.checked)} />
                    배너 공지 노출
                  </label>
                  <p className="text-xs text-theme-secondary">체크 시 메인 배너 영역에 &quot;제목&quot;으로 노출됩니다.</p>
                </div>

                <label className="space-y-2 text-xs font-bold text-theme-secondary">
                  상태
                  <select
                    className="h-11 w-full rounded-xl border border-warm px-3 text-sm font-normal outline-none"
                    value={status}
                    onChange={(event) => setStatus(event.target.value as NoticeFormStatus)}
                  >
                    <option value="DRAFT">DRAFT (초안/노출 안됨)</option>
                    <option value="SCHEDULED">SCHEDULED (예약/시작 시 자동 노출)</option>
                    <option value="PUBLISHED">PUBLISHED (즉시 발행)</option>
                  </select>
                </label>
              </div>

              <StickyFormFooter>
                <button
                  className="rounded-xl border border-warm px-5 py-3 text-sm font-bold text-theme-secondary"
                  type="button"
                  onClick={() => router.push("/mypage?menu=adminNotices")}
                >
                  취소
                </button>
                <button
                  className="rounded-xl border border-warm px-5 py-3 text-sm font-bold text-theme-secondary disabled:opacity-60"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void submitNotice(true);
                  }}
                >
                  임시저장
                </button>
                <button className="rounded-xl bg-theme-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" type="submit" disabled={saving}>
                  {saving ? "저장 중..." : "저장/발행"}
                </button>
              </StickyFormFooter>
            </form>
          </div>
        </main>
      )}

      <ToastViewport toasts={toasts} onClose={removeToast} />
    </div>
  );
}
