"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getApiErrorMessage } from "@/lib/api";
import InvitationFullscreenModal from "./InvitationFullscreenModal";

type RsvpEntryModalProps = {
  invitationId: string;
  slug: string;
  enabled: boolean;
  preview?: boolean;
  embedded?: boolean;
  groomName?: string;
  brideName?: string;
  weddingDateText: string;
  venueName: string;
  venueAddress: string;
  autoOpenOnFirstLoad?: boolean;
  rsvpTitle?: string;
  rsvpMessage?: string;
  rsvpButtonText?: string;
  rsvpFontFamily?: string;
};

type RsvpFormState = {
  name: string;
  password: string;
  contact: string;
  attending: boolean;
  side: "groom" | "bride";
  partyCount: string;
  meal: "none" | "yes" | "no";
  bus: "none" | "yes" | "no";
  note: string;
  consent: boolean;
};

type RsvpEntry = {
  id: number;
  name: string;
  side: "groom" | "bride";
  attending: boolean;
  partyCount?: number | null;
  meal?: boolean | null;
  bus?: boolean | null;
  note?: string | null;
  createdAt: string;
};

const defaultForm: RsvpFormState = {
  name: "",
  password: "",
  contact: "",
  attending: true,
  side: "groom",
  partyCount: "",
  meal: "none",
  bus: "none",
  note: "",
  consent: false,
};

