"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthMe, logout } from "@/lib/auth";
import { apiFetch, getApiErrorMessage, isApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import RichTextEditor from "@/components/editor/RichTextEditor";
import MobilePreviewFrame from "@/components/editor/MobilePreviewFrame";
import EditorToast, { useEditorToast } from "@/components/editor/EditorToast";
import ThankyouMobileView from "@/app/thankyou/[thankyouId]/ThankyouMobileView";
import type { ThankyouEditorPayload, ThankyouPublishResponse } from "@/types/thankyou";
import "react-quill-new/dist/quill.snow.css";

type SenderType = "couple" | "parents";

type FormState = {
  themeId: string;
  title: string;
  senderType: SenderType;
  groomName: string;
  brideName: string;
  groomParentName: string;
  brideParentName: string;
  recipientName: string;
  headingPrefixText: string;
  headingPrefixColor: string;
  headingPrefixFontSize: number;
  headingTitleColor: string;
  headingTitleFontSize: number;
  eventDate: string;
  mainImageUrl: string;
  mainCaption: string;
  greetingHtml: string;
  detailBodyText: string;
  endingImageUrl: string;
  endingCaption: string;
  slug: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  themeBackgroundColor: string;
  themeTextColor: string;
  themeAccentColor: string;
  themePattern: string;
  themeEffectType: string;
  themeFontFamily: string;
  themeFontSize: number;
  themeScrollReveal: boolean;
};

const defaultFormState: FormState = {
  themeId: "classic-thankyou",
  title: "",
  senderType: "couple",
  groomName: "",
  brideName: "",
  groomParentName: "",
  brideParentName: "",
  recipientName: "",
  headingPrefixText: "",
  headingPrefixColor: "#df9a9d",
  headingPrefixFontSize: 25,
  headingTitleColor: "#524b51",
  headingTitleFontSize: 29,
  eventDate: "",
  mainImageUrl: "",
  mainCaption: "",
  greetingHtml: "",
  detailBodyText: "",
  endingImageUrl: "",
  endingCaption: "",
  slug: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  themeBackgroundColor: "#fdf8f5",
  themeTextColor: "#4a2c2a",
  themeAccentColor: "#803b2a",
  themePattern: "none",
  themeEffectType: "none",
  themeFontFamily: "'Noto Sans KR', sans-serif",
  themeFontSize: 16,
  themeScrollReveal: false,
};

const THEME_PATTERN_OPTIONS = [
  { id: "none", name: "없음" },
  { id: "dot", name: "도트" },
  { id: "grid", name: "그리드" },
  { id: "linen", name: "린넨" },
  { id: "petal", name: "꽃잎 무늬" },
  { id: "paper", name: "체크패턴" },
  { id: "hanji-texture", name: "한지패턴" },
];

const THEME_EFFECT_OPTIONS = [
  { id: "none", name: "없음" },
  { id: "cherry-blossom", name: "벚꽃" },
  { id: "snow", name: "눈" },
  { id: "falling-leaves", name: "낙엽" },
  { id: "baby-breath", name: "안개꽃" },
  { id: "forsythia", name: "개나리" },
];

const THEME_FONT_OPTIONS = [
  { value: "'Noto Sans KR', sans-serif", label: "Noto Sans KR" },
  { value: "'Pretendard', 'Noto Sans KR', sans-serif", label: "Pretendard" },
  { value: "'Noto Serif KR', serif", label: "Noto Serif KR" },
];

const THANKYOU_SECTION_ORDER = ["theme", "basic", "greeting", "detail", "share"] as const;
type ThankyouSectionKey = (typeof THANKYOU_SECTION_ORDER)[number];

const THANKYOU_SECTION_META: Record<ThankyouSectionKey, { title: string; hint: string; icon: string }> = {
  theme: { title: "테마 설정", hint: "전체 스타일", icon: "palette" },
  basic: { title: "기본 정보", hint: "보내는 사람/제목", icon: "person" },
  greeting: { title: "인사말", hint: "본문 에디터", icon: "edit_note" },
  detail: { title: "상세 내용", hint: "엔딩 이미지/문구", icon: "description" },
  share: { title: "추가 정보", hint: "slug/OG/발행 URL", icon: "share" },
};

function buildOpenSections(sectionKey: ThankyouSectionKey): Record<ThankyouSectionKey, boolean> {
  return THANKYOU_SECTION_ORDER.reduce(
    (acc, key) => {
      acc[key] = key === sectionKey;
      return acc;
    },
    {} as Record<ThankyouSectionKey, boolean>,
  );
}

const MIN_PREVIEW_SPLIT_PERCENT = 24;
const MAX_PREVIEW_SPLIT_PERCENT = 42;
const DEFAULT_PREVIEW_SPLIT_PERCENT = 40;

function clampPreviewSplitPercent(value: number): number {
  return Math.min(MAX_PREVIEW_SPLIT_PERCENT, Math.max(MIN_PREVIEW_SPLIT_PERCENT, Math.round(value)));
}

function normalizeSenderType(value?: string | null): SenderType {
  return value === "parents" ? "parents" : "couple";
}

function sanitizeColorValue(value: string, fallback: string): string {
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}

function clampThemeFontSize(value: number): number {
  if (!Number.isFinite(value)) return 16;
  return Math.min(28, Math.max(12, Math.round(value)));
}

function clampHeadingPrefixFontSize(value: number): number {
  if (!Number.isFinite(value)) return defaultFormState.headingPrefixFontSize;
  return Math.min(64, Math.max(16, Math.round(value)));
}

function clampHeadingTitleFontSize(value: number): number {
  if (!Number.isFinite(value)) return defaultFormState.headingTitleFontSize;
  return Math.min(96, Math.max(28, Math.round(value)));
}

function normalizeLegacyHeadingPrefixSize(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return defaultFormState.headingPrefixFontSize;
  const rounded = Math.round(value as number);
  if (rounded === 30) return defaultFormState.headingPrefixFontSize;
  return clampHeadingPrefixFontSize(rounded);
}

function normalizeLegacyHeadingTitleSize(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return defaultFormState.headingTitleFontSize;
  const rounded = Math.round(value as number);
  if (rounded === 58) return defaultFormState.headingTitleFontSize;
  return clampHeadingTitleFontSize(rounded);
}

function toDateTimeLocalValue(rawDate?: string | null): string {
  if (!rawDate) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawDate)) return rawDate;

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate.slice(0, 16);

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const hour = `${parsed.getHours()}`.padStart(2, "0");
  const minute = `${parsed.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function stripRichText(rawHtml: string): string {
  return rawHtml.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function buildSenderDisplayFromForm(form: Pick<FormState, "senderType" | "groomName" | "brideName" | "groomParentName" | "brideParentName">): string {
  if (form.senderType === "parents") {
    const groomParentName = form.groomParentName.trim();
    const brideParentName = form.brideParentName.trim();
    if (groomParentName && brideParentName) {
      return `${groomParentName} · ${brideParentName} 드림(혼주)`;
    }
    return "혼주";
  }

  const groomName = form.groomName.trim();
  const brideName = form.brideName.trim();
  if (groomName && brideName) {
    return `신랑 ${groomName} · 신부 ${brideName} 드림`;
  }
  return "신랑 · 신부";
}

function buildFormStateFromPayload(payload: ThankyouEditorPayload): FormState {
  const senderType = normalizeSenderType(payload.basicInfo.senderType);
  return {
    themeId: payload.themeId || defaultFormState.themeId,
    title: payload.basicInfo.title ?? "",
    senderType,
    groomName: payload.basicInfo.groomName ?? "",
    brideName: payload.basicInfo.brideName ?? "",
    groomParentName: payload.basicInfo.groomParentName ?? "",
    brideParentName: payload.basicInfo.brideParentName ?? "",
    recipientName: payload.basicInfo.recipientName ?? payload.basicInfo.receiverName ?? "",
    headingPrefixText: payload.basicInfo.headingPrefixText ?? "",
    headingPrefixColor: payload.basicInfo.headingPrefixColor ?? defaultFormState.headingPrefixColor,
    headingPrefixFontSize: normalizeLegacyHeadingPrefixSize(payload.basicInfo.headingPrefixFontSize),
    headingTitleColor: payload.basicInfo.headingTitleColor ?? defaultFormState.headingTitleColor,
    headingTitleFontSize: normalizeLegacyHeadingTitleSize(payload.basicInfo.headingTitleFontSize),
    eventDate: toDateTimeLocalValue(payload.basicInfo.eventDate),
    mainImageUrl: payload.main.imageUrl ?? "",
    mainCaption: payload.main.caption ?? "",
    greetingHtml: payload.greetingHtml ?? "",
    detailBodyText: payload.detail.bodyText ?? "",
    endingImageUrl: payload.detail.ending.imageUrl ?? "",
    endingCaption: payload.detail.ending.caption ?? "",
    slug: payload.share.slug ?? "",
    ogTitle: payload.share.ogTitle ?? "",
    ogDescription: payload.share.ogDescription ?? "",
    ogImageUrl: payload.share.ogImageUrl ?? "",
    themeBackgroundColor: payload.themeBackgroundColor ?? defaultFormState.themeBackgroundColor,
    themeTextColor: payload.themeTextColor ?? defaultFormState.themeTextColor,
    themeAccentColor: payload.themeAccentColor ?? defaultFormState.themeAccentColor,
    themePattern: payload.themePattern ?? defaultFormState.themePattern,
    themeEffectType: payload.themeEffectType ?? defaultFormState.themeEffectType,
    themeFontFamily: payload.themeFontFamily ?? defaultFormState.themeFontFamily,
    themeFontSize: clampThemeFontSize(payload.themeFontSize ?? defaultFormState.themeFontSize),
    themeScrollReveal: payload.themeScrollReveal ?? defaultFormState.themeScrollReveal,
  };
}

function createUnsavedThankyou(): ThankyouEditorPayload {
  return {
    id: 0,
    themeId: defaultFormState.themeId,
    status: "draft",
    published: false,
    main: {
      imageUrl: null,
      caption: null,
    },
    basicInfo: {
      title: "",
      senderType: "couple",
      groomName: null,
      brideName: null,
      groomParentName: null,
      brideParentName: null,
      recipientName: null,
      headingPrefixText: null,
      headingPrefixColor: defaultFormState.headingPrefixColor,
      headingPrefixFontSize: defaultFormState.headingPrefixFontSize,
      headingTitleColor: defaultFormState.headingTitleColor,
      headingTitleFontSize: defaultFormState.headingTitleFontSize,
      senderName: "신랑 · 신부",
      receiverName: null,
      eventDate: null,
    },
    greetingHtml: "",
    detail: {
      bodyText: null,
      ending: {
        imageUrl: null,
        caption: null,
      },
    },
    share: {
      slug: null,
      shareUrl: null,
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
    },
    publishedAt: null,
    createdAt: null,
    updatedAt: null,
    themeBackgroundColor: defaultFormState.themeBackgroundColor,
    themeTextColor: defaultFormState.themeTextColor,
    themeAccentColor: defaultFormState.themeAccentColor,
    themePattern: defaultFormState.themePattern,
    themeEffectType: defaultFormState.themeEffectType,
    themeFontFamily: defaultFormState.themeFontFamily,
    themeFontSize: defaultFormState.themeFontSize,
    themeScrollReveal: defaultFormState.themeScrollReveal,
  };
}

export default function ThankyouEditorPage() {
  const router = useRouter();
  const editorMainRef = useRef<HTMLElement>(null);

  const [ready, setReady] = useState(false);
  const [loadingText, setLoadingText] = useState("초대장 에디터 초기화 중...");
  const [thankyou, setThankyou] = useState<ThankyouEditorPayload | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [slugStatus, setSlugStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const { toast, showToast } = useEditorToast();
  const [openSections, setOpenSections] = useState<Record<ThankyouSectionKey, boolean>>(() => buildOpenSections("theme"));
  const [previewSplitPercent, setPreviewSplitPercent] = useState(DEFAULT_PREVIEW_SPLIT_PERCENT);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);

  const senderDisplayText = useMemo(() => buildSenderDisplayFromForm(form), [form]);
  const activeSection = useMemo<ThankyouSectionKey>(
    () => THANKYOU_SECTION_ORDER.find((key) => openSections[key]) ?? THANKYOU_SECTION_ORDER[0],
    [openSections],
  );
  const activeStepIndex = useMemo(() => THANKYOU_SECTION_ORDER.indexOf(activeSection), [activeSection]);
  const sectionCompletion = useMemo<Record<ThankyouSectionKey, boolean>>(
    () => ({
      theme: Boolean(form.themeBackgroundColor.trim() && form.themeTextColor.trim() && form.themeAccentColor.trim()),
      basic: Boolean(
        form.title.trim() &&
          (form.senderType === "couple"
            ? form.groomName.trim() && form.brideName.trim()
            : form.groomParentName.trim() && form.brideParentName.trim()),
      ),
      greeting: Boolean(stripRichText(form.greetingHtml)),
      detail: Boolean(form.detailBodyText.trim() || form.endingImageUrl.trim() || form.endingCaption.trim()),
      share: Boolean(form.slug.trim() || form.ogTitle.trim() || form.ogDescription.trim() || form.ogImageUrl.trim()),
    }),
    [form],
  );
  const completedStepCount = useMemo(
    () => THANKYOU_SECTION_ORDER.filter((key) => sectionCompletion[key]).length,
    [sectionCompletion],
  );
  const completionPercent = useMemo(
    () => Math.round((completedStepCount / THANKYOU_SECTION_ORDER.length) * 100),
    [completedStepCount],
  );
  const editorMainStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--editor-preview-width": `${previewSplitPercent}%`,
      }) as CSSProperties,
    [previewSplitPercent],
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updatePreviewSplitByClientX = useCallback((clientX: number) => {
    const mainRect = editorMainRef.current?.getBoundingClientRect();
    if (!mainRect || mainRect.width <= 0) return;
    const nextPercent = ((clientX - mainRect.left) / mainRect.width) * 100;
    setPreviewSplitPercent(clampPreviewSplitPercent(nextPercent));
  }, []);

  const startPreviewResize = useCallback(
    (clientX: number) => {
      setIsResizingPanels(true);
      updatePreviewSplitByClientX(clientX);
    },
    [updatePreviewSplitByClientX],
  );

  useEffect(() => {
    if (!isResizingPanels) return;

    const handleMouseMove = (event: MouseEvent) => updatePreviewSplitByClientX(event.clientX);
    const handleMouseUp = () => setIsResizingPanels(false);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updatePreviewSplitByClientX(touch.clientX);
    };
    const handleTouchEnd = () => setIsResizingPanels(false);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isResizingPanels, updatePreviewSplitByClientX]);

  const openSection = useCallback((sectionKey: ThankyouSectionKey) => {
    setOpenSections(buildOpenSections(sectionKey));
    window.requestAnimationFrame(() => {
      document.getElementById(`thankyou-step-${sectionKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const toggleSection = (sectionKey: ThankyouSectionKey) => {
    openSection(sectionKey);
  };

  const moveStep = (direction: -1 | 1) => {
    const nextIndex = activeStepIndex + direction;
    if (nextIndex < 0 || nextIndex >= THANKYOU_SECTION_ORDER.length) return;
    openSection(THANKYOU_SECTION_ORDER[nextIndex]);
  };
  const closeMobileActionMenu = () => setIsMobileActionMenuOpen(false);

  const applyPayload = (payload: ThankyouEditorPayload) => {
    setThankyou(payload);
    setForm(buildFormStateFromPayload(payload));
    if (payload.share.shareUrl) {
      setShareUrl(payload.share.shareUrl);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const me = await fetchAuthMe();
        if (!me.loggedIn) {
          router.replace("/login");
          return;
        }

        const thankyouId = new URLSearchParams(window.location.search).get("id");
        let payload: ThankyouEditorPayload;

        if (thankyouId) {
          setLoadingText("기존 초대장 불러오는 중...");
          payload = await apiFetch<ThankyouEditorPayload>(`/api/thankyou-cards/${thankyouId}`);
        } else {
          setLoadingText("새 초대장 작성 화면 준비 중...");
          payload = createUnsavedThankyou();
        }

        applyPayload(payload);
        setReady(true);
      } catch (error) {
        if (isApiError(error) && error.redirectedToLogin) return;
        router.replace("/");
      }
    };

    void initialize();
  }, [router]);

  const handleAssetUpload = async (payload: { mainImageFile?: File; endingImageFile?: File; ogImageFile?: File }) => {
    if (!thankyou) return;
    if (thankyou.id <= 0) {
      showToast("먼저 저장 후 이미지 업로드를 진행해 주세요.", "error");
      return;
    }

    const formData = new FormData();
    if (payload.mainImageFile) formData.append("mainImageFile", payload.mainImageFile);
    if (payload.endingImageFile) formData.append("endingImageFile", payload.endingImageFile);
    if (payload.ogImageFile) formData.append("ogImageFile", payload.ogImageFile);

    if ([...formData.keys()].length === 0) return;

    setUploading(true);
    setSlugStatus("");

    try {
      const updated = await apiFetch<ThankyouEditorPayload>(`/api/thankyou-cards/${thankyou.id}/assets`, {
        method: "POST",
        body: formData,
      });
      applyPayload(updated);
      showToast("이미지 업로드가 완료되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      showToast(getApiErrorMessage(error, "이미지 업로드에 실패했습니다."), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!thankyou) return;

    setSaving(true);
    setSlugStatus("");

    const savePayload = {
      themeId: form.themeId,
      main: {
        imageUrl: form.mainImageUrl || null,
        caption: form.mainCaption || null,
      },
      basicInfo: {
        title: form.title || null,
        senderType: form.senderType,
        groomName: form.groomName || null,
        brideName: form.brideName || null,
        groomParentName: form.groomParentName || null,
        brideParentName: form.brideParentName || null,
        recipientName: form.recipientName || null,
        headingPrefixText: form.headingPrefixText || null,
        headingPrefixColor: sanitizeColorValue(form.headingPrefixColor, defaultFormState.headingPrefixColor),
        headingPrefixFontSize: clampHeadingPrefixFontSize(form.headingPrefixFontSize),
        headingTitleColor: sanitizeColorValue(form.headingTitleColor, defaultFormState.headingTitleColor),
        headingTitleFontSize: clampHeadingTitleFontSize(form.headingTitleFontSize),
        senderName: senderDisplayText || null,
        receiverName: form.recipientName || null,
        eventDate: form.eventDate || null,
      },
      greetingHtml: form.greetingHtml || null,
      detail: {
        bodyText: form.detailBodyText || null,
        ending: {
          imageUrl: form.endingImageUrl || null,
          caption: form.endingCaption || null,
        },
      },
      share: {
        slug: form.slug || null,
        ogTitle: form.ogTitle || null,
        ogDescription: form.ogDescription || null,
        ogImageUrl: form.ogImageUrl || null,
      },
      themeBackgroundColor: sanitizeColorValue(form.themeBackgroundColor, defaultFormState.themeBackgroundColor),
      themeTextColor: sanitizeColorValue(form.themeTextColor, defaultFormState.themeTextColor),
      themeAccentColor: sanitizeColorValue(form.themeAccentColor, defaultFormState.themeAccentColor),
      themePattern: form.themePattern,
      themeEffectType: form.themeEffectType,
      themeFontFamily: form.themeFontFamily,
      themeFontSize: clampThemeFontSize(form.themeFontSize),
      themeScrollReveal: form.themeScrollReveal,
    };

    try {
      let targetThankyou = thankyou;
      if (thankyou.id <= 0) {
        const created = await apiFetch<ThankyouEditorPayload>("/api/thankyou-cards", {
          method: "POST",
          body: JSON.stringify({}),
        });
        targetThankyou = created;
        setThankyou(created);
        router.replace(`/thankyou/editor?id=${created.id}`);
      }

      const saved = await apiFetch<ThankyouEditorPayload>(`/api/thankyou-cards/${targetThankyou.id}`, {
        method: "PUT",
        body: JSON.stringify(savePayload),
      });
      applyPayload(saved);
      showToast("초대장 내용이 저장되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      const message = getApiErrorMessage(error, "저장에 실패했습니다.");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSlugCheck = async () => {
    if (!thankyou) return;
    if (thankyou.id <= 0) {
      setSlugStatus("신규 초대장은 저장 후 slug 검사가 가능합니다.");
      return;
    }
    if (!form.slug.trim()) {
      setSlugStatus("slug를 입력해 주세요.");
      return;
    }

    try {
      const result = await apiFetch<{ slug: string; available: boolean }>(
        `/api/thankyou-cards/slug-check?slug=${encodeURIComponent(form.slug)}&thankyouId=${thankyou.id}`,
      );
      updateField("slug", result.slug);
      setSlugStatus(result.available ? "사용 가능한 slug 입니다." : "이미 사용 중인 slug 입니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      setSlugStatus(getApiErrorMessage(error, "slug 형식을 확인해 주세요."));
    }
  };

  const handlePublish = async () => {
    if (!thankyou) return;
    if (thankyou.id <= 0) {
      showToast("먼저 저장 후 발행해 주세요.", "error");
      return;
    }

    if (!form.mainImageUrl.trim()) {
      showToast("메인 이미지는 발행 시 필수입니다.", "error");
      return;
    }
    if (!stripRichText(form.greetingHtml)) {
      showToast("인사말을 입력해 주세요.", "error");
      return;
    }
    if (!form.title.trim()) {
      showToast("제목은 발행 시 필수입니다.", "error");
      return;
    }
    if (form.senderType === "couple" && (!form.groomName.trim() || !form.brideName.trim())) {
      showToast("신랑/신부 이름을 입력해 주세요.", "error");
      return;
    }
    if (form.senderType === "parents" && (!form.groomParentName.trim() || !form.brideParentName.trim())) {
      showToast("혼주 성함(신랑측/신부측)을 입력해 주세요.", "error");
      return;
    }

    setPublishing(true);
    try {
      const result = await apiFetch<ThankyouPublishResponse>(`/api/thankyou-cards/${thankyou.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ slug: form.slug || null }),
      });
      setShareUrl(result.shareUrl);
      setThankyou((prev) =>
        prev
          ? {
              ...prev,
              status: "published",
              published: true,
              share: { ...prev.share, slug: result.slug, shareUrl: result.shareUrl },
            }
          : prev,
      );
      updateField("slug", result.slug);
      showToast("청첩장이 성공적으로 발행되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      showToast(getApiErrorMessage(error, "발행 처리 중 오류가 발생했습니다."), "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!thankyou) return;
    if (thankyou.id <= 0) {
      showToast("먼저 저장 후 발행 해제를 진행해 주세요.", "error");
      return;
    }
    setUnpublishing(true);
    try {
      const updated = await apiFetch<ThankyouEditorPayload>(`/api/thankyou-cards/${thankyou.id}/unpublish`, {
        method: "POST",
      });
      applyPayload(updated);
      showToast("청첩장 발행이 해제되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      showToast(getApiErrorMessage(error, "발행 해제에 실패했습니다."), "error");
    } finally {
      setUnpublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!thankyou) return;
    if (thankyou.id <= 0) {
      showToast("아직 저장되지 않은 새 초대장입니다.", "error");
      return;
    }
    if (!window.confirm("이 청첩장을 삭제하시겠습니까? 상태가 삭제로 변경되며 목록에서 숨김 처리됩니다.")) return;

    setDeleting(true);
    try {
      await apiFetch<{ message: string }>(`/api/thankyou-cards/${thankyou.id}`, {
        method: "DELETE",
      });
      showToast("초대장이 삭제 처리되었습니다.");
      router.push("/mypage");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) return;
      showToast(getApiErrorMessage(error, "삭제 처리 중 오류가 발생했습니다."), "error");
    } finally {
      setDeleting(false);
    }
  };

  const copyShareUrl = async () => {
    const target = shareUrl || thankyou?.share?.shareUrl;
    if (!target) {
      showToast("공유 URL이 없습니다.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(target);
      showToast("공유 URL이 복사되었습니다.");
    } catch {
      showToast("URL 복사에 실패했습니다.", "error");
    }
  };

  const previewData = useMemo(() => {
    if (!thankyou) return null;
    return {
      id: String(thankyou.id),
      themeId: form.themeId,
      main: {
        imageUrl: form.mainImageUrl,
        caption: form.mainCaption,
      },
      basicInfo: {
        title: form.title || "청첩장",
        senderType: form.senderType,
        groomName: form.groomName || null,
        brideName: form.brideName || null,
        groomParentName: form.groomParentName || null,
        brideParentName: form.brideParentName || null,
        recipientName: form.recipientName || null,
        headingPrefixText: form.headingPrefixText || null,
        headingPrefixColor: sanitizeColorValue(form.headingPrefixColor, defaultFormState.headingPrefixColor),
        headingPrefixFontSize: clampHeadingPrefixFontSize(form.headingPrefixFontSize),
        headingTitleColor: sanitizeColorValue(form.headingTitleColor, defaultFormState.headingTitleColor),
        headingTitleFontSize: clampHeadingTitleFontSize(form.headingTitleFontSize),
        senderName: senderDisplayText,
        receiverName: form.recipientName || null,
        eventDate: form.eventDate || null,
      },
      greetingHtml: form.greetingHtml,
      detail: {
        bodyText: form.detailBodyText || null,
        ending: {
          imageUrl: form.endingImageUrl || null,
          caption: form.endingCaption || null,
        },
      },
      share: {
        slug: form.slug || null,
        shareUrl: shareUrl || thankyou.share.shareUrl || null,
        ogTitle: form.ogTitle || null,
        ogDescription: form.ogDescription || null,
        ogImageUrl: form.ogImageUrl || null,
      },
      themeBackgroundColor: sanitizeColorValue(form.themeBackgroundColor, defaultFormState.themeBackgroundColor),
      themeTextColor: sanitizeColorValue(form.themeTextColor, defaultFormState.themeTextColor),
      themeAccentColor: sanitizeColorValue(form.themeAccentColor, defaultFormState.themeAccentColor),
      themePattern: form.themePattern,
      themeEffectType: form.themeEffectType,
      themeFontFamily: form.themeFontFamily,
      themeFontSize: clampThemeFontSize(form.themeFontSize),
      themeScrollReveal: form.themeScrollReveal,
    };
  }, [thankyou, form, shareUrl, senderDisplayText]);
  const isThankyouSaved = Boolean(thankyou && thankyou.id > 0);
  const actionLockedUntilSaved = !isThankyouSaved;

  if (!ready || !thankyou || !previewData) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-theme-secondary">{loadingText}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b border-warm bg-white px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="group flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-900" type="button" onClick={() => router.push("/")}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium sm:hidden">에디터</span>
            <span className="hidden text-sm font-medium sm:block">바우리 에디터</span>
          </button>
          <div className="hidden h-4 w-px bg-[var(--theme-divider)] md:block" />
          <div className="hidden text-xs font-medium text-gray-400 md:block">초대장 ID: {isThankyouSaved ? thankyou.id : "미저장"}</div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? "저장중..." : "저장하기"}
          </button>
          <button
            className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => {
              if (!isThankyouSaved) {
                showToast("먼저 저장 후 미리보기를 이용해 주세요.", "error");
                return;
              }
              router.push(`/thankyou/${thankyou.id}?preview=1`);
            }}
            disabled={actionLockedUntilSaved}
          >
            미리보기
          </button>
          {thankyou.published ? (
            <button
              className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
              type="button"
              onClick={copyShareUrl}
            >
              URL 복사
            </button>
          ) : null}
          {thankyou.published ? (
            <button
              className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={handleUnpublish}
              disabled={actionLockedUntilSaved || unpublishing || publishing}
            >
              {unpublishing ? "해제중..." : "발행해제"}
            </button>
          ) : (
            <>
              <button
                className="rounded-full bg-theme-brand px-5 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={handlePublish}
                disabled={actionLockedUntilSaved || publishing || unpublishing || uploading || deleting}
              >
                {publishing ? "발행중..." : "발행하기"}
              </button>
              <button
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={handleDelete}
                disabled={actionLockedUntilSaved || saving || publishing || uploading || deleting}
              >
                {deleting ? "삭제중..." : "삭제하기"}
              </button>
            </>
          )}
          <button
            className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary"
            type="button"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            로그아웃
          </button>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-warm text-theme-secondary transition-colors hover:bg-theme md:hidden"
          type="button"
          onClick={() => setIsMobileActionMenuOpen((prev) => !prev)}
          aria-label={isMobileActionMenuOpen ? "작업 메뉴 닫기" : "작업 메뉴 열기"}
          aria-expanded={isMobileActionMenuOpen}
        >
          <span className="material-symbols-outlined text-[22px]">{isMobileActionMenuOpen ? "close" : "menu"}</span>
        </button>
      </header>

      <div className={`editor-mobile-actions border-b border-warm bg-white md:hidden ${isMobileActionMenuOpen ? "open" : ""}`}>
        <div className="space-y-2 px-4 py-3">
          <button
            className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => {
              closeMobileActionMenu();
              void handleSave();
            }}
            disabled={saving || uploading}
          >
            {saving ? "저장중..." : "저장하기"}
          </button>
          <button
            className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => {
              closeMobileActionMenu();
              if (!isThankyouSaved) {
                showToast("먼저 저장 후 미리보기를 이용해 주세요.", "error");
                return;
              }
              router.push(`/thankyou/${thankyou.id}?preview=1`);
            }}
            disabled={actionLockedUntilSaved}
          >
            미리보기
          </button>
          {thankyou.published ? (
            <button
              className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
              type="button"
              onClick={() => {
                closeMobileActionMenu();
                void copyShareUrl();
              }}
            >
              URL 복사
            </button>
          ) : null}
          {thankyou.published ? (
            <button
              className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => {
                closeMobileActionMenu();
                void handleUnpublish();
              }}
              disabled={actionLockedUntilSaved || unpublishing || publishing}
            >
              {unpublishing ? "해제중..." : "발행해제"}
            </button>
          ) : (
            <>
              <button
                className="w-full rounded-md bg-theme-brand px-4 py-2.5 text-left text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => {
                  closeMobileActionMenu();
                  void handlePublish();
                }}
                disabled={actionLockedUntilSaved || publishing || unpublishing || uploading || deleting}
              >
                {publishing ? "발행중..." : "발행하기"}
              </button>
              <button
                className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-left text-xs font-bold text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => {
                  closeMobileActionMenu();
                  void handleDelete();
                }}
                disabled={actionLockedUntilSaved || saving || publishing || uploading || deleting}
              >
                {deleting ? "삭제중..." : "삭제하기"}
              </button>
            </>
          )}
          <button
            className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary"
            type="button"
            onClick={async () => {
              closeMobileActionMenu();
              await logout();
              router.push("/");
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <main
        ref={editorMainRef}
        className="grid flex-1 grid-cols-1 md:[grid-template-columns:var(--editor-preview-width)_14px_minmax(0,1fr)] lg:[grid-template-columns:var(--editor-preview-width)_14px_96px_minmax(0,1fr)]"
        style={editorMainStyle}
      >
        <section className="border-b border-warm bg-theme p-4 md:sticky md:top-0 md:h-[calc(100vh-64px)] md:border-b-0 md:p-5">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-2xl border border-warm bg-white/90 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-[0.12em] text-theme-secondary">작성률</p>
                <p className="text-xl font-bold text-theme-brand">{completionPercent}%</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-theme">
                <div className="h-full rounded-full bg-theme-brand transition-all duration-300" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-theme-secondary">
                총 {THANKYOU_SECTION_ORDER.length}단계 중 {completedStepCount}단계 완료
              </p>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <MobilePreviewFrame className="h-[620px] sm:h-[680px] md:h-[min(760px,calc(100vh-250px))] md:max-h-full">
                <ThankyouMobileView embedded thankyou={previewData} />
              </MobilePreviewFrame>
            </div>
          </div>
        </section>

        <button
          className={`group hidden touch-none cursor-col-resize items-stretch justify-center border-x border-[#eceff3] transition-colors md:flex ${
            isResizingPanels ? "bg-[#eef2f7]" : "bg-[#f8fafc] hover:bg-[#f1f5f9]"
          }`}
          type="button"
          aria-label="미리보기와 등록패널 너비 조절"
          onMouseDown={(event) => {
            event.preventDefault();
            startPreviewResize(event.clientX);
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            startPreviewResize(touch.clientX);
          }}
        >
          <span
            className={`my-auto h-24 w-[3px] rounded-full transition-colors ${
              isResizingPanels ? "bg-theme-brand" : "bg-[#cbd5e1] group-hover:bg-theme-brand/70"
            }`}
          />
        </button>

        <aside className="hidden border-x border-[#eceff3] bg-[#fafbfc] lg:block">
          <div className="custom-scrollbar h-[calc(100vh-64px)] overflow-y-auto">
            <div className="min-h-full border border-warm bg-white p-2 shadow-sm">
              <div className="mt-2 space-y-1.5">
                {THANKYOU_SECTION_ORDER.map((sectionKey, index) => {
                  const isActive = sectionKey === activeSection;
                  const isCompleted = sectionCompletion[sectionKey];
                  return (
                    <button
                      key={`compact-${sectionKey}`}
                      className={`w-full rounded-md border px-1.5 py-2 transition-colors ${
                        isActive
                          ? "border-theme-brand bg-theme-brand text-white"
                          : isCompleted
                            ? "border-[var(--theme-badge-border)] bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)]"
                            : "border-warm bg-white text-theme-secondary hover:bg-theme"
                      }`}
                      type="button"
                      onClick={() => openSection(sectionKey)}
                      title={THANKYOU_SECTION_META[sectionKey].title}
                    >
                      <span className="material-symbols-outlined mx-auto block text-[12px]">{THANKYOU_SECTION_META[sectionKey].icon}</span>
                      <span className="mt-0.5 block text-center text-[9px] leading-[1.2]">{THANKYOU_SECTION_META[sectionKey].title}</span>
                      <span className="mt-0.5 block text-center text-[8px] opacity-70">
                        {index + 1}/{THANKYOU_SECTION_ORDER.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <section className="custom-scrollbar overflow-y-auto border-l border-[#eceff3] bg-theme">
          <form className="mx-auto max-w-none px-0 py-0 md:px-0" onSubmit={handleSave}>
            <div className="space-y-2 px-6 py-10 md:px-10">
              <h1 className="font-pretendard text-3xl font-semibold text-theme-brand">감사장 편집</h1>
              <p className="text-sm text-theme-secondary opacity-70">청첩장 내용을 항목별로 깔끔하게 관리하세요.</p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {!isThankyouSaved
                  ? "안내: 신규 청첩장은 저장 후에만 이미지 업로드, 미리보기, 발행/삭제를 사용할 수 있습니다."
                  : "안내: 저장된 청첩장만 이미지 업로드, 미리보기, 발행/삭제 기능을 사용할 수 있습니다."}
              </div>
            </div>

            <div className="px-6 pb-10 md:px-10">
              <div className="grid grid-cols-1 gap-6">
                <aside className="h-fit rounded-2xl border border-warm bg-white p-4 shadow-sm lg:hidden">
                  <div className="mb-4">
                    <p className="text-xs font-bold tracking-[0.12em] text-theme-secondary">등록 패널</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-theme-brand">
                      <span className="material-symbols-outlined text-[12px]">{THANKYOU_SECTION_META[activeSection].icon}</span>
                      {activeStepIndex + 1}. {THANKYOU_SECTION_META[activeSection].title}
                    </p>
                    <p className="mt-1 text-[11px] text-theme-secondary">{THANKYOU_SECTION_META[activeSection].hint}</p>
                  </div>

                  <div className="space-y-2">
                    {THANKYOU_SECTION_ORDER.map((sectionKey, index) => {
                      const isActive = sectionKey === activeSection;
                      const isCompleted = sectionCompletion[sectionKey];
                      return (
                        <button
                          key={sectionKey}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                            isActive
                              ? "border-theme-brand bg-theme-brand text-white"
                              : isCompleted
                                ? "border-[var(--theme-badge-border)] bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)]"
                                : "border-warm bg-white text-theme-secondary hover:bg-theme"
                          }`}
                          type="button"
                          onClick={() => openSection(sectionKey)}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[11px]">{THANKYOU_SECTION_META[sectionKey].icon}</span>
                            <span>
                              {index + 1}. {THANKYOU_SECTION_META[sectionKey].title}
                            </span>
                          </span>
                          {isCompleted ? <span className="material-symbols-outlined text-[10px]">check_circle</span> : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-warm pt-4">
                    <button
                      className="rounded-xl border border-warm bg-white px-3 py-2 text-xs font-bold text-theme-secondary disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      onClick={() => moveStep(-1)}
                      disabled={activeStepIndex === 0}
                    >
                      이전 단계
                    </button>
                    <span className="text-xs font-medium text-theme-secondary">
                      {activeStepIndex + 1} / {THANKYOU_SECTION_ORDER.length}
                    </span>
                    <button
                      className="rounded-xl bg-theme-brand px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      onClick={() => moveStep(1)}
                      disabled={activeStepIndex === THANKYOU_SECTION_ORDER.length - 1}
                    >
                      다음 단계
                    </button>
                  </div>
                </aside>

                <div className="space-y-4">
                  <div
                    id="thankyou-step-theme"
                    className={`${openSections.theme ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}
                  >
                    {openSections.theme && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
                    <button className="flex w-full items-center justify-between px-6 py-5 text-left md:px-10" type="button" onClick={() => toggleSection("theme")}>
                      <span className="text-lg font-medium text-theme-brand">테마 설정 (전체 스타일)</span>
                      <span
                        className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.theme ? "rotate-180" : ""}`}
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openSections.theme ? (
                      <div className="space-y-6 px-6 pb-10 pt-2 md:px-10">
                        <div className="space-y-5 rounded-2xl border border-warm bg-[#fdfcfb] p-6">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">색상</p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">배경 색상</span>
                              <div className="flex gap-3">
                                <input
                                  className="h-10 w-14 cursor-pointer overflow-hidden rounded border border-warm"
                                  type="color"
                                  value={form.themeBackgroundColor}
                                  onChange={(event) => updateField("themeBackgroundColor", event.target.value)}
                                />
                                <input className="input-premium flex-1" value={form.themeBackgroundColor} onChange={(event) => updateField("themeBackgroundColor", event.target.value)} />
                              </div>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">기본 텍스트 색상</span>
                              <div className="flex gap-3">
                                <input className="h-10 w-14 cursor-pointer overflow-hidden rounded border border-warm" type="color" value={form.themeTextColor} onChange={(event) => updateField("themeTextColor", event.target.value)} />
                                <input className="input-premium flex-1" value={form.themeTextColor} onChange={(event) => updateField("themeTextColor", event.target.value)} />
                              </div>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">강조 색상</span>
                              <div className="flex gap-3">
                                <input className="h-10 w-14 cursor-pointer overflow-hidden rounded border border-warm" type="color" value={form.themeAccentColor} onChange={(event) => updateField("themeAccentColor", event.target.value)} />
                                <input className="input-premium flex-1" value={form.themeAccentColor} onChange={(event) => updateField("themeAccentColor", event.target.value)} />
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-5 rounded-2xl border border-warm bg-[#fdfcfb] p-6">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">배경 패턴 / 이펙트</p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">배경 패턴</span>
                              <select className="input-premium" value={form.themePattern} onChange={(event) => updateField("themePattern", event.target.value)}>
                                {THEME_PATTERN_OPTIONS.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">전체 배경 이펙트</span>
                              <select className="input-premium" value={form.themeEffectType} onChange={(event) => updateField("themeEffectType", event.target.value)}>
                                {THEME_EFFECT_OPTIONS.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">전체 글꼴</span>
                              <select className="input-premium" value={form.themeFontFamily} onChange={(event) => updateField("themeFontFamily", event.target.value)}>
                                {THEME_FONT_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">기본 글꼴 크기 (px)</span>
                              <input
                                className="input-premium"
                                type="number"
                                min={12}
                                max={28}
                                value={form.themeFontSize}
                                onChange={(event) => updateField("themeFontSize", clampThemeFontSize(Number(event.target.value)))}
                              />
                            </label>
                          </div>

                          <label className="flex items-center gap-2 rounded-xl border border-warm bg-white px-4 py-3 text-sm text-theme-secondary">
                            <input type="checkbox" checked={form.themeScrollReveal} onChange={(event) => updateField("themeScrollReveal", event.target.checked)} />
                            스크롤 진입 시 스르륵 등장(리빌) 효과 사용
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div
                    id="thankyou-step-basic"
                    className={`${openSections.basic ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}
                  >
                    {openSections.basic && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
                    <button className="flex w-full items-center justify-between px-6 py-5 text-left md:px-10" type="button" onClick={() => toggleSection("basic")}>
                      <span className="text-lg font-medium text-theme-brand">기본 정보</span>
                      <span
                        className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.basic ? "rotate-180" : ""}`}
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openSections.basic ? (
                      <div className="space-y-6 px-6 pb-10 pt-2 md:px-10">
                        <label className="block space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">날짜 (선택)</span>
                          <input className="input-premium" type="datetime-local" value={form.eventDate} onChange={(event) => updateField("eventDate", event.target.value)} />
                        </label>

                        <div className="space-y-3 rounded-2xl border border-warm bg-[#fdfcfb] p-4">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">초대장 타입</p>
                          <div className="inline-flex rounded-xl border border-warm bg-[#fcf8f5] p-1">
                            <button
                              type="button"
                              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                form.senderType === "couple" ? "bg-white text-theme-brand shadow-sm" : "text-theme-secondary hover:bg-white/60"
                              }`}
                              onClick={() => updateField("senderType", "couple")}
                            >
                              신랑·신부용
                            </button>
                            <button
                              type="button"
                              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                                form.senderType === "parents" ? "bg-white text-theme-brand shadow-sm" : "text-theme-secondary hover:bg-white/60"
                              }`}
                              onClick={() => updateField("senderType", "parents")}
                            >
                              혼주용
                            </button>
                          </div>
                        </div>

                        {form.senderType === "couple" ? (
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">신랑 이름</span>
                              <input className="input-premium" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} placeholder="신랑 이름" />
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">신부 이름</span>
                              <input className="input-premium" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} placeholder="신부 이름" />
                            </label>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">신랑측 혼주 이름</span>
                              <input className="input-premium" value={form.groomParentName} onChange={(event) => updateField("groomParentName", event.target.value)} placeholder="신랑측 혼주 이름" />
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">신부측 혼주 이름</span>
                              <input className="input-premium" value={form.brideParentName} onChange={(event) => updateField("brideParentName", event.target.value)} placeholder="신부측 혼주 이름" />
                            </label>
                          </div>
                        )}

                        <label className="block space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">수신자명 (선택)</span>
                          <input className="input-premium" value={form.recipientName} onChange={(event) => updateField("recipientName", event.target.value)} placeholder="예: OOO님" />
                        </label>

                        <div className="rounded-xl border border-warm bg-[#faf5f2] px-4 py-3 text-xs text-theme-secondary">
                          <p className="font-semibold text-theme-brand">미리보기 서명</p>
                          <p className="mt-1">{senderDisplayText}</p>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-warm bg-[#faf5f2] p-4">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">상단 제목/문구 스타일</p>

                          <label className="block space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">제목</span>
                            <input className="input-premium" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="초대장 제목" />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">메인 문구 (선택)</span>
                            <input className="input-premium" value={form.mainCaption} onChange={(event) => updateField("mainCaption", event.target.value)} placeholder="메인 이미지 하단 문구" />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">상단 문구</span>
                            <input
                              className="input-premium"
                              value={form.headingPrefixText}
                              onChange={(event) => updateField("headingPrefixText", event.target.value)}
                              placeholder={form.senderType === "parents" ? "고마운 마음을 담아" : "진심을 담아"}
                            />
                          </label>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">상단 문구 색상</span>
                              <div className="flex gap-3">
                                <input className="h-10 w-14 cursor-pointer overflow-hidden rounded border border-warm" type="color" value={form.headingPrefixColor} onChange={(event) => updateField("headingPrefixColor", event.target.value)} />
                                <input className="input-premium flex-1" value={form.headingPrefixColor} onChange={(event) => updateField("headingPrefixColor", event.target.value)} />
                              </div>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">상단 문구 크기 (px)</span>
                              <input
                                className="input-premium"
                                type="number"
                                min={16}
                                max={64}
                                value={form.headingPrefixFontSize}
                                onChange={(event) => updateField("headingPrefixFontSize", clampHeadingPrefixFontSize(Number(event.target.value)))}
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">제목 색상</span>
                              <div className="flex gap-3">
                                <input className="h-10 w-14 cursor-pointer overflow-hidden rounded border border-warm" type="color" value={form.headingTitleColor} onChange={(event) => updateField("headingTitleColor", event.target.value)} />
                                <input className="input-premium flex-1" value={form.headingTitleColor} onChange={(event) => updateField("headingTitleColor", event.target.value)} />
                              </div>
                            </label>
                            <label className="block space-y-2">
                              <span className="text-xs font-bold text-theme-secondary">제목 크기 (px)</span>
                              <input
                                className="input-premium"
                                type="number"
                                min={28}
                                max={96}
                                value={form.headingTitleFontSize}
                                onChange={(event) => updateField("headingTitleFontSize", clampHeadingTitleFontSize(Number(event.target.value)))}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-6">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">메인 이미지 (1장)</p>
                          <div className="group relative mx-auto flex aspect-[3/4] w-[30%] min-w-[120px] max-w-[180px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white">
                            {form.mainImageUrl ? (
                              <>
                                <img className="h-full w-full object-cover" src={resolveAssetUrl(form.mainImageUrl)} alt="thankyou-main-preview" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="text-xs font-bold text-white">이미지 교체</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">메인 이미지를 업로드해 주세요</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                              disabled={actionLockedUntilSaved}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void handleAssetUpload({ mainImageFile: file });
                                event.currentTarget.value = "";
                              }}
                            />
                          </div>
                          <button
                            className="rounded-xl border border-warm bg-white px-4 py-2 text-xs font-semibold text-theme-secondary hover:bg-theme"
                            type="button"
                            onClick={() => updateField("mainImageUrl", "")}
                          >
                            메인 이미지 삭제
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div
                    id="thankyou-step-greeting"
                    className={`${openSections.greeting ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}
                  >
                    {openSections.greeting && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
                    <button className="flex w-full items-center justify-between px-6 py-5 text-left md:px-10" type="button" onClick={() => toggleSection("greeting")}>
                      <span className="text-lg font-medium text-theme-brand">인사말</span>
                      <span
                        className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.greeting ? "rotate-180" : ""}`}
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openSections.greeting ? (
                      <div className="space-y-4 px-6 pb-10 pt-2 md:px-10">
                        <RichTextEditor value={form.greetingHtml} onChange={(value) => updateField("greetingHtml", value)} placeholder="인사말을 작성해 주세요." minHeight={180} />
                      </div>
                    ) : null}
                  </div>

                  <div
                    id="thankyou-step-detail"
                    className={`${openSections.detail ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}
                  >
                    {openSections.detail && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
                    <button className="flex w-full items-center justify-between px-6 py-5 text-left md:px-10" type="button" onClick={() => toggleSection("detail")}>
                      <span className="text-lg font-medium text-theme-brand">상세 내용</span>
                      <span
                        className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.detail ? "rotate-180" : ""}`}
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openSections.detail ? (
                      <div className="space-y-6 px-6 pb-10 pt-2 md:px-10">
                        <label className="block space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">상세 본문 (선택)</span>
                          <textarea
                            className="input-premium min-h-28"
                            value={form.detailBodyText}
                            onChange={(event) => updateField("detailBodyText", event.target.value)}
                            placeholder="상세 본문을 작성해 주세요."
                          />
                        </label>

                        <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-6">
                          <p className="text-xs font-bold tracking-wider text-theme-brand">엔딩 영역 (선택)</p>
                          <div className="group relative mx-auto flex aspect-[3/4] w-[30%] min-w-[120px] max-w-[180px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white">
                            {form.endingImageUrl ? (
                              <>
                                <img className="h-full w-full object-cover" src={resolveAssetUrl(form.endingImageUrl)} alt="thankyou-ending-preview" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="text-xs font-bold text-white">이미지 교체</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400">엔딩 이미지 업로드</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                              disabled={actionLockedUntilSaved}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void handleAssetUpload({ endingImageFile: file });
                                event.currentTarget.value = "";
                              }}
                            />
                          </div>
                          <button
                            className="rounded-xl border border-warm bg-white px-4 py-2 text-xs font-semibold text-theme-secondary hover:bg-theme"
                            type="button"
                            onClick={() => updateField("endingImageUrl", "")}
                          >
                            엔딩 이미지 삭제
                          </button>

                          <label className="block space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">엔딩 문구 (선택)</span>
                            <textarea className="input-premium min-h-24" value={form.endingCaption} onChange={(event) => updateField("endingCaption", event.target.value)} placeholder="엔딩 문구를 입력해 주세요." />
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div
                    id="thankyou-step-share"
                    className={`${openSections.share ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}
                  >
                    {openSections.share && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
                    <button className="flex w-full items-center justify-between px-6 py-5 text-left md:px-10" type="button" onClick={() => toggleSection("share")}>
                      <span className="text-lg font-medium text-theme-brand">추가 정보</span>
                      <span
                        className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.share ? "rotate-180" : ""}`}
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        expand_more
                      </span>
                    </button>
                    {openSections.share ? (
                      <div className="space-y-4 px-6 pb-10 pt-2 md:px-10">
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">공유 URL</span>
                          <div className="flex gap-2">
                            <input className="input-premium flex-1" value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="예: invitation-gunho-sebin" />
                            <button className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-theme disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={handleSlugCheck} disabled={actionLockedUntilSaved}>
                              중복확인
                            </button>
                          </div>
                          {slugStatus ? <p className="text-xs text-theme-secondary">{slugStatus}</p> : null}
                        </div>

                        <label className="block space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">미리보기 제목</span>
                          <input className="input-premium" value={form.ogTitle} onChange={(event) => updateField("ogTitle", event.target.value)} placeholder="공유 시 표시될 제목" />
                        </label>

                        <label className="block space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">미리 보기 설명</span>
                          <textarea className="input-premium min-h-24" value={form.ogDescription} onChange={(event) => updateField("ogDescription", event.target.value)} placeholder="공유 시 표시될 설명" />
                        </label>

                        {(shareUrl || thankyou.share.shareUrl) && (
                          <div className="rounded-xl border border-warm bg-white p-4 text-xs text-theme-secondary">
                            <p className="font-bold text-theme-brand">발행 URL</p>
                            <p className="mt-1 break-all">{shareUrl || thankyou.share.shareUrl}</p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-warm bg-white px-6 py-8 md:px-10">
                    <button className="w-full rounded-2xl bg-theme-brand py-3 text-sm font-bold text-white disabled:opacity-60" type="submit" disabled={saving || publishing || uploading}>
                      {saving ? "저장 중..." : "저장하기"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
      </main>

      <EditorToast toast={toast} />
    </div>
  );
}
