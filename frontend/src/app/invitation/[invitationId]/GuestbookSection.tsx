"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, getApiErrorMessage } from "@/lib/api";
import InvitationFullscreenModal from "./InvitationFullscreenModal";

type GuestbookSectionProps = {
  invitationId: string;
  slug: string;
  enabled: boolean;
  preview?: boolean;
  embedded?: boolean;
};

type GuestbookEntry = {
  id: number;
  name: string;
  content: string;
  createdAt: string;
};

function formatGuestbookDate(rawDate: string): string {
  if (!rawDate) return "";
  const normalized = rawDate.includes("T") ? rawDate : rawDate.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate.replace("T", " ").slice(0, 19);
  }
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const hour = `${parsed.getHours()}`.padStart(2, "0");
  const minute = `${parsed.getMinutes()}`.padStart(2, "0");
  const second = `${parsed.getSeconds()}`.padStart(2, "0");
  return `${year}.${month}.${day} ${hour}:${minute}:${second}`;
}

export default function GuestbookSection({ invitationId, slug, enabled, preview = false, embedded = false }: GuestbookSectionProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionEntryId, setActionEntryId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GuestbookEntry | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [form, setForm] = useState({ name: "", password: "", content: "" });

  const listEndpoint = preview
    ? `/api/invitations/${encodeURIComponent(invitationId)}/guestbook`
    : `/api/public/invitations/${encodeURIComponent(slug)}/guestbook`;

  const loadEntries = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const result = await apiFetch<GuestbookEntry[]>(listEndpoint, { cache: "no-store" });
      setEntries(result);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "방명록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [enabled, listEndpoint]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  if (!enabled) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const password = form.password.trim();
    const content = form.content.trim();
    if (!name || !password || !content) {
      setMessage("이름, 비밀번호, 내용을 모두 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await apiFetch<unknown>(listEndpoint, {
        method: "POST",
        body: JSON.stringify({ name, password, content }),
      });
      setForm({ name: "", password: "", content: "" });
      setMessage("방명록이 등록되었습니다.");
      await loadEntries();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "방명록 등록에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deletePassword.trim().length < 4) {
      setMessage("삭제 비밀번호를 4자 이상 입력해 주세요.");
      return;
    }

    setDeleting(true);
    setMessage("");
    try {
      await apiFetch<{ message: string }>(`/api/public/invitations/${encodeURIComponent(slug)}/guestbook/${deleteTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword.trim() }),
      });
      setDeleteTarget(null);
      setDeletePassword("");
      setActionEntryId(null);
      setMessage("방명록이 삭제되었습니다.");
      await loadEntries();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "방명록 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="py-12 px-8 bg-theme border-t border-warm" data-invite-reveal>
        <div className="text-center mb-8">
          <p className="serif-font text-xs tracking-widest text-theme-accent italic uppercase">Guestbook</p>
          <h3 className="mt-2 serif-kr text-lg font-semibold text-theme-brand">축하의 한마디</h3>
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-warm bg-white py-3 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
          onClick={() => setIsModalOpen(true)}
        >
          방명록 작성하기
        </button>

        <div className="space-y-4 mt-4">
          {loading ? <p className="text-center text-xs text-theme-secondary">방명록 불러오는 중...</p> : null}
          {!loading && entries.length === 0 ? (
            <div className="rounded-xl border border-warm bg-white p-4 text-center text-sm text-theme-secondary">첫 번째 축하 메시지를 남겨보세요.</div>
          ) : null}
          {entries.slice(0, 3).map((entry) => (
            <div className="rounded-xl border border-warm bg-white p-4 shadow-sm" key={`guestbook-${entry.id}`}>
              <p className="text-xs font-bold text-theme-brand">
                {entry.name}
                <span className="ml-2 font-normal text-theme-secondary opacity-70">{formatGuestbookDate(entry.createdAt)}</span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-theme-secondary">{entry.content}</p>
            </div>
          ))}
          {entries.length > 3 ? (
            <button
              type="button"
              className="w-full rounded-xl border border-warm bg-white py-3 text-xs font-bold text-theme-secondary"
              onClick={() => setIsModalOpen(true)}
            >
              방명록 더보기
            </button>
          ) : null}
        </div>
      </section>

      <InvitationFullscreenModal
        open={isModalOpen}
        embedded={embedded}
        title="방명록"
        onClose={() => {
          setIsModalOpen(false);
          setActionEntryId(null);
          setDeleteTarget(null);
          setDeletePassword("");
        }}
        closeLabel="방명록 닫기"
      >
        <div className="space-y-5">
          <form className="space-y-4 rounded-2xl border border-warm bg-white p-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-bold text-theme-secondary">이름</span>
                <input
                  className="input-premium"
                  value={form.name}
                  maxLength={30}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="작성자 이름"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-theme-secondary">비밀번호</span>
                <input
                  className="input-premium"
                  type="password"
                  value={form.password}
                  maxLength={30}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="삭제/수정용 비밀번호"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <span className="text-xs font-bold text-theme-secondary">내용</span>
              <textarea
                className="input-premium min-h-28"
                value={form.content}
                maxLength={1000}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="축하 메시지를 남겨주세요."
              />
            </label>
            {message ? <p className="rounded-lg bg-theme px-3 py-2 text-xs text-theme-secondary">{message}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-theme"
                onClick={() => setIsModalOpen(false)}
              >
                닫기
              </button>
              <button
                type="submit"
                className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                disabled={saving}
              >
                {saving ? "등록중..." : "등록하기"}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-theme-secondary">등록된 방명록</p>
              {!preview ? <p className="text-[11px] text-theme-secondary">작성자만 비밀번호로 삭제 가능</p> : null}
            </div>
            {loading ? <p className="text-xs text-theme-secondary">불러오는 중...</p> : null}
            {!loading && entries.length === 0 ? (
              <div className="rounded-xl border border-warm bg-white p-4 text-xs text-theme-secondary">등록된 방명록이 없습니다.</div>
            ) : null}
            {!loading && entries.length > 0 ? (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div className="rounded-xl border border-warm bg-white p-3" key={`modal-guestbook-${entry.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-theme-brand">
                          {entry.name}
                          <span className="ml-2 font-normal text-theme-secondary opacity-70">{formatGuestbookDate(entry.createdAt)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-theme-secondary">{entry.content}</p>
                      </div>

                      {!preview ? (
                        <div className="relative">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-warm bg-white text-theme-secondary"
                            onClick={() => setActionEntryId((prev) => (prev === entry.id ? null : entry.id))}
                            aria-label={`${entry.name} 방명록 메뉴`}
                          >
                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                          </button>
                          {actionEntryId === entry.id ? (
                            <div className="absolute right-0 top-9 z-10 min-w-[104px] rounded-lg border border-warm bg-white p-1 shadow-sm">
                              <button
                                type="button"
                                className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteTarget(entry);
                                  setDeletePassword("");
                                  setActionEntryId(null);
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                삭제
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {deleteTarget && !preview ? (
              <div className="mt-3 space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700">{deleteTarget.name}님의 방명록을 삭제하시겠습니까?</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none"
                  placeholder="등록한 비밀번호 입력"
                  maxLength={30}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-warm bg-white px-3 py-1.5 text-xs font-semibold text-theme-secondary"
                    onClick={() => {
                      setDeleteTarget(null);
                      setDeletePassword("");
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                  >
                    {deleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </InvitationFullscreenModal>
    </>
  );
}