function formatDateText(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.replace("T", " ").slice(0, 16);
  return parsed.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sideLabel(side: "groom" | "bride"): string {
  return side === "bride" ? "신부측" : "신랑측";
}

function boolLabel(value: boolean | null | undefined, yes: string, no: string): string {
  if (value == null) return "미입력";
  return value ? yes : no;
}

export default function RsvpEntryModal({
  invitationId,
  slug,
  enabled,
  preview = false,
  embedded = false,
  groomName = "신랑",
  brideName = "신부",
  weddingDateText,
  venueName,
  venueAddress,
  autoOpenOnFirstLoad = false,
  rsvpTitle = "참석 여부 전달",
  rsvpMessage = "신랑, 신부에게 참석 여부를\n미리 전달할 수 있어요.",
  rsvpButtonText = "참석 여부 전달",
  rsvpFontFamily = "'Noto Sans KR', sans-serif",
}: RsvpEntryModalProps) {
  const storageKey = useMemo(() => {
    const base = slug?.trim() ? slug.trim() : invitationId;
    return `invite-rsvp-intro-hide-until:${base}`;
  }, [slug, invitationId]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIntroPromptOpen, setIsIntroPromptOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [entries, setEntries] = useState<RsvpEntry[]>([]);
  const [menuEntryId, setMenuEntryId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RsvpEntry | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [form, setForm] = useState<RsvpFormState>(defaultForm);

  const listEndpoint = useMemo(
    () =>
      preview
        ? `/api/invitations/${encodeURIComponent(invitationId)}/rsvps`
        : `/api/public/invitations/${encodeURIComponent(slug)}/rsvps`,
    [invitationId, preview, slug],
  );

  const submitEndpoint = useMemo(
    () =>
      preview
        ? `/api/invitations/${encodeURIComponent(invitationId)}/rsvps`
        : `/api/public/invitations/${encodeURIComponent(slug)}/rsvps`,
    [invitationId, preview, slug],
  );

  const loadEntries = useCallback(async () => {
    if (!enabled) return;
    setEntriesLoading(true);
    try {
      const result = await apiFetch<RsvpEntry[]>(listEndpoint, { cache: "no-store" });
      setEntries(result);
    } catch {
      // 공개 목록 로드 실패는 입력 UX를 막지 않음
    } finally {
      setEntriesLoading(false);
    }
  }, [enabled, listEndpoint]);

  useEffect(() => {
    if (!enabled || !isModalOpen) return;
    void loadEntries();
  }, [enabled, isModalOpen, loadEntries]);

  useEffect(() => {
    if (!enabled || !autoOpenOnFirstLoad || preview || embedded) return;
    if (typeof window === "undefined") return;

    const hiddenUntil = Number(window.localStorage.getItem(storageKey) ?? "0");
    if (Number.isFinite(hiddenUntil) && hiddenUntil > Date.now()) return;
    setIsIntroPromptOpen(true);
  }, [enabled, autoOpenOnFirstLoad, preview, embedded, storageKey]);

  useEffect(() => {
    if (!isIntroPromptOpen || embedded) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isIntroPromptOpen, embedded]);

  if (!enabled) return null;

  const openModal = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsIntroPromptOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting || deleteSubmitting) return;
    setIsModalOpen(false);
    setMenuEntryId(null);
    setDeleteTarget(null);
    setDeletePassword("");
  };

  const closeIntroPrompt = () => {
    setIsIntroPromptOpen(false);
  };

  const hideIntroPromptForToday = () => {
    if (typeof window !== "undefined") {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      window.localStorage.setItem(storageKey, String(tomorrow.getTime()));
    }
    setIsIntroPromptOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage("성함을 입력해 주세요.");
      return;
    }

    if (form.password.trim().length < 4) {
      setErrorMessage("비밀번호는 4자 이상 입력해 주세요.");
      return;
    }

    if (!form.consent) {
      setErrorMessage("개인정보 수집 및 이용에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const parsedPartyCount = form.partyCount.trim() ? Number(form.partyCount) : null;
      await apiFetch<{ message: string }>(submitEndpoint, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          password: form.password.trim(),
          contact: form.contact.trim() || null,
          attending: form.attending,
          side: form.side,
          partyCount: parsedPartyCount && parsedPartyCount > 0 ? parsedPartyCount : null,
          meal: form.meal === "none" ? null : form.meal === "yes",
          bus: form.bus === "none" ? null : form.bus === "yes",
          note: form.note.trim() || null,
        }),
      });

      setForm(defaultForm);
      setSuccessMessage("참석 여부가 전달되었습니다.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "참석 여부 전달에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deletePassword.trim().length < 4) {
      setErrorMessage("삭제 비밀번호를 4자 이상 입력해 주세요.");
      return;
    }

    const endpoint = `/api/public/invitations/${encodeURIComponent(slug)}/rsvps/${deleteTarget.id}`;

    setDeleteSubmitting(true);
    try {
      await apiFetch<{ message: string }>(endpoint, {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword.trim() }),
      });
      setDeleteTarget(null);
      setDeletePassword("");
      setMenuEntryId(null);
      setSuccessMessage("참석 여부가 삭제되었습니다.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "참석 여부 삭제에 실패했습니다."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <>
      <section className="bg-theme py-12 px-7 text-center" data-invite-reveal style={{ fontFamily: rsvpFontFamily }}>
        <div className="mx-auto max-w-[420px] space-y-8">
          <div className="space-y-4">
            <p className="serif-font text-[12px] tracking-[0.24em] text-theme-accent uppercase">참석여부 전달</p>
            <h3 className="serif-kr text-[24px] font-semibold text-theme-brand">{rsvpTitle}</h3>
            <p className="text-[0.92rem] leading-[1.6] text-theme-secondary whitespace-pre-wrap">{rsvpMessage}</p>
          </div>

          <button
            className="mx-auto inline-flex min-w-[210px] items-center justify-center gap-2 rounded-2xl border border-warm bg-white px-7 py-3 text-[16px] font-semibold text-theme-secondary shadow-sm transition-colors hover:bg-theme"
            type="button"
            onClick={openModal}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
              event_available
            </span>
            <span>{rsvpButtonText}</span>
          </button>

          {successMessage ? <p className="text-[12px] font-medium text-theme-brand">{successMessage}</p> : null}
        </div>
      </section>

      {isIntroPromptOpen ? (
        <div className="fixed inset-0 z-[108] flex h-dvh min-h-[100dvh] w-full items-center justify-center p-4">
          <button
            type="button"
            aria-label="참석여부 안내 닫기 배경"
            onClick={closeIntroPrompt}
            className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
          />
          <div className="relative w-[90%] max-w-[390px] overflow-hidden rounded-[18px] border border-warm bg-theme shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
            <button type="button" onClick={closeIntroPrompt} aria-label="참석여부 안내 닫기" className="absolute right-3 top-3 text-theme-secondary">
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <div className="px-7 pb-7 pt-12 text-center">
              <h3 className="serif-kr text-[28px] font-semibold text-theme-brand">{rsvpTitle}</h3>
              <p className="mt-4 whitespace-pre-wrap text-[0.93rem] leading-[1.6] text-theme-secondary">{rsvpMessage}</p>
              <div className="mt-6 rounded-2xl border border-warm/80 bg-white/55 px-4 py-4 text-left">
                <p className="text-sm font-semibold text-theme-secondary">♡ {groomName}, {brideName}</p>
                <p className="mt-1.5 text-[14px] text-theme-secondary">{weddingDateText}</p>
                <p className="mt-1 text-[14px] text-theme-secondary">{venueName}</p>
                <p className="mt-1 text-[13px] text-theme-secondary">{venueAddress}</p>
              </div>
              <button
                className="mt-6 w-full rounded-xl bg-theme-brand py-3.5 text-[16px] font-semibold text-white transition-opacity hover:opacity-90"
                type="button"
                onClick={openModal}
              >
                참석 여부 전달
              </button>
              <button
                className="mt-3 inline-flex items-center gap-1 text-[13px] text-theme-secondary/90 underline-offset-2 hover:underline"
                type="button"
                onClick={hideIntroPromptForToday}
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                오늘 하루 보지 않기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <InvitationFullscreenModal open={isModalOpen} embedded={embedded} title="참석 여부 전달" onClose={closeModal} closeLabel="참석 여부 모달 닫기">
        <form className="mx-auto max-w-[440px] space-y-6" onSubmit={handleSubmit}>
          <p className="px-1 text-center text-[13px] leading-relaxed text-[#8e9096]">원활한 예식 진행을 위해 참석 정보를 미리 알려주시면 감사하겠습니다.</p>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, attending: true }))}
              className={`rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                form.attending ? "border-[#3d4148] bg-white text-[#2f3136]" : "border-[#d7d9de] bg-[#f6f7f9] text-[#787b82]"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                  가능
                </span>
                {form.attending ? <span className="material-symbols-outlined text-[18px]">check_circle</span> : null}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, attending: false }))}
              className={`rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                !form.attending ? "border-[#3d4148] bg-white text-[#2f3136]" : "border-[#d7d9de] bg-[#f6f7f9] text-[#787b82]"
              }`}
            >
              <span className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">event_busy</span>
                  불가
                </span>
                {!form.attending ? <span className="material-symbols-outlined text-[18px]">check_circle</span> : null}
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#7a7d84]">성함</span>
              <input
                className="w-full border-0 border-b border-[#dfe0e4] bg-transparent pb-2 text-[14px] text-[#2f3136] outline-none placeholder:text-[#b5b7bc]"
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="성함을 입력해 주세요."
                value={form.name}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#7a7d84]">비밀번호</span>
              <input
                type="password"
                className="w-full rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136] outline-none placeholder:text-[#b5b7bc]"
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="삭제/수정용 비밀번호 (4자 이상)"
                value={form.password}
                maxLength={30}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#7a7d84]">연락처 (선택)</span>
              <input
                type="text"
                className="w-full rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136] outline-none placeholder:text-[#b5b7bc]"
                onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                placeholder="연락처를 입력해 주세요."
                value={form.contact}
                maxLength={40}
              />
            </label>

            <div className="pt-1 text-[14px] text-[#5b5e64]">
              <label className="mr-3 inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  className="h-4 w-4 accent-[#d987a5]"
                  checked={form.side === "groom"}
                  onChange={() => setForm((prev) => ({ ...prev, side: "groom" }))}
                />
                신랑측
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  className="h-4 w-4 accent-[#d987a5]"
                  checked={form.side === "bride"}
                  onChange={() => setForm((prev) => ({ ...prev, side: "bride" }))}
                />
                신부측
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[12px] font-semibold text-[#7a7d84]">참석 인원 (선택)</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136] outline-none"
                  value={form.partyCount}
                  onChange={(event) => setForm((prev) => ({ ...prev, partyCount: event.target.value }))}
                  placeholder="예: 2"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[12px] font-semibold text-[#7a7d84]">식사 여부 (선택)</span>
                <select
                  className="w-full rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136]"
                  value={form.meal}
                  onChange={(event) => setForm((prev) => ({ ...prev, meal: event.target.value as "none" | "yes" | "no" }))}
                >
                  <option value="none">선택 안함</option>
                  <option value="yes">예정</option>
                  <option value="no">안함</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[12px] font-semibold text-[#7a7d84]">버스 여부 (선택)</span>
                <select
                  className="w-full rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136]"
                  value={form.bus}
                  onChange={(event) => setForm((prev) => ({ ...prev, bus: event.target.value as "none" | "yes" | "no" }))}
                >
                  <option value="none">선택 안함</option>
                  <option value="yes">이용</option>
                  <option value="no">미이용</option>
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#7a7d84]">메시지 (선택)</span>
              <textarea
                className="w-full min-h-24 rounded-xl border border-[#dfe0e4] bg-white px-3 py-2 text-[14px] text-[#2f3136] outline-none placeholder:text-[#b5b7bc]"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                maxLength={300}
                placeholder="전달할 메시지를 남겨주세요."
              />
            </label>

            <div className="rounded-xl border border-[#dfe1e5] bg-[#f6f7f9] px-4 py-4">
              <label className="inline-flex items-center gap-2 text-[16px] font-semibold text-[#3d4046]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#d987a5]"
                  checked={form.consent}
                  onChange={(event) => setForm((prev) => ({ ...prev, consent: event.target.checked }))}
                />
                동의합니다.
              </label>
              <p className="mt-2 text-[13px] leading-relaxed text-[#7f8289]">
                참석여부 전달을 위한 개인정보 수집 및 이용에 동의해주세요.
                <br />
                항목: 성함, 연락처, 동행인 정보 · 보유기간: 청첩장 이용 종료 시 까지
              </p>
            </div>
          </div>

          {errorMessage ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{errorMessage}</p> : null}

          <div className="rounded-xl border border-[#d5d7dc] bg-white p-3 text-[12px] text-[#74777f]">
            <p>{weddingDateText}</p>
            <p className="mt-0.5">{venueName}</p>
            <p className="mt-0.5">{venueAddress}</p>
          </div>

          <button
            className="w-full rounded-xl border border-[#d5d7dc] bg-white py-3 text-[14px] font-semibold text-[#4b4f57] transition-colors disabled:opacity-50"
            disabled={submitting || !form.consent || !form.name.trim()}
            type="submit"
          >
            {submitting ? "전달 중..." : "신랑 & 신부에게 전달하기"}
          </button>
        </form>

        <section className="mx-auto mt-8 max-w-[440px] rounded-2xl border border-warm bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-theme-brand">등록된 참석 여부</h4>
            {!preview ? <p className="text-[11px] text-theme-secondary">작성자만 비밀번호로 삭제 가능</p> : null}
          </div>

          {entriesLoading ? <p className="py-6 text-center text-xs text-theme-secondary">불러오는 중...</p> : null}
          {!entriesLoading && entries.length === 0 ? <p className="py-6 text-center text-xs text-theme-secondary">아직 참석 응답이 없습니다.</p> : null}

          {!entriesLoading && entries.length > 0 ? (
            <div className="space-y-2.5">
              {entries.map((entry) => (
                <div key={`rsvp-row-${entry.id}`} className="rounded-xl border border-warm bg-theme/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-theme-brand">{entry.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className={`rounded-full border px-2 py-0.5 ${
                            entry.attending ? "border-[#f3c4d4] bg-[#ffeef4] text-[#b85f7e]" : "border-[#f0d4dc] bg-white text-[#b87792]"
                          }`}
                        >
                          {entry.attending ? "참석" : "미참석"}
                        </span>
                        <span className="rounded-full border border-[#f3c7d5] bg-[#fff4f7] px-2 py-0.5 text-[#b86888]">{sideLabel(entry.side)}</span>
                        <span className="rounded-full border border-[#f4d9e1] bg-white px-2 py-0.5 text-[#b88a98]">인원 {entry.partyCount ?? "-"}</span>
                        <span className="rounded-full border border-[#f2ccda] bg-[#fff3f7] px-2 py-0.5 text-[#b86d89]">식사 {boolLabel(entry.meal, "예정", "안함")}</span>
                        <span className="rounded-full border border-[#efd4dd] bg-white px-2 py-0.5 text-[#b57c90]">버스 {boolLabel(entry.bus, "이용", "미이용")}</span>
                      </div>
                      {entry.note?.trim() ? <p className="line-clamp-2 text-xs text-theme-secondary">{entry.note}</p> : null}
                      <p className="text-[11px] text-theme-secondary/80">{formatDateText(entry.createdAt)}</p>
                    </div>

                    {!preview ? (
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-warm bg-white text-theme-secondary"
                          onClick={() => setMenuEntryId((prev) => (prev === entry.id ? null : entry.id))}
                          aria-label={`${entry.name} 참석여부 메뉴`}
                        >
                          <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                        </button>

                        {menuEntryId === entry.id ? (
                          <div className="absolute right-0 top-9 z-20 min-w-[104px] rounded-lg border border-warm bg-white p-1 shadow-sm">
                            <button
                              type="button"
                              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                              onClick={() => {
                                setDeleteTarget(entry);
                                setDeletePassword("");
                                setMenuEntryId(null);
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
            <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">{deleteTarget.name}님의 참석 여부를 삭제하시겠습니까?</p>
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
                  onClick={() => void confirmDelete()}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </InvitationFullscreenModal>
    </>
  );
}
