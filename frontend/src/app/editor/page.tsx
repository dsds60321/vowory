"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { fetchAuthMe, logout } from "@/lib/auth";
import { apiFetch, getApiErrorMessage, isApiError } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/site-url";
import {
  DEFAULT_FONT_FAMILY,
  EDITOR_FONT_FAMILY_OPTIONS,
  normalizeFontFamilyValue,
} from "@/lib/font-family-options";
import InvitationMobileView from "@/app/invitation/[invitationId]/InvitationMobileView";
import RichTextEditor from "@/components/editor/RichTextEditor";
import MobilePreviewFrame from "@/components/editor/MobilePreviewFrame";
import EditorToast, { useEditorToast } from "@/components/editor/EditorToast";
import "react-quill-new/dist/quill.snow.css";

type KakaoLatLng = object;

type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
  relayout: () => void;
};

type KakaoMarker = {
  setPosition: (position: KakaoLatLng) => void;
  setMap: (map: KakaoMap | null) => void;
};

type KakaoAddressResult = {
  x: string;
  y: string;
};

type KakaoGeocoder = {
  addressSearch: (address: string, callback: (result: KakaoAddressResult[], status: string) => void) => void;
};

type KakaoMapsApi = {
  load: (callback: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  Marker: new (options: { map: KakaoMap; position: KakaoLatLng }) => KakaoMarker;
  services: {
    Geocoder: new () => KakaoGeocoder;
    Status: {
      OK: string;
    };
  };
};

type KakaoShareLink = {
  webUrl: string;
  mobileWebUrl: string;
};

type KakaoShareDefaultRequest = {
  objectType: "feed";
  content: {
    title: string;
    description: string;
    imageUrl: string;
    link: KakaoShareLink;
  };
  buttons?: Array<{
    title: string;
    link: KakaoShareLink;
  }>;
};

type KakaoShareApi = {
  sendDefault: (request: KakaoShareDefaultRequest) => void;
};

type KakaoSdk = {
  init: (appKey: string) => void;
  isInitialized: () => boolean;
  Share?: KakaoShareApi;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
    kakao?: {
      maps: KakaoMapsApi;
    };
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string; buildingName: string }) => void;
        width?: string | number;
        height?: string | number;
      }) => { open: () => void; embed: (element: HTMLElement) => void };
    };
  }
}

type EditorInvitation = {
  id: number;
  slug?: string | null;
  published: boolean;
  groomName?: string | null;
  brideName?: string | null;
  date?: string | null;
  locationName?: string | null;
  address?: string | null;
  message?: string | null;
  mainImageUrl?: string | null;
  imageUrls: string[];
  paperInvitationUrl?: string | null;
  groomContact?: string | null;
  brideContact?: string | null;
  accountNumber?: string | null;
  useSeparateAccounts: boolean;
  groomAccountNumber?: string | null;
  brideAccountNumber?: string | null;
  groomRelation?: string | null;
  groomFatherName?: string | null;
  groomFatherContact?: string | null;
  groomMotherName?: string | null;
  groomMotherContact?: string | null;
  brideRelation?: string | null;
  brideFatherName?: string | null;
  brideFatherContact?: string | null;
  brideMotherName?: string | null;
  brideMotherContact?: string | null;
  bus?: string | null;
  subway?: string | null;
  car?: string | null;
  fontFamily?: string | null;
  fontColor?: string | null;
  fontSize?: number | null;
  heroMainFontFamily?: string | null;
  heroMainFontColor?: string | null;
  heroMainFontSize?: number | null;
  heroSubFontFamily?: string | null;
  heroSubFontColor?: string | null;
  heroSubFontSize?: number | null;
  useGuestbook: boolean;
  useRsvpModal: boolean;
  rsvpAutoOpenOnLoad?: boolean | null;
  backgroundMusicUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
  galleryTitle?: string | null;
  galleryType?: string | null;
  themeBackgroundColor?: string | null;
  themeTextColor?: string | null;
  themeAccentColor?: string | null;
  themePatternColor?: string | null;
  themePattern?: string | null;
  themeEffectType?: string | null;
  themeFontFamily?: string | null;
  themeFontSize?: number | null;
  themeScrollReveal?: boolean | null;
  // 추가된 필드들
  heroDesignId?: string | null;
  heroEffectType?: string | null;
  heroEffectParticleCount?: number | null;
  heroEffectSpeed?: number | null;
  heroEffectOpacity?: number | null;
  heroAccentFontFamily?: string | null;
  messageFontFamily?: string | null;
  transportFontFamily?: string | null;
  rsvpTitle?: string | null;
  rsvpMessage?: string | null;
  rsvpButtonText?: string | null;
  rsvpFontFamily?: string | null;
  locationTitle?: string | null;
  locationFloorHall?: string | null;
  locationContact?: string | null;
  showMap?: boolean;
  lockMap?: boolean;
  openingEnabled?: boolean | null;
  openingAnimationType?: string | null;
  openingBackgroundType?: string | null;
  openingBackgroundColor?: string | null;
  openingImageUrl?: string | null;
  openingImageMotionPreset?: string | null;
  openingTitle?: string | null;
  openingMessage?: string | null;
  openingTextOffsetX?: number | null;
  openingTextOffsetY?: number | null;
  openingFontFamily?: string | null;
  openingFontColor?: string | null;
  openingTitleFontSize?: number | null;
  openingMessageFontSize?: number | null;
};

type PublishResponse = {
  invitationId: number;
  slug: string;
  shareUrl: string;
};

type GuestbookEntry = {
  id: number;
  name: string;
  content: string;
  createdAt: string;
};

type FormState = {
  groomName: string;
  brideName: string;
  date: string;
  locationName: string;
  address: string;
  message: string;
  slug: string;
  mainImageUrl: string;
  imageUrls: string[];
  paperInvitationUrl: string;
  groomContact: string;
  brideContact: string;
  accountNumber: string;
  useSeparateAccounts: boolean;
  groomAccountNumber: string;
  brideAccountNumber: string;
  groomRelation: string;
  groomFatherName: string;
  groomFatherContact: string;
  groomMotherName: string;
  groomMotherContact: string;
  brideRelation: string;
  brideFatherName: string;
  brideFatherContact: string;
  brideMotherName: string;
  brideMotherContact: string;
  bus: string;
  subway: string;
  car: string;
  fontFamily: string;
  fontColor: string;
  fontSize: string;
  heroMainFontFamily: string;
  heroMainFontColor: string;
  heroMainFontSize: number;
  heroSubFontFamily: string;
  heroSubFontColor: string;
  heroSubFontSize: number;
  useGuestbook: boolean;
  useRsvpModal: boolean;
  rsvpAutoOpenOnLoad: boolean;
  backgroundMusicUrl: string;
  accountBank: string;
  groomAccountBank: string;
  brideAccountBank: string;
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
  galleryTitle: string;
  galleryType: string;
  themeBackgroundColor: string;
  themeTextColor: string;
  themeAccentColor: string;
  themePatternColor: string;
  themePattern: string;
  themeEffectType: string;
  themeFontFamily: string;
  themeFontSize: number;
  themeScrollReveal: boolean;
  // 추가된 필드들
  heroDesignId: string;
  heroEffectType: string;
  heroEffectParticleCount: number;
  heroEffectSpeed: number;
  heroEffectOpacity: number;
  heroAccentFontFamily: string;
  messageFontFamily: string;
  transportFontFamily: string;
  rsvpTitle: string;
  rsvpMessage: string;
  rsvpButtonText: string;
  rsvpFontFamily: string;
  // 추가된 오시는길 관련 필드
  locationTitle: string;
  locationFloorHall: string;
  locationContact: string;
  showMap: boolean;
  lockMap: boolean;
  openingEnabled: boolean;
  openingAnimationType: string;
  openingBackgroundType: string;
  openingBackgroundColor: string;
  openingImageUrl: string;
  openingImageMotionPreset: string;
  openingTitle: string;
  openingMessage: string;
  openingTextOffsetX: number;
  openingTextOffsetY: number;
  openingFontFamily: string;
  openingFontColor: string;
  openingTitleFontSize: number;
  openingMessageFontSize: number;
};

const defaultFormState: FormState = {
  groomName: "",
  brideName: "",
  date: "",
  locationName: "",
  address: "",
  message: "",
  slug: "",
  mainImageUrl: "",
  imageUrls: [],
  paperInvitationUrl: "",
  groomContact: "",
  brideContact: "",
  accountNumber: "",
  useSeparateAccounts: false,
  groomAccountNumber: "",
  brideAccountNumber: "",
  groomRelation: "아들",
  groomFatherName: "",
  groomFatherContact: "",
  groomMotherName: "",
  groomMotherContact: "",
  brideRelation: "딸",
  brideFatherName: "",
  brideFatherContact: "",
  brideMotherName: "",
  brideMotherContact: "",
  bus: "",
  subway: "",
  car: "",
  fontFamily: DEFAULT_FONT_FAMILY,
  fontColor: "#333333",
  fontSize: "16",
  heroMainFontFamily: DEFAULT_FONT_FAMILY,
  heroMainFontColor: "#333333",
  heroMainFontSize: 28,
  heroSubFontFamily: DEFAULT_FONT_FAMILY,
  heroSubFontColor: "#333333",
  heroSubFontSize: 16,
  useGuestbook: true,
  useRsvpModal: true,
  rsvpAutoOpenOnLoad: false,
  backgroundMusicUrl: "",
  accountBank: "",
  groomAccountBank: "",
  brideAccountBank: "",
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  galleryTitle: "웨딩 갤러리",
  galleryType: "swipe",
  themeBackgroundColor: "#fdf8f5",
  themeTextColor: "#4a2c2a",
  themeAccentColor: "#803b2a",
  themePatternColor: "#803b2a",
  themePattern: "none",
  themeEffectType: "none",
  themeFontFamily: DEFAULT_FONT_FAMILY,
  themeFontSize: 16,
  themeScrollReveal: false,
  // 초기값
  heroDesignId: "simply-meant",
  heroEffectType: "none",
  heroEffectParticleCount: 30,
  heroEffectSpeed: 100,
  heroEffectOpacity: 72,
  heroAccentFontFamily: "'Playfair Display', serif",
  messageFontFamily: DEFAULT_FONT_FAMILY,
  transportFontFamily: DEFAULT_FONT_FAMILY,
  rsvpTitle: "참석 여부 전달",
  rsvpMessage: "특별한 날 축하의 마음으로 참석해주시는 모든 분들을 위해\n참석 여부 전달을 부탁드립니다.",
  rsvpButtonText: "참석 여부 전달",
  rsvpFontFamily: DEFAULT_FONT_FAMILY,
  locationTitle: "오시는 길",
  locationFloorHall: "",
  locationContact: "",
  showMap: true,
  lockMap: false,
  openingEnabled: false,
  openingAnimationType: "typewriter",
  openingBackgroundType: "color",
  openingBackgroundColor: "#e6d8ca",
  openingImageUrl: "",
  openingImageMotionPreset: "none",
  openingTitle: "신랑 신부",
  openingMessage: "우리 결혼합니다.",
  openingTextOffsetX: 0,
  openingTextOffsetY: 0,
  openingFontFamily: DEFAULT_FONT_FAMILY,
  openingFontColor: "#3d2a22",
  openingTitleFontSize: 34,
  openingMessageFontSize: 19,
};


const HERO_DESIGNS = [
  { id: "none", name: "사용자 이미지 전용", description: "오버레이 없이 이미지만 표시합니다." },
  { id: "happy-wedding-day", name: "Happy Wedding Day", description: "손글씨 감성의 스카이 포스터 스타일" },
  { id: "happily-ever-after", name: "Happily Ever After", description: "블랙 프레임과 옐로우 타이포 무드" },
  { id: "blush-circle", name: "Blush Circle", description: "핑크 배경 + 원형 포토 클래식" },
  { id: "two-become-one", name: "Two Become One", description: "베이지 톤 무드의 필름 포스터" },
  { id: "sky-invitation", name: "Sky Invitation", description: "스카이톤 상단 + 하단 정보 카드" },
  { id: "simply-meant", name: "Simply Meant", description: "상하단 텍스트와 중앙 대형 날짜 오버레이" },
  { id: "modern-center", name: "Modern Center", description: "중앙 정렬된 깔끔한 일시와 이름" },
  { id: "serif-classic", name: "Serif Classic", description: "세리프 폰트를 활용한 클래식한 감성" },
];

const HERO_EFFECTS = [
  { id: "none", name: "없음", description: "이펙트를 적용하지 않습니다." },
  { id: "wave", name: "물결", description: "이미지 상단과 하단에 물결 흐름을 추가합니다." },
  { id: "snow", name: "눈", description: "메인 이미지 위로 눈이 내리는 효과를 적용합니다." },
  { id: "star", name: "별", description: "메인 이미지 전체로 별이 흐르는 효과를 적용합니다." },
];

const OPENING_ANIMATION_OPTIONS = [
  { id: "typewriter", name: "1번: 한 글자씩 입력" },
  { id: "soft-fade", name: "2번: 흐림에서 서서히 등장" },
];

const OPENING_IMAGE_MOTION_PRESET_OPTIONS = [
  { id: "none", label: "없음", icon: "block" },
  { id: "zoom-in", label: "줌인", icon: "zoom_in_map" },
  { id: "zoom-out", label: "줌아웃", icon: "zoom_out_map" },
  { id: "move-right", label: "오른쪽으로", icon: "arrow_forward" },
  { id: "move-down", label: "아래로", icon: "arrow_downward" },
  { id: "diag-left", label: "좌측 대각선", icon: "north_west" },
  { id: "diag-right", label: "우측 대각선", icon: "north_east" },
  { id: "diag-zoom-in", label: "대각선 줌인", icon: "south_east" },
  { id: "diag-zoom-out", label: "대각선 줌아웃", icon: "north_west" },
  { id: "circle", label: "원형 이동", icon: "autorenew" },
] as const;

const OPENING_IMAGE_MOTION_PRESET_IDS = new Set<string>(OPENING_IMAGE_MOTION_PRESET_OPTIONS.map((option) => option.id));
const MIN_OPENING_TEXT_OFFSET = -140;
const MAX_OPENING_TEXT_OFFSET = 140;
const OPENING_PREVIEW_SOFT_FADE_DURATION_MS = 3300;
const OPENING_PREVIEW_TYPEWRITER_STEP_MS = 92;
const OPENING_PREVIEW_CLOSE_DELAY_MS = 900;
const OPENING_PREVIEW_CLOSE_DURATION_MS = 680;

type HeroEffectOptions = {
  particleCount: number;
  speed: number;
  opacity: number;
};

const HERO_EFFECT_DEFAULTS: HeroEffectOptions = {
  particleCount: 30,
  speed: 100,
  opacity: 72,
};

function clampHeroEffectValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeOpeningImageMotionPreset(value?: string | null): string {
  if (!value) return "none";
  return OPENING_IMAGE_MOTION_PRESET_IDS.has(value) ? value : "none";
}

function clampOpeningTextOffset(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(clampHeroEffectValue(Number(value), MIN_OPENING_TEXT_OFFSET, MAX_OPENING_TEXT_OFFSET));
}

type OpeningAnimationPreviewProps = {
  openingImageUrl: string;
  openingImageMotionPreset: string;
  openingAnimationType: string;
  openingTitle: string;
  openingMessage: string;
  openingFontFamily: string;
  openingFontColor: string;
  openingTitleFontSize: number;
  openingMessageFontSize: number;
  openingTextOffsetX: number;
  openingTextOffsetY: number;
};

function OpeningAnimationPreview({
  openingImageUrl,
  openingImageMotionPreset,
  openingAnimationType,
  openingTitle,
  openingMessage,
  openingFontFamily,
  openingFontColor,
  openingTitleFontSize,
  openingMessageFontSize,
  openingTextOffsetX,
  openingTextOffsetY,
}: OpeningAnimationPreviewProps) {
  const hasOpeningImage = Boolean(sanitizeAssetUrl(openingImageUrl));
  const [previewRunKey, setPreviewRunKey] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);
  const [typedTitle, setTypedTitle] = useState("");
  const [typedMessage, setTypedMessage] = useState("");

  const normalizedMotionPreset = useMemo(
    () => normalizeOpeningImageMotionPreset(openingImageMotionPreset),
    [openingImageMotionPreset],
  );
  const normalizedAnimationType = openingAnimationType === "soft-fade" ? "soft-fade" : "typewriter";
  const previewTitleText = openingTitle.trim() || "신랑 신부";
  const previewMessageText = openingMessage.trim() || "우리 결혼합니다.";

  const previewTitleSize = useMemo(
    () => Math.round(clampHeroEffectValue(Number(openingTitleFontSize) * 0.48, 14, 26)),
    [openingTitleFontSize],
  );
  const previewMessageSize = useMemo(
    () => Math.round(clampHeroEffectValue(Number(openingMessageFontSize) * 0.48, 10, 18)),
    [openingMessageFontSize],
  );

  const previewImageStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: `url("${resolveAssetUrl(openingImageUrl)}")`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    }),
    [openingImageUrl],
  );

  const previewContentOffsetStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${clampOpeningTextOffset(openingTextOffsetX)}px, ${clampOpeningTextOffset(openingTextOffsetY)}px, 0)`,
    }),
    [openingTextOffsetX, openingTextOffsetY],
  );

  const triggerPreviewPlayback = useCallback(() => {
    if (!hasOpeningImage) return;
    setPreviewRunKey((prev) => prev + 1);
  }, [hasOpeningImage]);

  useEffect(() => {
    if (!hasOpeningImage || previewRunKey === 0) return;

    let cancelled = false;
    const timers: number[] = [];
    const queue = (handler: () => void, delay: number) => {
      const timerId = window.setTimeout(() => {
        if (cancelled) return;
        handler();
      }, delay);
      timers.push(timerId);
    };

    const startClosing = () => {
      setIsPreviewClosing(true);
      queue(() => {
        setIsPreviewPlaying(false);
        setIsPreviewClosing(false);
      }, OPENING_PREVIEW_CLOSE_DURATION_MS);
    };

    queue(() => {
      setIsPreviewPlaying(true);
      setIsPreviewClosing(false);

      if (normalizedAnimationType === "typewriter") {
        setTypedTitle("");
        setTypedMessage("");

        let titleIndex = 0;
        let messageIndex = 0;
        const titleText = previewTitleText;
        const messageText = previewMessageText;

        const typeMessage = () => {
          if (!messageText) {
            queue(startClosing, OPENING_PREVIEW_CLOSE_DELAY_MS);
            return;
          }
          messageIndex += 1;
          setTypedMessage(messageText.slice(0, messageIndex));
          if (messageIndex < messageText.length) {
            queue(typeMessage, OPENING_PREVIEW_TYPEWRITER_STEP_MS - 8);
            return;
          }
          queue(startClosing, OPENING_PREVIEW_CLOSE_DELAY_MS);
        };

        const typeTitle = () => {
          if (!titleText) {
            queue(typeMessage, 180);
            return;
          }
          titleIndex += 1;
          setTypedTitle(titleText.slice(0, titleIndex));
          if (titleIndex < titleText.length) {
            queue(typeTitle, OPENING_PREVIEW_TYPEWRITER_STEP_MS);
            return;
          }
          queue(typeMessage, 180);
        };

        queue(typeTitle, 260);
        return;
      }

      setTypedTitle(previewTitleText);
      setTypedMessage(previewMessageText);
      queue(startClosing, OPENING_PREVIEW_SOFT_FADE_DURATION_MS);
    }, 0);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [hasOpeningImage, normalizedAnimationType, previewMessageText, previewRunKey, previewTitleText]);

  return (
    <div className="space-y-2 pt-1">
      <span className="text-xs font-bold text-theme-secondary">오프닝 애니메이션 미리보기 (클릭 재생)</span>
      <button
        type="button"
        onClick={triggerPreviewPlayback}
        disabled={!hasOpeningImage}
        className={`relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-xl border border-warm bg-black/70 ${
          hasOpeningImage ? "cursor-pointer transition-transform hover:-translate-y-0.5" : "cursor-not-allowed opacity-70"
        }`}
      >
        {hasOpeningImage ? (
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-75"
            src={resolveAssetUrl(openingImageUrl)}
            alt="오프닝 애니메이션 미리보기 배경"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f3f4f6]">
            <span className="px-4 text-center text-[11px] font-semibold text-theme-secondary">오프닝 배경 사진 업로드 후 미리보기를 재생할 수 있습니다.</span>
          </div>
        )}

        {hasOpeningImage && isPreviewPlaying ? (
          <div className={`invite-opening-layer ${isPreviewClosing ? "is-closing" : ""}`} style={{ padding: "18px" }}>
            <div
              key={`${previewRunKey}-${normalizedMotionPreset}`}
              className={`invite-opening-image-layer is-${normalizedMotionPreset}`}
              style={previewImageStyle}
            />
            <div className="invite-opening-image-overlay" />
            <div className="invite-opening-content-shell" style={previewContentOffsetStyle}>
              <div
                className={`invite-opening-content ${normalizedAnimationType === "typewriter" ? "is-typewriter" : "is-soft-fade"}`}
                style={{ color: openingFontColor, fontFamily: openingFontFamily }}
              >
                <p
                  className={`invite-opening-title whitespace-pre-line ${
                    normalizedAnimationType === "typewriter" ? "invite-opening-caret" : ""
                  }`}
                  style={{ fontSize: `${previewTitleSize}px` }}
                >
                  {normalizedAnimationType === "typewriter" ? typedTitle : previewTitleText}
                </p>
                <p
                  className={`invite-opening-message whitespace-pre-line ${
                    normalizedAnimationType === "typewriter" ? "invite-opening-caret-delay" : ""
                  }`}
                  style={{ fontSize: `${previewMessageSize}px`, marginTop: "10px" }}
                >
                  {normalizedAnimationType === "typewriter" ? typedMessage : previewMessageText}
                </p>
              </div>
            </div>
          </div>
        ) : hasOpeningImage ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 text-white">
            <div className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-[30px] leading-none">play_circle</span>
              <span className="text-[11px] font-bold">클릭하여 재생</span>
            </div>
          </div>
        ) : null}
      </button>
      <p className="text-[11px] text-theme-secondary">선택한 프리셋과 문구 위치/폰트 스타일을 미리 재생해 확인할 수 있습니다.</p>
    </div>
  );
}

function normalizeHeroEffectOptions(options?: Partial<HeroEffectOptions>): HeroEffectOptions {
  return {
    particleCount: clampHeroEffectValue(options?.particleCount ?? HERO_EFFECT_DEFAULTS.particleCount, 6, 120),
    speed: clampHeroEffectValue(options?.speed ?? HERO_EFFECT_DEFAULTS.speed, 40, 220),
    opacity: clampHeroEffectValue(options?.opacity ?? HERO_EFFECT_DEFAULTS.opacity, 15, 100),
  };
}

function buildSnowParticles(options: HeroEffectOptions) {
  const density = Math.max(24, Math.round(options.particleCount * 1.35));
  const speedRatio = clampHeroEffectValue(options.speed / 100, 0.4, 2.2);
  const opacityRatio = clampHeroEffectValue(options.opacity / 100, 0.15, 1);
  const glyphs = ["❄", "❅", "✻"];

  return Array.from({ length: density }, (_, idx) => {
    const left = (idx * 23 + (idx % 7) * 9) % 100;
    const baseSize = 6 + (idx % 6) * 1.2;
    const size = baseSize * (0.86 + opacityRatio * 0.45);
    return {
      left,
      delay: -((idx % 12) * 0.55),
      duration: (3.2 + (idx % 6) * 0.45) / speedRatio,
      size,
      opacity: clampHeroEffectValue((0.6 + (idx % 4) * 0.12) * opacityRatio, 0.45, 1),
      blur: 12 + (idx % 3) * 5,
      startTop: -30 - (idx % 5) * 8,
      driftX: -30 + (idx % 9) * 8,
      glyph: glyphs[idx % glyphs.length],
      rotate: idx % 2 === 0 ? 360 : -360,
    };
  });
}

function buildStarParticles(options: HeroEffectOptions) {
  const density = Math.max(10, Math.round(options.particleCount * 0.9));
  const speedRatio = clampHeroEffectValue(options.speed / 100, 0.4, 2.2);
  const opacityRatio = clampHeroEffectValue(options.opacity / 100, 0.15, 1);

  return Array.from({ length: density }, (_, idx) => ({
    top: (idx * 13 + (idx % 6) * 9) % 100,
    left: (idx * 17 + (idx % 5) * 11) % 100,
    delay: -((idx % 9) * 0.45),
    duration: (4.8 + (idx % 5) * 0.7) / speedRatio,
    size: 8 + (idx % 4) * 4,
    opacity: clampHeroEffectValue((0.36 + (idx % 4) * 0.16) * opacityRatio, 0.14, 1),
  }));
}

const MP3_LIBRARY = [
  { name: "No Sleep", url: "https://cdn.vowory.com/mp3/No_Sleep.mp3" },
  { name: "Epic", url: "https://cdn.vowory.com/mp3/kornevmusic-epic.mp3" },
  { name: "Purple Piano", url: "https://cdn.vowory.com/mp3/purple-piano.mp3" },
];

const BANK_OPTIONS = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "카카오뱅크",
  "토스뱅크",
  "기업은행",
  "SC제일은행",
  "우체국",
  "기타",
];

const THEME_PATTERN_OPTIONS = [
  { id: "none", name: "없음" },
  { id: "dot", name: "도트" },
  { id: "grid", name: "그리드" },
  { id: "linen", name: "린넨" },
  { id: "petal", name: "꽃잎 무늬" },
  { id: "paper", name: "체크패턴" },
  { id: "hanji-texture", name: "한지패턴" },
  { id: "photo-texture-1", name: "이미지 #1 텍스처" },
  { id: "photo-texture-2", name: "이미지 #2 텍스처" },
];

const IMAGE_THEME_PATTERN_IDS = new Set(["photo-texture-1", "photo-texture-2"]);

const THEME_EFFECT_OPTIONS = [
  { id: "none", name: "없음" },
  { id: "cherry-blossom", name: "벚꽃" },
  { id: "snow", name: "눈" },
  { id: "falling-leaves", name: "낙엽" },
  { id: "baby-breath", name: "안개꽃" },
  { id: "forsythia", name: "개나리" },
];

const EDITOR_SECTION_ORDER = ["theme", "basic", "hero", "location", "transport", "guestbook", "rsvp", "music", "detail"] as const;
type EditorSectionKey = (typeof EDITOR_SECTION_ORDER)[number];

const EDITOR_SECTION_META: Record<EditorSectionKey, { title: string; hint: string; icon: string }> = {
  theme: { title: "테마 설정", hint: "전체 분위기", icon: "palette" },
  basic: { title: "기본 정보", hint: "신랑/신부/혼주", icon: "person" },
  hero: { title: "메인 화면", hint: "이미지/디자인", icon: "photo_library" },
  location: { title: "예식 장소", hint: "주소/지도", icon: "location_on" },
  transport: { title: "교통 안내", hint: "지하철/버스/자가용", icon: "commute" },
  guestbook: { title: "방명록", hint: "사용 여부/등록", icon: "rate_review" },
  rsvp: { title: "참석여부 전달", hint: "팝업/자동 노출", icon: "fact_check" },
  music: { title: "배경 음악", hint: "BGM 설정", icon: "music_note" },
  detail: { title: "추가 정보", hint: "미리보기/갤러리/링크", icon: "tune" },
};

function buildOpenSections(sectionKey: EditorSectionKey): Record<EditorSectionKey, boolean> {
  return EDITOR_SECTION_ORDER.reduce(
    (acc, key) => {
      acc[key] = key === sectionKey;
      return acc;
    },
    {} as Record<EditorSectionKey, boolean>,
  );
}

const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const KAKAO_MAPS_SCRIPT_SELECTOR = "script[data-kakao-maps-sdk='true']";
const MAX_CONTACT_LENGTH = 14;
const MAX_ACCOUNT_LENGTH = 14;
const MIN_THEME_FONT_SIZE = 12;
const MAX_THEME_FONT_SIZE = 28;
const MIN_OPENING_TITLE_FONT_SIZE = 12;
const MAX_OPENING_TITLE_FONT_SIZE = 72;
const MIN_OPENING_MESSAGE_FONT_SIZE = 10;
const MAX_OPENING_MESSAGE_FONT_SIZE = 52;
const INVALID_ASSET_URL_TOKENS = new Set(["null", "undefined", "nan"]);
const MIN_PREVIEW_SPLIT_PERCENT = 24;
const MAX_PREVIEW_SPLIT_PERCENT = 42;
const DEFAULT_PREVIEW_SPLIT_PERCENT = 40;
const KAKAO_SHARE_DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80";

function clampPreviewSplitPercent(value: number): number {
  return Math.min(MAX_PREVIEW_SPLIT_PERCENT, Math.max(MIN_PREVIEW_SPLIT_PERCENT, Math.round(value)));
}

function sanitizeContactValue(value: string): string {
  return value.replace(/[^0-9-]/g, "").slice(0, MAX_CONTACT_LENGTH);
}

function sanitizeAccountValue(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, MAX_ACCOUNT_LENGTH);
}

function sanitizeColorValue(value: string, fallback: string): string {
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback;
}

function sanitizeAssetUrl(value?: string | null): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (INVALID_ASSET_URL_TOKENS.has(normalized.toLowerCase())) return "";
  return normalized;
}

function sanitizeAssetUrlList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => sanitizeAssetUrl(value)).filter(Boolean);
}

function parseBankAndAccount(raw?: string | null): { bank: string; number: string } {
  const value = raw?.trim() ?? "";
  if (!value) {
    return { bank: "", number: "" };
  }

  const foundBank = BANK_OPTIONS.find((bank) => value.startsWith(bank));
  if (!foundBank) {
    return { bank: "기타", number: value };
  }

  const number = value.slice(foundBank.length).trim().replace(/^[-:| ]+/, "").trim();
  return { bank: foundBank, number };
}

function combineBankAndAccount(bank: string, account: string): string {
  const normalizedAccount = account.trim();
  if (!normalizedAccount) return "";
  const normalizedBank = bank.trim();
  if (!normalizedBank) return normalizedAccount;
  return `${normalizedBank} ${normalizedAccount}`;
}

function formatBytesToMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function buildDefaultOpeningTitle(groomName?: string | null, brideName?: string | null): string {
  const groom = (groomName ?? "").trim() || "신랑";
  const bride = (brideName ?? "").trim() || "신부";
  return `${groom} ${bride}`;
}

function toDateTimeLocalValue(rawDate?: string | null): string {
  if (!rawDate) return "";

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawDate)) {
    return rawDate;
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return rawDate.slice(0, 16);
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const hour = `${parsed.getHours()}`.padStart(2, "0");
  const minute = `${parsed.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatWeddingDate(rawDate: string): string {
  if (!rawDate) return "";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function buildFormStateFromInvitation(data: EditorInvitation): FormState {
  const mainAccount = parseBankAndAccount(data.accountNumber);
  const groomAccount = parseBankAndAccount(data.groomAccountNumber);
  const brideAccount = parseBankAndAccount(data.brideAccountNumber);

  // 백엔드 데이터에 새 필드가 없을 경우를 대비해 기본값 병합
  const typedData = data as Partial<EditorInvitation>;

  return {
    groomName: data.groomName ?? "",
    brideName: data.brideName ?? "",
    date: toDateTimeLocalValue(data.date),
    locationName: data.locationName ?? "",
    address: data.address ?? "",
    message: data.message ?? "",
    slug: data.slug ?? "",
    mainImageUrl: sanitizeAssetUrl(data.mainImageUrl),
    imageUrls: sanitizeAssetUrlList(data.imageUrls),
    paperInvitationUrl: sanitizeAssetUrl(data.paperInvitationUrl),
    groomContact: sanitizeContactValue(data.groomContact ?? ""),
    brideContact: sanitizeContactValue(data.brideContact ?? ""),
    accountNumber: sanitizeAccountValue(mainAccount.number),
    useSeparateAccounts: data.useSeparateAccounts ?? false,
    groomAccountNumber: sanitizeAccountValue(groomAccount.number),
    brideAccountNumber: sanitizeAccountValue(brideAccount.number),
    groomRelation: data.groomRelation ?? "아들",
    groomFatherName: data.groomFatherName ?? "",
    groomFatherContact: sanitizeContactValue(data.groomFatherContact ?? ""),
    groomMotherName: data.groomMotherName ?? "",
    groomMotherContact: sanitizeContactValue(data.groomMotherContact ?? ""),
    brideRelation: data.brideRelation ?? "딸",
    brideFatherName: data.brideFatherName ?? "",
    brideFatherContact: sanitizeContactValue(data.brideFatherContact ?? ""),
    brideMotherName: data.brideMotherName ?? "",
    brideMotherContact: sanitizeContactValue(data.brideMotherContact ?? ""),
    bus: data.bus ?? "",
    subway: data.subway ?? "",
    car: data.car ?? "",
    fontFamily: normalizeFontFamilyValue(data.fontFamily, defaultFormState.fontFamily),
    fontColor: data.fontColor ?? "#333333",
    fontSize: String(data.fontSize ?? 16),
    heroMainFontFamily: normalizeFontFamilyValue(
      typedData.heroMainFontFamily ?? data.fontFamily,
      defaultFormState.heroMainFontFamily,
    ),
    heroMainFontColor: sanitizeColorValue(
      typedData.heroMainFontColor ?? data.fontColor ?? defaultFormState.heroMainFontColor,
      defaultFormState.heroMainFontColor,
    ),
    heroMainFontSize: Math.round(
      clampHeroEffectValue(
        Number(typedData.heroMainFontSize ?? data.fontSize ?? defaultFormState.heroMainFontSize),
        12,
        42,
      ),
    ),
    heroSubFontFamily: normalizeFontFamilyValue(
      typedData.heroSubFontFamily ?? data.fontFamily,
      defaultFormState.heroSubFontFamily,
    ),
    heroSubFontColor: sanitizeColorValue(
      typedData.heroSubFontColor ?? data.fontColor ?? defaultFormState.heroSubFontColor,
      defaultFormState.heroSubFontColor,
    ),
    heroSubFontSize: Math.round(
      clampHeroEffectValue(
        Number(typedData.heroSubFontSize ?? data.fontSize ?? defaultFormState.heroSubFontSize),
        10,
        36,
      ),
    ),
    useGuestbook: data.useGuestbook ?? true,
    useRsvpModal: data.useRsvpModal ?? true,
    rsvpAutoOpenOnLoad: typedData.rsvpAutoOpenOnLoad ?? defaultFormState.rsvpAutoOpenOnLoad,
    backgroundMusicUrl: sanitizeAssetUrl(data.backgroundMusicUrl),
    accountBank: mainAccount.bank,
    groomAccountBank: groomAccount.bank,
    brideAccountBank: brideAccount.bank,
    seoTitle: data.seoTitle ?? "",
    seoDescription: data.seoDescription ?? "",
    seoImageUrl: sanitizeAssetUrl(data.seoImageUrl),
    galleryTitle: typedData.galleryTitle ?? defaultFormState.galleryTitle,
    galleryType: typedData.galleryType ?? defaultFormState.galleryType,
    themeBackgroundColor: sanitizeColorValue(
      typedData.themeBackgroundColor ?? defaultFormState.themeBackgroundColor,
      defaultFormState.themeBackgroundColor,
    ),
    themeTextColor: sanitizeColorValue(
      typedData.themeTextColor ?? defaultFormState.themeTextColor,
      defaultFormState.themeTextColor,
    ),
    themeAccentColor: sanitizeColorValue(
      typedData.themeAccentColor ?? defaultFormState.themeAccentColor,
      defaultFormState.themeAccentColor,
    ),
    themePatternColor: sanitizeColorValue(
      typedData.themePatternColor ?? typedData.themeAccentColor ?? defaultFormState.themePatternColor,
      defaultFormState.themePatternColor,
    ),
    themePattern: typedData.themePattern ?? defaultFormState.themePattern,
    themeEffectType: typedData.themeEffectType ?? defaultFormState.themeEffectType,
    themeFontFamily: normalizeFontFamilyValue(
      typedData.themeFontFamily,
      defaultFormState.themeFontFamily,
    ),
    themeFontSize: Math.round(
      clampHeroEffectValue(
      Number(typedData.themeFontSize ?? defaultFormState.themeFontSize),
      MIN_THEME_FONT_SIZE,
      MAX_THEME_FONT_SIZE,
      ),
    ),
    themeScrollReveal: typedData.themeScrollReveal ?? defaultFormState.themeScrollReveal,
    // 새 필드 연동
    heroDesignId: typedData.heroDesignId ?? defaultFormState.heroDesignId,
    heroEffectType: typedData.heroEffectType === "shadow" ? "none" : (typedData.heroEffectType ?? defaultFormState.heroEffectType),
    heroEffectParticleCount: clampHeroEffectValue(
      Number(typedData.heroEffectParticleCount ?? defaultFormState.heroEffectParticleCount),
      6,
      120,
    ),
    heroEffectSpeed: clampHeroEffectValue(Number(typedData.heroEffectSpeed ?? defaultFormState.heroEffectSpeed), 40, 220),
    heroEffectOpacity: clampHeroEffectValue(
      Number(typedData.heroEffectOpacity ?? defaultFormState.heroEffectOpacity),
      15,
      100,
    ),
    heroAccentFontFamily: normalizeFontFamilyValue(typedData.heroAccentFontFamily, defaultFormState.heroAccentFontFamily),
    messageFontFamily: normalizeFontFamilyValue(typedData.messageFontFamily, defaultFormState.messageFontFamily),
    transportFontFamily: normalizeFontFamilyValue(
      typedData.transportFontFamily,
      defaultFormState.transportFontFamily,
    ),
    rsvpTitle: typedData.rsvpTitle ?? defaultFormState.rsvpTitle,
    rsvpMessage: typedData.rsvpMessage ?? defaultFormState.rsvpMessage,
    rsvpButtonText: typedData.rsvpButtonText ?? defaultFormState.rsvpButtonText,
    rsvpFontFamily: normalizeFontFamilyValue(typedData.rsvpFontFamily, defaultFormState.rsvpFontFamily),
    locationTitle: typedData.locationTitle ?? defaultFormState.locationTitle,
    locationFloorHall: typedData.locationFloorHall ?? defaultFormState.locationFloorHall,
    locationContact: sanitizeContactValue(typedData.locationContact ?? defaultFormState.locationContact),
    showMap: typedData.showMap ?? defaultFormState.showMap,
    lockMap: typedData.lockMap ?? defaultFormState.lockMap,
    openingEnabled: typedData.openingEnabled ?? defaultFormState.openingEnabled,
    openingAnimationType:
      typedData.openingAnimationType === "soft-fade" || typedData.openingAnimationType === "typewriter"
        ? typedData.openingAnimationType
        : defaultFormState.openingAnimationType,
    openingBackgroundType: typedData.openingBackgroundType === "image" ? "image" : "color",
    openingBackgroundColor: sanitizeColorValue(
      typedData.openingBackgroundColor ?? defaultFormState.openingBackgroundColor,
      defaultFormState.openingBackgroundColor,
    ),
    openingImageUrl: sanitizeAssetUrl(typedData.openingImageUrl ?? defaultFormState.openingImageUrl),
    openingImageMotionPreset: normalizeOpeningImageMotionPreset(typedData.openingImageMotionPreset),
    openingTitle: (typedData.openingTitle ?? "").trim() || buildDefaultOpeningTitle(data.groomName, data.brideName),
    openingMessage: typedData.openingMessage ?? defaultFormState.openingMessage,
    openingTextOffsetX: clampOpeningTextOffset(typedData.openingTextOffsetX),
    openingTextOffsetY: clampOpeningTextOffset(typedData.openingTextOffsetY),
    openingFontFamily: normalizeFontFamilyValue(typedData.openingFontFamily, defaultFormState.openingFontFamily),
    openingFontColor: sanitizeColorValue(
      typedData.openingFontColor ?? defaultFormState.openingFontColor,
      defaultFormState.openingFontColor,
    ),
    openingTitleFontSize: Math.round(
      clampHeroEffectValue(
        Number(typedData.openingTitleFontSize ?? defaultFormState.openingTitleFontSize),
        MIN_OPENING_TITLE_FONT_SIZE,
        MAX_OPENING_TITLE_FONT_SIZE,
      ),
    ),
    openingMessageFontSize: Math.round(
      clampHeroEffectValue(
        Number(typedData.openingMessageFontSize ?? defaultFormState.openingMessageFontSize),
        MIN_OPENING_MESSAGE_FONT_SIZE,
        MAX_OPENING_MESSAGE_FONT_SIZE,
      ),
    ),
  };
}

function createUnsavedInvitation(): EditorInvitation {
  return {
    id: 0,
    published: false,
    imageUrls: [],
    useSeparateAccounts: defaultFormState.useSeparateAccounts,
    useGuestbook: defaultFormState.useGuestbook,
    useRsvpModal: defaultFormState.useRsvpModal,
    rsvpAutoOpenOnLoad: defaultFormState.rsvpAutoOpenOnLoad,
    heroDesignId: defaultFormState.heroDesignId,
    heroEffectType: defaultFormState.heroEffectType,
    heroEffectParticleCount: defaultFormState.heroEffectParticleCount,
    heroEffectSpeed: defaultFormState.heroEffectSpeed,
    heroEffectOpacity: defaultFormState.heroEffectOpacity,
    heroMainFontFamily: defaultFormState.heroMainFontFamily,
    heroMainFontColor: defaultFormState.heroMainFontColor,
    heroMainFontSize: defaultFormState.heroMainFontSize,
    heroSubFontFamily: defaultFormState.heroSubFontFamily,
    heroSubFontColor: defaultFormState.heroSubFontColor,
    heroSubFontSize: defaultFormState.heroSubFontSize,
    heroAccentFontFamily: defaultFormState.heroAccentFontFamily,
    messageFontFamily: defaultFormState.messageFontFamily,
    transportFontFamily: defaultFormState.transportFontFamily,
    rsvpTitle: defaultFormState.rsvpTitle,
    rsvpMessage: defaultFormState.rsvpMessage,
    rsvpButtonText: defaultFormState.rsvpButtonText,
    rsvpFontFamily: defaultFormState.rsvpFontFamily,
    locationTitle: defaultFormState.locationTitle,
    locationFloorHall: defaultFormState.locationFloorHall,
    locationContact: defaultFormState.locationContact,
    showMap: defaultFormState.showMap,
    lockMap: defaultFormState.lockMap,
    openingEnabled: defaultFormState.openingEnabled,
    openingAnimationType: defaultFormState.openingAnimationType,
    openingBackgroundType: defaultFormState.openingBackgroundType,
    openingBackgroundColor: defaultFormState.openingBackgroundColor,
    openingImageUrl: defaultFormState.openingImageUrl,
    openingImageMotionPreset: defaultFormState.openingImageMotionPreset,
    openingTitle: defaultFormState.openingTitle,
    openingMessage: defaultFormState.openingMessage,
    openingTextOffsetX: defaultFormState.openingTextOffsetX,
    openingTextOffsetY: defaultFormState.openingTextOffsetY,
    openingFontFamily: defaultFormState.openingFontFamily,
    openingFontColor: defaultFormState.openingFontColor,
    openingTitleFontSize: defaultFormState.openingTitleFontSize,
    openingMessageFontSize: defaultFormState.openingMessageFontSize,
    themeBackgroundColor: defaultFormState.themeBackgroundColor,
    themeTextColor: defaultFormState.themeTextColor,
    themeAccentColor: defaultFormState.themeAccentColor,
    themePatternColor: defaultFormState.themePatternColor,
    themePattern: defaultFormState.themePattern,
    themeEffectType: defaultFormState.themeEffectType,
    themeFontFamily: defaultFormState.themeFontFamily,
    themeFontSize: defaultFormState.themeFontSize,
    themeScrollReveal: defaultFormState.themeScrollReveal,
  };
}

export default function EditorPage() {
  const router = useRouter();
  const editorMainRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const kakaoMarkerRef = useRef<KakaoMarker | null>(null);
  const kakaoLoadPromiseRef = useRef<Promise<KakaoMapsApi> | null>(null);
  const musicPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicPreviewTimeoutRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [loadingText, setLoadingText] = useState("편집기 초기화 중...");
  const [invitation, setInvitation] = useState<EditorInvitation | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugStatus, setSlugStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [kakaoJsKey, setKakaoJsKey] = useState("");
  const [kakaoShareSdkLoaded, setKakaoShareSdkLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false);
  const [isGuestbookModalOpen, setIsGuestbookModalOpen] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [selectedHeroDesign, setSelectedHeroDesign] = useState(defaultFormState.heroDesignId);
  const [selectedHeroEffect, setSelectedHeroEffect] = useState(defaultFormState.heroEffectType);
  const [selectedHeroEffectParticleCount, setSelectedHeroEffectParticleCount] = useState(defaultFormState.heroEffectParticleCount);
  const [selectedHeroEffectSpeed, setSelectedHeroEffectSpeed] = useState(defaultFormState.heroEffectSpeed);
  const [selectedHeroEffectOpacity, setSelectedHeroEffectOpacity] = useState(defaultFormState.heroEffectOpacity);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [guestbookLoading, setGuestbookLoading] = useState(false);
  const [guestbookSaving, setGuestbookSaving] = useState(false);
  const [guestbookForm, setGuestbookForm] = useState({ name: "", password: "", content: "" });
  const [mapMessage, setMapMessage] = useState("주소를 검색하거나 입력하면 미리보기에 지도가 반영됩니다.");
  const { toast, showToast } = useEditorToast();
  const [openSections, setOpenSections] = useState<Record<EditorSectionKey, boolean>>(() => buildOpenSections("theme"));
  const [previewSplitPercent, setPreviewSplitPercent] = useState(DEFAULT_PREVIEW_SPLIT_PERCENT);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const [isMobileActionMenuOpen, setIsMobileActionMenuOpen] = useState(false);

  const activeSection = useMemo<EditorSectionKey>(
    () => EDITOR_SECTION_ORDER.find((key) => openSections[key]) ?? EDITOR_SECTION_ORDER[0],
    [openSections],
  );
  const activeStepIndex = useMemo(() => EDITOR_SECTION_ORDER.indexOf(activeSection), [activeSection]);
  const isImageThemePatternSelected = useMemo(
    () => IMAGE_THEME_PATTERN_IDS.has(form.themePattern),
    [form.themePattern],
  );
  const editorMainStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--editor-preview-width": `${previewSplitPercent}%`,
      }) as CSSProperties,
    [previewSplitPercent],
  );

  const stopMusicPreview = useCallback(() => {
    if (musicPreviewTimeoutRef.current !== null) {
      window.clearTimeout(musicPreviewTimeoutRef.current);
      musicPreviewTimeoutRef.current = null;
    }

    const previewAudio = musicPreviewAudioRef.current;
    if (!previewAudio) return;
    previewAudio.pause();
    previewAudio.currentTime = 0;
    musicPreviewAudioRef.current = null;
  }, []);

  const playMusicPreview = useCallback(
    async (url: string) => {
      stopMusicPreview();
      const previewAudio = new Audio(url);
      musicPreviewAudioRef.current = previewAudio;

      try {
        await previewAudio.play();
      } catch {
        musicPreviewAudioRef.current = null;
        return;
      }

      musicPreviewTimeoutRef.current = window.setTimeout(() => {
        if (musicPreviewAudioRef.current !== previewAudio) return;
        previewAudio.pause();
        previewAudio.currentTime = 0;
        musicPreviewAudioRef.current = null;
        musicPreviewTimeoutRef.current = null;
      }, 5000);
    },
    [stopMusicPreview],
  );

  useEffect(() => () => stopMusicPreview(), [stopMusicPreview]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Kakao) {
      setKakaoShareSdkLoaded(true);
    }
  }, []);

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

    const handleMouseMove = (event: MouseEvent) => {
      updatePreviewSplitByClientX(event.clientX);
    };
    const handleMouseUp = () => {
      setIsResizingPanels(false);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updatePreviewSplitByClientX(touch.clientX);
    };
    const handleTouchEnd = () => {
      setIsResizingPanels(false);
    };

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

  const weddingTitle = useMemo(() => {
    const groom = form.groomName.trim();
    const bride = form.brideName.trim();
    if (!groom && !bride) return "신랑 & 신부";
    return `${groom || "신랑"} & ${bride || "신부"}`;
  }, [form.groomName, form.brideName]);
  const heroDateDigits = useMemo(() => {
    if (!form.date) {
      return { yearShort: "26", month: "10", day: "24" };
    }
    const parsed = new Date(form.date);
    if (Number.isNaN(parsed.getTime())) {
      return { yearShort: "26", month: "10", day: "24" };
    }
    return {
      yearShort: String(parsed.getFullYear()).slice(-2),
      month: `${parsed.getMonth() + 1}`.padStart(2, "0"),
      day: `${parsed.getDate()}`.padStart(2, "0"),
    };
  }, [form.date]);

  const renderHeroOverlay = () => {
    if (form.heroDesignId === "none") return null;

    if (form.heroDesignId === "simply-meant") {
      return (
        <>
          <div className="absolute inset-0 bg-[#4f5568]/30" />
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex justify-between px-5 pt-6 text-white/80">
              <span className="serif-font text-xs tracking-[0.2em] font-semibold">SIMPLY</span>
              <span className="serif-font text-xs tracking-[0.2em] font-semibold">MEANT</span>
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
              <p className="serif-font text-[88px] leading-[0.82] font-bold text-white/95">
                {heroDateDigits.yearShort}
                <br />
                {heroDateDigits.month}
                <br />
                {heroDateDigits.day}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-6 flex justify-between px-5 text-white/90">
              <span className="serif-font text-[24px] font-semibold tracking-[0.05em]">TO BE</span>
              <span className="serif-font text-[24px] font-semibold tracking-[0.05em]">TOGETHER</span>
            </div>
          </div>
        </>
      );
    }

    if (form.heroDesignId === "modern-center") {
      return (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-white text-center bg-black/10">
          <p className="text-[13px] tracking-[0.4em] font-light mb-4">{form.date ? formatWeddingDate(form.date).split(" ").slice(0, 3).join(" / ") : "2026 / 10 / 24"}</p>
          <div className="w-8 h-px bg-white/50 my-6" />
          <p className="text-2xl font-bold tracking-widest">{weddingTitle}</p>
          <p className="mt-4 text-[11px] opacity-70 italic tracking-[0.2em]">We are getting married</p>
        </div>
      );
    }

    if (form.heroDesignId === "serif-classic") {
      return (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-white p-8">
          <div className="border border-white/30 p-8 w-full h-full flex flex-col items-center justify-center">
            <p className="serif-font text-5xl mb-6">{heroDateDigits.month}.{heroDateDigits.day}</p>
            <p className="text-sm tracking-[0.3em] font-medium uppercase">{weddingTitle}</p>
            <div className="mt-10 text-[10px] tracking-[0.5em] opacity-60">INVITATION</div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderHeroEffectLayer = (effectType: string, inputOptions?: Partial<HeroEffectOptions>) => {
    const options = normalizeHeroEffectOptions(inputOptions);

    if (effectType === "wave") {
      const speedRatio = clampHeroEffectValue(options.speed / 100, 0.4, 2.2);
      const opacityRatio = clampHeroEffectValue(options.opacity / 100, 0.15, 1);
      const waveHeight = clampHeroEffectValue(36 + Math.round(options.particleCount * 0.48), 36, 85);
      return (
        <div className="hero-effect-layer">
          <div className="hero-wave-shell hero-wave-shell-top" style={{ height: `${waveHeight}px`, opacity: opacityRatio }}>
            <span className="hero-wave-curve hero-wave-curve-front" style={{ animationDuration: `${7 / speedRatio}s` }} />
            <span className="hero-wave-curve hero-wave-curve-back" style={{ animationDuration: `${10 / speedRatio}s`, animationDelay: "-1.8s" }} />
          </div>
          <div className="hero-wave-shell hero-wave-shell-bottom" style={{ height: `${waveHeight}px`, opacity: opacityRatio }}>
            <span className="hero-wave-curve hero-wave-curve-front" style={{ animationDuration: `${7 / speedRatio}s`, animationDelay: "-0.6s" }} />
            <span className="hero-wave-curve hero-wave-curve-back" style={{ animationDuration: `${10 / speedRatio}s`, animationDelay: "-2.2s" }} />
          </div>
        </div>
      );
    }

    if (effectType === "snow") {
      const particles = buildSnowParticles(options);
      return (
        <div className="hero-effect-layer hero-effect-layer-snow">
          {particles.map((particle, idx) => (
            <span
              key={`snow-${idx}`}
              className="hero-snowflake"
              style={{
                left: `${particle.left}%`,
                top: `${particle.startTop}%`,
                fontSize: `${particle.size}px`,
                lineHeight: 1,
                opacity: particle.opacity,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                textShadow: `0 0 ${particle.blur}px rgba(255,255,255,0.96), 0 0 ${particle.blur + 8}px rgba(188,220,255,0.75)`,
                ["--snow-drift-x" as string]: `${particle.driftX}px`,
                ["--snow-rotate" as string]: `${particle.rotate}deg`,
              }}
            >
              {particle.glyph}
            </span>
          ))}
        </div>
      );
    }

    if (effectType === "star") {
      const particles = buildStarParticles(options);
      return (
        <div className="hero-effect-layer">
          {particles.map((particle, idx) => (
            <span
              key={`star-${idx}`}
              className="hero-star"
              style={{
                top: `${particle.top}%`,
                left: `${particle.left}%`,
                fontSize: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                opacity: particle.opacity,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      );
    }

    return null;
  };

  const ensureKakaoMapsReady = useCallback(async (): Promise<KakaoMapsApi> => {
    if (typeof window === "undefined") {
      throw new Error("브라우저 환경이 아닙니다.");
    }

    const normalizedKey = kakaoJsKey.trim();
    if (!normalizedKey) {
      throw new Error("카카오 JavaScript 키가 비어 있습니다.");
    }

    if (window.kakao?.maps) {
      return new Promise<KakaoMapsApi>((resolve) => {
        window.kakao!.maps.load(() => resolve(window.kakao!.maps));
      });
    }

    if (!kakaoLoadPromiseRef.current) {
      kakaoLoadPromiseRef.current = new Promise<KakaoMapsApi>((resolve, reject) => {
        const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${normalizedKey}&libraries=services&autoload=false`;
        const waitForMaps = (remainingTries: number) => {
          if (window.kakao?.maps) {
            window.kakao.maps.load(() => resolve(window.kakao!.maps));
            return;
          }
          if (remainingTries <= 0) {
            reject(new Error("kakao.maps 객체가 생성되지 않았습니다."));
            return;
          }
          window.setTimeout(() => waitForMaps(remainingTries - 1), 100);
        };

        const staleScript = document.querySelector<HTMLScriptElement>(KAKAO_MAPS_SCRIPT_SELECTOR);
        if (staleScript && staleScript.src !== sdkUrl) {
          staleScript.remove();
        }

        const existingScript = document.querySelector<HTMLScriptElement>(KAKAO_MAPS_SCRIPT_SELECTOR);
        if (existingScript) {
          if (existingScript.getAttribute("data-loaded") === "true") {
            waitForMaps(50);
            return;
          }

          existingScript.addEventListener(
            "load",
            () => {
              existingScript.setAttribute("data-loaded", "true");
              waitForMaps(50);
            },
            { once: true },
          );
          existingScript.addEventListener("error", () => reject(new Error("카카오 지도 SDK 스크립트 로드 실패")), {
            once: true,
          });
          return;
        }

        const script = document.createElement("script");
        script.src = sdkUrl;
        script.async = true;
        script.setAttribute("data-kakao-maps-sdk", "true");
        script.onload = () => {
          script.setAttribute("data-loaded", "true");
          waitForMaps(50);
        };
        script.onerror = () => reject(new Error("카카오 지도 SDK 스크립트 로드 실패"));
        document.head.appendChild(script);
      }).catch((error) => {
        kakaoLoadPromiseRef.current = null;
        throw error;
      });
    }

    return kakaoLoadPromiseRef.current;
  }, [kakaoJsKey]);

  // 지도 인스턴스 초기화 및 관리
  useEffect(() => {
    if (mapReady && mapContainerRef.current && !kakaoMapRef.current) {
      const kakao = window.kakao;
      if (!kakao || !kakao.maps) return;
      
      const center = new kakao.maps.LatLng(37.566826, 126.9786567);
      kakaoMapRef.current = new kakao.maps.Map(mapContainerRef.current, {
        center,
        level: 3,
      });
    }
  }, [mapReady]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const me = await fetchAuthMe();
        if (!me.loggedIn) {
          router.replace("/login");
          return;
        }

        const invitationId = new URLSearchParams(window.location.search).get("id");
        let editorData: EditorInvitation;

        if (invitationId) {
          setLoadingText("기존 초대장 불러오는 중...");
          editorData = await apiFetch<EditorInvitation>(`/api/invitations/${invitationId}`);
        } else {
          setLoadingText("새 초대장 작성 화면 준비 중...");
          editorData = createUnsavedInvitation();
        }

        setInvitation(editorData);
        setForm(buildFormStateFromInvitation(editorData));

        try {
          const payload = await apiFetch<{ kakaoJsKey?: string }>("/api/public/config", {
            method: "GET",
          });
          // 유효한 키가 내려올 때만 업데이트 (빈 값 방지)
          if (payload.kakaoJsKey && payload.kakaoJsKey.trim().length > 10) {
            setKakaoJsKey(payload.kakaoJsKey);
          }
        } catch {
          // 실패 시 mock-up에서 검증된 기본값 유지
        }
      } catch (error) {
        if (isApiError(error) && error.redirectedToLogin) {
          return;
        }
        router.replace("/");
        return;
      }

      setReady(true);
    };

    void initialize();
  }, [router]);

  useEffect(() => {
    if (!kakaoJsKey.trim()) return;

    let active = true;
    void ensureKakaoMapsReady()
      .then(() => {
        if (!active) return;
        setMapReady(true);
      })
      .catch(() => {
        if (!active) return;
        setMapReady(false);
        setMapMessage("지도 라이브러리를 불러오지 못했습니다. 카카오 JavaScript 키와 도메인 등록을 확인해 주세요.");
      });

    return () => {
      active = false;
    };
  }, [ensureKakaoMapsReady, kakaoJsKey]);

  useEffect(() => {
    if (!kakaoShareSdkLoaded) return;
    if (typeof window === "undefined") return;
    const normalizedKey = kakaoJsKey.trim();
    if (!normalizedKey) return;

    const kakaoSdk = window.Kakao;
    if (!kakaoSdk) return;

    try {
      if (!kakaoSdk.isInitialized()) {
        kakaoSdk.init(normalizedKey);
      }
    } catch {
      // 카카오 SDK 초기화 실패 시 버튼 클릭에서 안내
    }
  }, [kakaoShareSdkLoaded, kakaoJsKey]);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-daum-postcode='true']");
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.setAttribute("data-daum-postcode", "true");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateContactField = (
    key:
      | "groomContact"
      | "brideContact"
      | "locationContact"
      | "groomFatherContact"
      | "groomMotherContact"
      | "brideFatherContact"
      | "brideMotherContact",
    value: string,
  ) => {
    updateField(key, sanitizeContactValue(value));
  };

  const updateAccountField = (key: "accountNumber" | "groomAccountNumber" | "brideAccountNumber", value: string) => {
    updateField(key, sanitizeAccountValue(value));
  };

  const openSection = useCallback((sectionKey: EditorSectionKey) => {
    setOpenSections(buildOpenSections(sectionKey));
    window.requestAnimationFrame(() => {
      document.getElementById(`editor-step-${sectionKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const toggleSection = (sectionKey: EditorSectionKey) => {
    openSection(sectionKey);
  };

  const moveStep = (direction: -1 | 1) => {
    const nextIndex = activeStepIndex + direction;
    if (nextIndex < 0 || nextIndex >= EDITOR_SECTION_ORDER.length) return;
    openSection(EDITOR_SECTION_ORDER[nextIndex]);
  };

  const applyEditorData = (data: EditorInvitation) => {
    setInvitation(data);
    setForm(buildFormStateFromInvitation(data));
  };

  const loadGuestbookEntries = useCallback(async (invitationId: number) => {
    setGuestbookLoading(true);
    try {
      const entries = await apiFetch<GuestbookEntry[]>(`/api/invitations/${invitationId}/guestbook`);
      setGuestbookEntries(entries);
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      showToast("방명록 데이터를 불러오지 못했습니다.", "error");
    } finally {
      setGuestbookLoading(false);
    }
  }, [showToast]);

  const handleGuestbookSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!invitation || guestbookSaving) return;

    const name = guestbookForm.name.trim();
    const password = guestbookForm.password.trim();
    const content = guestbookForm.content.trim();

    if (!name || !password || !content) {
      showToast("이름, 비밀번호, 내용을 모두 입력해 주세요.", "error");
      return;
    }

    setGuestbookSaving(true);
    try {
      const created = await apiFetch<GuestbookEntry>(`/api/invitations/${invitation.id}/guestbook`, {
        method: "POST",
        body: JSON.stringify({
          name,
          password,
          content,
        }),
      });
      setGuestbookEntries((prev) => [created, ...prev]);
      setGuestbookForm({ name: "", password: "", content: "" });
      setIsGuestbookModalOpen(false);
      showToast("방명록이 등록되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      showToast(getApiErrorMessage(error, "방명록 등록에 실패했습니다."), "error");
    } finally {
      setGuestbookSaving(false);
    }
  };

  useEffect(() => {
    if (!invitation?.id) {
      setGuestbookEntries([]);
      return;
    }
    void loadGuestbookEntries(invitation.id);
  }, [invitation?.id, loadGuestbookEntries]);

  const updateMap = useCallback(async (address: string) => {
    const mapContainer = mapContainerRef.current;

    if (!mapContainer) {
      setMapMessage("지도 영역을 준비 중입니다...");
      return;
    }

    if (!address.trim()) return;

    let maps: KakaoMapsApi;
    try {
      maps = await ensureKakaoMapsReady();
      setMapReady(true);
    } catch {
      setMapReady(false);
      setMapMessage("지도 라이브러리를 불러오지 못했습니다. 카카오 JavaScript 키와 도메인 등록을 확인해 주세요.");
      return;
    }

    const geocoder = new maps.services.Geocoder();
    
    geocoder.addressSearch(address, (result: KakaoAddressResult[], status: string) => {
      if (status !== maps.services.Status.OK || result.length === 0) {
        setMapMessage("주소를 찾지 못했습니다.");
        return;
      }

      const coords = new maps.LatLng(Number(result[0].y), Number(result[0].x));

      // [핵심] React 재렌더링으로 인해 깨진 지도를 복구하기 위해 컨테이너를 비우고 새로 생성
      mapContainer.innerHTML = "";
      
      const map = new maps.Map(mapContainer, {
        center: coords,
        level: 3
      });
      kakaoMapRef.current = map;

      const marker = new maps.Marker({
        map: map,
        position: coords
      });
      kakaoMarkerRef.current = marker;

      // 레이아웃 보정
      map.relayout();
      map.setCenter(coords);
      
      // 브라우저 렌더링 안착 후 재보정
      setTimeout(() => {
        map.relayout();
        map.setCenter(coords);
      }, 300);

      setMapMessage("지도가 성공적으로 반영되었습니다.");
    });
  }, [ensureKakaoMapsReady]);

  useEffect(() => {
    // ready(JSX 렌더링 완료)와 mapReady(스크립트 로드 완료)가 모두 충족되어야 함
    if (!ready || !mapReady || !form.address.trim()) return;
    
    const timer = setTimeout(() => {
      void updateMap(form.address);
    }, 600); // 렌더링 안착을 위해 시간을 조금 더 넉넉히 둠
    return () => clearTimeout(timer);
  }, [ready, mapReady, form.address, updateMap]);

  const execDaumPostcode = useCallback(() => {
    const container = document.getElementById("postcode-container");
    if (!container || !window.daum?.Postcode) return;

    new window.daum.Postcode({
      oncomplete: (data) => {
        const addr = data.roadAddress || data.jibunAddress;
        const buildingName = data.buildingName;

        setForm((prev) => ({
          ...prev,
          address: addr,
          locationName: buildingName && prev.locationName.trim() === "" ? buildingName : prev.locationName,
        }));
        
        setIsPostcodeOpen(false);
        window.requestAnimationFrame(() => {
          setTimeout(() => void updateMap(addr), 200);
        });
      },
      width: "100%",
      height: "100%",
    }).embed(container);
  }, [updateMap]);

  useEffect(() => {
    if (isPostcodeOpen) {
      execDaumPostcode();
    }
  }, [isPostcodeOpen, execDaumPostcode]);

  const handleAssetUpload = async (
    payload: {
      mainImageFile?: File;
      paperInvitationFile?: File;
      seoImageFile?: File;
      backgroundMusicFile?: File;
      openingImageFile?: File;
      galleryFile?: File;
    },
  ) => {
    if (!invitation) return;
    if (invitation.id <= 0) {
      showToast("먼저 저장 후 파일 업로드를 진행해 주세요.", "error");
      return;
    }

    const galleryFile = payload.galleryFile && payload.galleryFile.size > 0 ? payload.galleryFile : null;

    if (galleryFile) {
      if (galleryFile.size > MAX_IMAGE_UPLOAD_BYTES) {
        setSlugStatus(`이미지 용량 초과: ${galleryFile.name} (최대 ${formatBytesToMb(MAX_IMAGE_UPLOAD_BYTES)})`);
        return;
      }

      setUploading(true);
      setSlugStatus("갤러리 업로드 중 (1장)");

      try {
        const formData = new FormData();
        formData.append("galleryFiles", galleryFile);

        const updated = await apiFetch<EditorInvitation>(`/api/invitations/${invitation.id}/assets`, {
          method: "POST",
          body: formData,
        });
        applyEditorData(updated);
        showToast("이미지가 성공적으로 업로드되었습니다.");
      } catch (error) {
        if (isApiError(error) && error.redirectedToLogin) {
          return;
        }
        showToast("갤러리 업로드에 실패했습니다.", "error");
      } finally {
        setUploading(false);
      }

      return;
    }

    const formData = new FormData();
    if (payload.mainImageFile) formData.append("mainImageFile", payload.mainImageFile);
    if (payload.paperInvitationFile) formData.append("paperInvitationFile", payload.paperInvitationFile);
    if (payload.seoImageFile) formData.append("seoImageFile", payload.seoImageFile);
    if (payload.backgroundMusicFile) formData.append("backgroundMusicFile", payload.backgroundMusicFile);
    if (payload.openingImageFile) formData.append("openingImageFile", payload.openingImageFile);

    if ([...formData.keys()].length === 0) return;

    setUploading(true);
    setSlugStatus("");

    try {
      const updated = await apiFetch<EditorInvitation>(`/api/invitations/${invitation.id}/assets`, {
        method: "POST",
        body: formData,
      });
      applyEditorData(updated);
      showToast("파일 업로드가 완료되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      showToast(getApiErrorMessage(error, "파일 업로드에 실패했습니다."), "error");
    } finally {
      setUploading(false);
    }
  };

  const buildSavePayload = () => {
    const parsedMainFontSize = Number(form.heroMainFontSize);
    const parsedSubFontSize = Number(form.heroSubFontSize);

    return {
      groomName: form.groomName,
      brideName: form.brideName,
      date: form.date,
      locationName: form.locationName,
      address: form.address,
      message: form.message,
      slug: form.slug,
      mainImageUrl: sanitizeAssetUrl(form.mainImageUrl),
      imageUrls: sanitizeAssetUrlList(form.imageUrls),
      paperInvitationUrl: sanitizeAssetUrl(form.paperInvitationUrl),
      groomContact: sanitizeContactValue(form.groomContact),
      brideContact: sanitizeContactValue(form.brideContact),
      accountNumber: combineBankAndAccount(form.accountBank, sanitizeAccountValue(form.accountNumber)),
      useSeparateAccounts: form.useSeparateAccounts,
      groomAccountNumber: combineBankAndAccount(form.groomAccountBank, sanitizeAccountValue(form.groomAccountNumber)),
      brideAccountNumber: combineBankAndAccount(form.brideAccountBank, sanitizeAccountValue(form.brideAccountNumber)),
      groomRelation: form.groomRelation,
      groomFatherName: form.groomFatherName,
      groomFatherContact: sanitizeContactValue(form.groomFatherContact),
      groomMotherName: form.groomMotherName,
      groomMotherContact: sanitizeContactValue(form.groomMotherContact),
      brideRelation: form.brideRelation,
      brideFatherName: form.brideFatherName,
      brideFatherContact: sanitizeContactValue(form.brideFatherContact),
      brideMotherName: form.brideMotherName,
      brideMotherContact: sanitizeContactValue(form.brideMotherContact),
      bus: form.bus,
      subway: form.subway,
      car: form.car,
      fontFamily: form.heroMainFontFamily,
      fontColor: sanitizeColorValue(form.heroMainFontColor, defaultFormState.heroMainFontColor),
      fontSize: Number.isFinite(parsedMainFontSize) && parsedMainFontSize > 0 ? parsedMainFontSize : null,
      heroMainFontFamily: form.heroMainFontFamily,
      heroMainFontColor: sanitizeColorValue(form.heroMainFontColor, defaultFormState.heroMainFontColor),
      heroMainFontSize: Number.isFinite(parsedMainFontSize) ? Math.round(clampHeroEffectValue(parsedMainFontSize, 12, 42)) : null,
      heroSubFontFamily: form.heroSubFontFamily,
      heroSubFontColor: sanitizeColorValue(form.heroSubFontColor, defaultFormState.heroSubFontColor),
      heroSubFontSize: Number.isFinite(parsedSubFontSize) ? Math.round(clampHeroEffectValue(parsedSubFontSize, 10, 36)) : null,
      useGuestbook: form.useGuestbook,
      useRsvpModal: form.useRsvpModal,
      rsvpAutoOpenOnLoad: form.rsvpAutoOpenOnLoad,
      backgroundMusicUrl: sanitizeAssetUrl(form.backgroundMusicUrl),
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      seoImageUrl: sanitizeAssetUrl(form.seoImageUrl),
      galleryTitle: form.galleryTitle,
      galleryType: form.galleryType,
      themeBackgroundColor: sanitizeColorValue(form.themeBackgroundColor, defaultFormState.themeBackgroundColor),
      themeTextColor: sanitizeColorValue(form.themeTextColor, defaultFormState.themeTextColor),
      themeAccentColor: sanitizeColorValue(form.themeAccentColor, defaultFormState.themeAccentColor),
      themePatternColor: sanitizeColorValue(form.themePatternColor, defaultFormState.themePatternColor),
      themePattern: form.themePattern,
      themeEffectType: form.themeEffectType,
      themeFontFamily: form.themeFontFamily,
      themeFontSize: Math.round(clampHeroEffectValue(form.themeFontSize, MIN_THEME_FONT_SIZE, MAX_THEME_FONT_SIZE)),
      themeScrollReveal: form.themeScrollReveal,
      heroDesignId: form.heroDesignId,
      heroEffectType: form.heroEffectType,
      heroEffectParticleCount: form.heroEffectParticleCount,
      heroEffectSpeed: form.heroEffectSpeed,
      heroEffectOpacity: form.heroEffectOpacity,
      heroAccentFontFamily: form.heroAccentFontFamily,
      messageFontFamily: form.messageFontFamily,
      transportFontFamily: form.transportFontFamily,
      rsvpTitle: form.rsvpTitle,
      rsvpMessage: form.rsvpMessage,
      rsvpButtonText: form.rsvpButtonText,
      rsvpFontFamily: form.rsvpFontFamily,
      locationTitle: form.locationTitle,
      locationFloorHall: form.locationFloorHall,
      locationContact: sanitizeContactValue(form.locationContact),
      showMap: form.showMap,
      lockMap: form.lockMap,
      openingEnabled: form.openingEnabled,
      openingAnimationType: form.openingAnimationType,
      openingBackgroundType: form.openingBackgroundType,
      openingBackgroundColor: sanitizeColorValue(form.openingBackgroundColor, defaultFormState.openingBackgroundColor),
      openingImageUrl: sanitizeAssetUrl(form.openingImageUrl),
      openingImageMotionPreset: normalizeOpeningImageMotionPreset(form.openingImageMotionPreset),
      openingTitle: form.openingTitle.trim() || buildDefaultOpeningTitle(form.groomName, form.brideName),
      openingMessage: form.openingMessage.trim() || defaultFormState.openingMessage,
      openingTextOffsetX: clampOpeningTextOffset(form.openingTextOffsetX),
      openingTextOffsetY: clampOpeningTextOffset(form.openingTextOffsetY),
      openingFontFamily: form.openingFontFamily,
      openingFontColor: sanitizeColorValue(form.openingFontColor, defaultFormState.openingFontColor),
      openingTitleFontSize: Math.round(
        clampHeroEffectValue(form.openingTitleFontSize, MIN_OPENING_TITLE_FONT_SIZE, MAX_OPENING_TITLE_FONT_SIZE),
      ),
      openingMessageFontSize: Math.round(
        clampHeroEffectValue(form.openingMessageFontSize, MIN_OPENING_MESSAGE_FONT_SIZE, MAX_OPENING_MESSAGE_FONT_SIZE),
      ),
    };
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!invitation) return;

    setSaving(true);
    setSlugStatus("");

    const savePayload = buildSavePayload();

    try {
      let targetInvitation = invitation;
      if (invitation.id <= 0) {
        const created = await apiFetch<EditorInvitation>("/api/invitations", {
          method: "POST",
          body: JSON.stringify({}),
        });
        targetInvitation = created;
        setInvitation(created);
        router.replace(`/editor?id=${created.id}`);
      }

      const saved = await apiFetch<EditorInvitation>(`/api/invitations/${targetInvitation.id}`, {
        method: "PUT",
        body: JSON.stringify(savePayload),
      });

      applyEditorData(saved);
      showToast("초대장 내용이 저장되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      const message = getApiErrorMessage(error, "저장 실패");
      showToast(message.includes("slug") ? "slug 중복 또는 형식 오류입니다." : "저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSlugCheck = async () => {
    if (!invitation || invitation.id <= 0) {
      setSlugStatus("신규 초대장은 저장 후 slug 검사가 가능합니다.");
      return;
    }
    if (!form.slug.trim()) {
      setSlugStatus("slug를 입력해 주세요.");
      return;
    }

    try {
      const result = await apiFetch<{ slug: string; available: boolean }>(
        `/api/invitations/slug-check?slug=${encodeURIComponent(form.slug)}&invitationId=${invitation.id}`,
      );
      updateField("slug", result.slug);
      setSlugStatus(result.available ? "사용 가능한 slug 입니다." : "이미 사용 중인 slug 입니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      const message = getApiErrorMessage(error, "slug 형식이 올바르지 않습니다. (영문 소문자/숫자/-)");
      setSlugStatus(message);
    }
  };

  const handlePublish = async () => {
    if (!invitation) return;
    if (invitation.id <= 0) {
      showToast("먼저 저장 후 발행해 주세요.", "error");
      return;
    }
    setPublishing(true);
    setSlugStatus("");

    try {
      const savedDraft = await apiFetch<EditorInvitation>(`/api/invitations/${invitation.id}`, {
        method: "PUT",
        body: JSON.stringify(buildSavePayload()),
      });
      applyEditorData(savedDraft);

      const slugForPublish = savedDraft.slug?.trim() || form.slug.trim() || null;
      const result = await apiFetch<PublishResponse>(`/api/invitations/${invitation.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ slug: slugForPublish }),
      });

      setShareUrl(result.shareUrl);
      updateField("slug", result.slug);
      setInvitation((prev) => (prev ? { ...prev, slug: result.slug, published: true } : prev));
      showToast("청첩장이 성공적으로 발행되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      const message = getApiErrorMessage(error, "발행 실패");
      showToast(message.includes("slug") ? "발행 실패: slug를 확인해 주세요." : "발행 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!invitation) return;
    if (invitation.id <= 0) {
      showToast("아직 저장되지 않은 새 초대장입니다.", "error");
      return;
    }
    if (!window.confirm("이 청첩장을 삭제하시겠습니까? 상태가 삭제로 변경되며 목록에서 숨김 처리됩니다.")) return;

    setDeleting(true);
    try {
      await apiFetch<{ message: string }>(`/api/invitations/${invitation.id}`, {
        method: "DELETE",
      });
      showToast("초대장이 삭제 처리되었습니다.");
      router.push("/mypage");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      showToast("삭제 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!invitation || invitation.id <= 0) return;
    setUnpublishing(true);
    try {
      const updated = await apiFetch<EditorInvitation>(`/api/invitations/${invitation.id}/unpublish`, {
        method: "POST",
      });
      applyEditorData(updated);
      setShareUrl("");
      showToast("청첩장 발행이 해제되었습니다.");
    } catch (error) {
      if (isApiError(error) && error.redirectedToLogin) {
        return;
      }
      showToast(getApiErrorMessage(error, "발행 해제에 실패했습니다."), "error");
    } finally {
      setUnpublishing(false);
    }
  };

  const resolveInvitationShareUrl = () => {
    const siteOrigin = getSiteOrigin();
    const savedShareUrl = shareUrl.trim();

    if (savedShareUrl) {
      if (savedShareUrl.startsWith("/")) {
        return `${siteOrigin}${savedShareUrl}`;
      }

      try {
        const parsed = new URL(savedShareUrl);
        return `${siteOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        // 잘못된 URL 형식은 아래 fallback 로직으로 처리
      }
    }

    if (!invitation || invitation.id <= 0) return "";

    const shareId = invitation.slug?.trim() || String(invitation.id);
    const encoded = encodeURIComponent(shareId);
    return `${siteOrigin}/invitation/${encoded}`;
  };

  const copyShareUrl = async () => {
    const target = resolveInvitationShareUrl();
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

  const resolveInvitationShareImageUrl = () => {
    const seoImageUrl = resolveAssetUrl(sanitizeAssetUrl(form.seoImageUrl));
    if (seoImageUrl) return seoImageUrl;

    const mainImageUrl = resolveAssetUrl(sanitizeAssetUrl(form.mainImageUrl));
    if (mainImageUrl) return mainImageUrl;

    const galleryImageUrl = resolveAssetUrl(sanitizeAssetUrl(form.imageUrls[0] ?? ""));
    if (galleryImageUrl) return galleryImageUrl;

    return KAKAO_SHARE_DEFAULT_IMAGE_URL;
  };

  const shareOnKakao = () => {
    if (!invitation?.published) {
      showToast("카카오 공유는 발행 후 사용할 수 있습니다.", "error");
      return;
    }

    const target = resolveInvitationShareUrl();
    if (!target) {
      showToast("공유 URL이 없습니다.", "error");
      return;
    }

    if (typeof window === "undefined") {
      showToast("브라우저 환경에서만 공유할 수 있습니다.", "error");
      return;
    }

    const kakaoSdk = window.Kakao;
    if (!kakaoSdk || !kakaoSdk.Share) {
      showToast("카카오 SDK를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.", "error");
      return;
    }

    const normalizedKey = kakaoJsKey.trim();
    if (!normalizedKey) {
      showToast("카카오 JavaScript 키가 없습니다.", "error");
      return;
    }

    try {
      if (!kakaoSdk.isInitialized()) {
        kakaoSdk.init(normalizedKey);
      }

      const groomName = form.groomName.trim() || "신랑";
      const brideName = form.brideName.trim() || "신부";
      const shareTitle = `${groomName} ${brideName} 결혼식에 초대합니다`;
      const shareDescription =
        [form.date ? formatWeddingDate(form.date) : "", form.locationName.trim()].filter(Boolean).join(" · ") || "소중한 날, 함께해 주세요.";
      const createKakaoShareLink = (url: string): KakaoShareLink => ({
        mobileWebUrl: url,
        webUrl: url,
      });
      const contentLink = createKakaoShareLink(target);
      const buttonLinks = [createKakaoShareLink(target)];

      kakaoSdk.Share.sendDefault({
        objectType: "feed",
        content: {
          title: shareTitle,
          description: shareDescription,
          imageUrl: resolveInvitationShareImageUrl(),
          link: contentLink,
        },
        buttons: [
          {
            title: "청첩장 보기",
            link: buttonLinks[0],
          },
        ],
      });
    } catch {
      showToast("카카오 공유에 실패했습니다. 앱 키와 도메인 설정을 확인해 주세요.", "error");
    }
  };

  const isInvitationSaved = Boolean(invitation && invitation.id > 0);
  const actionLockedUntilSaved = !isInvitationSaved;
  const sectionCompletion = useMemo<Record<EditorSectionKey, boolean>>(
    () => ({
      theme: Boolean(form.themeFontFamily && form.themeBackgroundColor && form.themeTextColor && form.themeAccentColor && form.themePatternColor),
      basic: Boolean(form.groomName.trim() && form.brideName.trim()),
      hero: Boolean(form.date && sanitizeAssetUrl(form.mainImageUrl)),
      location: Boolean(form.locationName.trim() && form.address.trim()),
      transport: Boolean(form.subway.trim() || form.bus.trim() || form.car.trim() || sanitizeAssetUrl(form.paperInvitationUrl)),
      guestbook: true,
      rsvp: !form.useRsvpModal || Boolean(form.rsvpTitle.trim() && form.rsvpMessage.trim() && form.rsvpButtonText.trim()),
      music: true,
      detail: Boolean(form.seoTitle.trim() || sanitizeAssetUrl(form.seoImageUrl)),
    }),
    [form],
  );
  const completedStepCount = useMemo(
    () => EDITOR_SECTION_ORDER.filter((key) => sectionCompletion[key]).length,
    [sectionCompletion],
  );
  const completionPercent = useMemo(
    () => Math.round((completedStepCount / EDITOR_SECTION_ORDER.length) * 100),
    [completedStepCount],
  );
  const seoImagePreviewUrl = useMemo(() => resolveAssetUrl(form.seoImageUrl), [form.seoImageUrl]);
  const closeMobileActionMenu = () => setIsMobileActionMenuOpen(false);

  if (!ready || !invitation) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-theme-secondary">{loadingText}</div>;
  }

  return (
    <div className="editor-page flex min-h-screen flex-col bg-white">
      <Script
        id="kakao-share-sdk"
        src="/kakao.min.js"
        strategy="afterInteractive"
        onLoad={() => setKakaoShareSdkLoaded(true)}
        onError={() => {
          setKakaoShareSdkLoaded(false);
          showToast("카카오 SDK를 불러오지 못했습니다.", "error");
        }}
      />
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b border-warm bg-white px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <button className="group flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-900" type="button" onClick={() => router.push("/")}>
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="text-sm font-medium sm:hidden">에디터</span>
            <span className="hidden text-sm font-medium sm:block">바우리 에디터</span>
          </button>
          <div className="hidden h-4 w-px bg-[var(--theme-divider)] md:block" />
          <div className="hidden text-xs font-medium text-gray-400 md:block">초대장 ID: {invitation.id > 0 ? invitation.id : "미저장"}</div>
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
              if (!isInvitationSaved) {
                showToast("먼저 저장 후 미리보기를 이용해 주세요.", "error");
                return;
              }
              router.push(`/invitation/${invitation.id}?preview=1`);
            }}
            disabled={actionLockedUntilSaved}
          >
            미리보기
          </button>
          {invitation.published ? (
            <button
              className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme"
              type="button"
              onClick={copyShareUrl}
            >
              URL 복사
            </button>
          ) : null}
          <button
            className="rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={shareOnKakao}
            disabled={!kakaoShareSdkLoaded}
          >
            카카오 공유
          </button>
          {invitation.published ? (
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
              if (!isInvitationSaved) {
                showToast("먼저 저장 후 미리보기를 이용해 주세요.", "error");
                return;
              }
              router.push(`/invitation/${invitation.id}?preview=1`);
            }}
            disabled={actionLockedUntilSaved}
          >
            미리보기
          </button>
          {invitation.published ? (
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
          <button
            className="w-full rounded-md border border-warm px-4 py-2.5 text-left text-xs font-bold text-theme-secondary transition-colors hover:bg-theme disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => {
              closeMobileActionMenu();
              void shareOnKakao();
            }}
            disabled={!kakaoShareSdkLoaded}
          >
            카카오 공유
          </button>
          {invitation.published ? (
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
                <div
                  className="h-full rounded-full bg-theme-brand transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-theme-secondary">
                총 {EDITOR_SECTION_ORDER.length}단계 중 {completedStepCount}단계 완료
              </p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <MobilePreviewFrame className="h-[620px] sm:h-[680px] md:h-[min(760px,calc(100vh-250px))] md:max-h-full">
                <InvitationMobileView
              embedded
              invitation={{
                id: String(invitation.id),
                slug: form.slug || String(invitation.id),
                groomName: form.groomName || "신랑",
                brideName: form.brideName || "신부",
                weddingDateTime: form.date,
                venueName: form.locationName || "예식장 정보 미입력",
                venueAddress: form.address || "주소 정보 미입력",
                coverImageUrl: sanitizeAssetUrl(form.mainImageUrl),
                mainImageUrl: sanitizeAssetUrl(form.mainImageUrl),
                seoImageUrl: sanitizeAssetUrl(form.seoImageUrl),
                imageUrls: sanitizeAssetUrlList(form.imageUrls),
                messageLines: form.message
                  .replace(/<[^>]+>/g, " ")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
                message: form.message || "",
                groomContact: form.groomContact,
                brideContact: form.brideContact,
                groomFatherName: form.groomFatherName,
                groomFatherContact: form.groomFatherContact,
                groomMotherName: form.groomMotherName,
                groomMotherContact: form.groomMotherContact,
                brideFatherName: form.brideFatherName,
                brideFatherContact: form.brideFatherContact,
                brideMotherName: form.brideMotherName,
                brideMotherContact: form.brideMotherContact,
                subway: form.subway,
                bus: form.bus,
                car: form.car,
                fontFamily: form.heroMainFontFamily,
                fontColor: sanitizeColorValue(form.heroMainFontColor, defaultFormState.heroMainFontColor),
                fontSize: Number.isFinite(Number(form.heroMainFontSize)) ? Number(form.heroMainFontSize) : undefined,
                heroMainFontFamily: form.heroMainFontFamily,
                heroMainFontColor: sanitizeColorValue(form.heroMainFontColor, defaultFormState.heroMainFontColor),
                heroMainFontSize: Math.round(clampHeroEffectValue(form.heroMainFontSize, 12, 42)),
                heroSubFontFamily: form.heroSubFontFamily,
                heroSubFontColor: sanitizeColorValue(form.heroSubFontColor, defaultFormState.heroSubFontColor),
                heroSubFontSize: Math.round(clampHeroEffectValue(form.heroSubFontSize, 10, 36)),
                useSeparateAccounts: form.useSeparateAccounts,
                useGuestbook: form.useGuestbook,
                useRsvpModal: form.useRsvpModal,
                rsvpAutoOpenOnLoad: form.rsvpAutoOpenOnLoad,
                accountNumber: combineBankAndAccount(form.accountBank, form.accountNumber),
                groomAccountNumber: combineBankAndAccount(form.groomAccountBank, form.groomAccountNumber),
                brideAccountNumber: combineBankAndAccount(form.brideAccountBank, form.brideAccountNumber),
                galleryTitle: form.galleryTitle,
                galleryType: form.galleryType,
                themeBackgroundColor: sanitizeColorValue(form.themeBackgroundColor, defaultFormState.themeBackgroundColor),
                themeTextColor: sanitizeColorValue(form.themeTextColor, defaultFormState.themeTextColor),
                themeAccentColor: sanitizeColorValue(form.themeAccentColor, defaultFormState.themeAccentColor),
                themePatternColor: sanitizeColorValue(form.themePatternColor, defaultFormState.themePatternColor),
                themePattern: form.themePattern,
                themeEffectType: form.themeEffectType,
                themeFontFamily: form.themeFontFamily,
                themeFontSize: Math.round(clampHeroEffectValue(form.themeFontSize, MIN_THEME_FONT_SIZE, MAX_THEME_FONT_SIZE)),
                themeScrollReveal: form.themeScrollReveal,
                heroDesignId: form.heroDesignId,
                heroEffectType: form.heroEffectType,
                heroEffectParticleCount: form.heroEffectParticleCount,
                heroEffectSpeed: form.heroEffectSpeed,
                heroEffectOpacity: form.heroEffectOpacity,
                heroAccentFontFamily: form.heroAccentFontFamily,
                messageFontFamily: form.messageFontFamily,
                transportFontFamily: form.transportFontFamily,
                rsvpTitle: form.rsvpTitle,
                rsvpMessage: form.rsvpMessage,
                rsvpButtonText: form.rsvpButtonText,
                rsvpFontFamily: form.rsvpFontFamily,
                backgroundMusicUrl: sanitizeAssetUrl(form.backgroundMusicUrl),
                locationTitle: form.locationTitle,
                locationFloorHall: form.locationFloorHall,
                locationContact: form.locationContact,
                showMap: form.showMap,
                lockMap: form.lockMap,
                openingEnabled: form.openingEnabled,
                openingAnimationType: form.openingAnimationType,
                openingBackgroundType: form.openingBackgroundType,
                openingBackgroundColor: sanitizeColorValue(form.openingBackgroundColor, defaultFormState.openingBackgroundColor),
                openingImageUrl: sanitizeAssetUrl(form.openingImageUrl),
                openingImageMotionPreset: normalizeOpeningImageMotionPreset(form.openingImageMotionPreset),
                openingTitle: form.openingTitle.trim() || buildDefaultOpeningTitle(form.groomName, form.brideName),
                openingMessage: form.openingMessage.trim() || defaultFormState.openingMessage,
                openingTextOffsetX: clampOpeningTextOffset(form.openingTextOffsetX),
                openingTextOffsetY: clampOpeningTextOffset(form.openingTextOffsetY),
                openingFontFamily: form.openingFontFamily,
                openingFontColor: sanitizeColorValue(form.openingFontColor, defaultFormState.openingFontColor),
                openingTitleFontSize: Math.round(
                  clampHeroEffectValue(form.openingTitleFontSize, MIN_OPENING_TITLE_FONT_SIZE, MAX_OPENING_TITLE_FONT_SIZE),
                ),
                openingMessageFontSize: Math.round(
                  clampHeroEffectValue(form.openingMessageFontSize, MIN_OPENING_MESSAGE_FONT_SIZE, MAX_OPENING_MESSAGE_FONT_SIZE),
                ),
              }}
                preview
                invitationIdForActions={invitation.id > 0 ? String(invitation.id) : ""}
                slugForActions={invitation.id > 0 ? form.slug || String(invitation.id) : ""}
              />
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
                {EDITOR_SECTION_ORDER.map((sectionKey, index) => {
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
                      title={EDITOR_SECTION_META[sectionKey].title}
                    >
                      <span className="material-symbols-outlined mx-auto block text-[12px]">{EDITOR_SECTION_META[sectionKey].icon}</span>
                      <span className="mt-0.5 block text-center text-[9px] leading-[1.2]">{EDITOR_SECTION_META[sectionKey].title}</span>
                      <span className="mt-0.5 block text-center text-[8px] opacity-70">{index + 1}/{EDITOR_SECTION_ORDER.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <section className="editor-form-panel custom-scrollbar overflow-y-auto border-l border-[#eceff3] bg-theme">
          <form className="mx-auto max-w-none px-0 py-0 md:px-0" onSubmit={handleSave}>
            <div className="px-6 py-10 space-y-2 md:px-8 md:py-8">
              <h1 className="font-pretendard text-3xl font-semibold text-theme-brand md:text-[1.75rem]">초대장 편집</h1>
              <p className="text-sm text-theme-secondary opacity-70 md:text-[13px]">청첩장 내용을 항목별로 깔끔하게 관리하세요.</p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {!isInvitationSaved
                  ? "안내: 신규 청첩장은 저장 후에만 이미지 업로드, 미리보기, 발행/삭제를 사용할 수 있습니다."
                  : "안내: 저장된 청첩장만 이미지 업로드, 미리보기, 발행/삭제 기능을 사용할 수 있습니다."}
              </div>
            </div>

            <div className="px-6 pb-10 md:px-8 md:pb-8">
              <div className="grid grid-cols-1 gap-6 md:gap-5">
                <aside className="h-fit rounded-2xl border border-warm bg-white p-4 shadow-sm lg:hidden">
                  <div className="mb-4">
                    <p className="text-xs font-bold tracking-[0.12em] text-theme-secondary">등록 패널</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-theme-brand">
                      <span className="material-symbols-outlined text-[12px]">{EDITOR_SECTION_META[activeSection].icon}</span>
                      {activeStepIndex + 1}. {EDITOR_SECTION_META[activeSection].title}
                    </p>
                    <p className="mt-1 text-[11px] text-theme-secondary">{EDITOR_SECTION_META[activeSection].hint}</p>
                  </div>

                  <div className="space-y-2">
                    {EDITOR_SECTION_ORDER.map((sectionKey, index) => {
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
                            <span className="material-symbols-outlined text-[11px]">{EDITOR_SECTION_META[sectionKey].icon}</span>
                            <span>
                              {index + 1}. {EDITOR_SECTION_META[sectionKey].title}
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
                      {activeStepIndex + 1} / {EDITOR_SECTION_ORDER.length}
                    </span>
                    <button
                      className="rounded-xl bg-theme-brand px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      onClick={() => moveStep(1)}
                      disabled={activeStepIndex === EDITOR_SECTION_ORDER.length - 1}
                    >
                      다음 단계
                    </button>
                  </div>
                </aside>

                <div className="space-y-4 md:space-y-3">

            <div id="editor-step-theme" className={`${openSections.theme ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.theme && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("theme")}
              >
                <span className="text-lg font-medium text-theme-brand">테마 설정 (전체 스타일)</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.theme ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.theme ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-6 space-y-5 md:p-5">
                    <p className="text-xs font-bold tracking-wider text-theme-brand">색상</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">배경 색상</span>
                        <div className="flex gap-3">
                          <input
                            className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden disabled:cursor-not-allowed disabled:opacity-50"
                            type="color"
                            value={form.themeBackgroundColor}
                            onChange={(e) => updateField("themeBackgroundColor", e.target.value)}
                            disabled={isImageThemePatternSelected}
                          />
                          <input
                            className="input-premium flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                            value={form.themeBackgroundColor}
                            onChange={(e) => updateField("themeBackgroundColor", e.target.value)}
                            disabled={isImageThemePatternSelected}
                          />
                        </div>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">기본 텍스트 색상</span>
                        <div className="flex gap-3">
                          <input
                            className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                            type="color"
                            value={form.themeTextColor}
                            onChange={(e) => updateField("themeTextColor", e.target.value)}
                          />
                          <input
                            className="input-premium flex-1"
                            value={form.themeTextColor}
                            onChange={(e) => updateField("themeTextColor", e.target.value)}
                          />
                        </div>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">강조 색상</span>
                        <div className="flex gap-3">
                          <input
                            className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                            type="color"
                            value={form.themeAccentColor}
                            onChange={(e) => updateField("themeAccentColor", e.target.value)}
                          />
                          <input
                            className="input-premium flex-1"
                            value={form.themeAccentColor}
                            onChange={(e) => updateField("themeAccentColor", e.target.value)}
                          />
                        </div>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">패턴 색상</span>
                        <div className="flex gap-3">
                          <input
                            className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden disabled:cursor-not-allowed disabled:opacity-50"
                            type="color"
                            value={form.themePatternColor}
                            onChange={(e) => updateField("themePatternColor", e.target.value)}
                            disabled={isImageThemePatternSelected}
                          />
                          <input
                            className="input-premium flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                            value={form.themePatternColor}
                            onChange={(e) => updateField("themePatternColor", e.target.value)}
                            disabled={isImageThemePatternSelected}
                          />
                        </div>
                      </label>
                    </div>
                    {isImageThemePatternSelected ? (
                      <p className="text-[11px] text-theme-secondary">
                        이미지 패턴 사용 중에는 배경 색상과 패턴 색상이 적용되지 않습니다.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-6 space-y-5 md:p-5">
                    <p className="text-xs font-bold tracking-wider text-theme-brand">배경 패턴 / 이펙트</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">배경 패턴</span>
                        <select
                          className="input-premium"
                          value={form.themePattern}
                          onChange={(e) => updateField("themePattern", e.target.value)}
                        >
                          {THEME_PATTERN_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">전체 배경 이펙트</span>
                        <select
                          className="input-premium"
                          value={form.themeEffectType}
                          onChange={(e) => updateField("themeEffectType", e.target.value)}
                        >
                          {THEME_EFFECT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-[11px] text-theme-secondary">
                      전체 화면 이펙트: {THEME_EFFECT_OPTIONS.find((option) => option.id === form.themeEffectType)?.name ?? "없음"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-6 space-y-5 md:p-5">
                    <p className="text-xs font-bold tracking-wider text-theme-brand">글꼴 / 스크롤 효과</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">전체 글꼴</span>
                        <select
                          className="input-premium"
                          value={form.themeFontFamily}
                          onChange={(e) => updateField("themeFontFamily", e.target.value)}
                        >
                          {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">기본 글꼴 크기 (px)</span>
                        <input
                          className="input-premium"
                          type="number"
                          min={MIN_THEME_FONT_SIZE}
                          max={MAX_THEME_FONT_SIZE}
                          value={form.themeFontSize}
                          onChange={(e) =>
                            updateField(
                              "themeFontSize",
                              Math.round(clampHeroEffectValue(Number(e.target.value), MIN_THEME_FONT_SIZE, MAX_THEME_FONT_SIZE)),
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="flex items-center gap-2 rounded-xl border border-warm bg-white px-4 py-3 text-sm text-theme-secondary">
                      <input
                        type="checkbox"
                        checked={form.themeScrollReveal}
                        onChange={(e) => updateField("themeScrollReveal", e.target.checked)}
                      />
                      스크롤 진입 시 스르륵 등장(리빌) 효과 사용
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
            <div id="editor-step-basic" className={`${openSections.basic ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.basic && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("basic")}
              >
                <span className="text-lg font-medium text-theme-brand">기본 정보 (혼주 및 관계)</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.basic ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.basic ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-5 md:p-4">
                      <p className="text-xs font-bold tracking-wider text-theme-brand">신랑</p>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">이름</span>
                        <input className="input-premium" value={form.groomName} onChange={(e) => updateField("groomName", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">관계</span>
                        <input className="input-premium" value={form.groomRelation} onChange={(e) => updateField("groomRelation", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">연락처</span>
                        <input
                          className="input-premium"
                          value={form.groomContact}
                          onChange={(e) => updateContactField("groomContact", e.target.value)}
                          inputMode="numeric"
                          maxLength={MAX_CONTACT_LENGTH}
                          placeholder="숫자와 -만 입력 (최대 14자리)"
                        />
                      </label>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-5 md:p-4">
                      <p className="text-xs font-bold tracking-wider text-theme-brand">신부</p>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">이름</span>
                        <input className="input-premium" value={form.brideName} onChange={(e) => updateField("brideName", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">관계</span>
                        <input className="input-premium" value={form.brideRelation} onChange={(e) => updateField("brideRelation", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">연락처</span>
                        <input
                          className="input-premium"
                          value={form.brideContact}
                          onChange={(e) => updateContactField("brideContact", e.target.value)}
                          inputMode="numeric"
                          maxLength={MAX_CONTACT_LENGTH}
                          placeholder="숫자와 -만 입력 (최대 14자리)"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-5 md:p-4">
                    <p className="text-xs font-bold tracking-wider text-theme-brand">혼주 정보</p>
                    <div className="grid grid-cols-[72px_1fr_1fr] gap-3 text-[11px] font-bold text-theme-secondary">
                      <span />
                      <span>신랑측</span>
                      <span>신부측</span>
                    </div>

                    <div className="grid grid-cols-[72px_1fr_1fr] gap-3 items-center">
                      <span className="text-xs font-bold text-theme-secondary">아버지</span>
                      <input className="input-premium" value={form.groomFatherName} onChange={(e) => updateField("groomFatherName", e.target.value)} />
                      <input className="input-premium" value={form.brideFatherName} onChange={(e) => updateField("brideFatherName", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-[72px_1fr_1fr] gap-3 items-center">
                      <span className="text-xs font-bold text-theme-secondary">아버지 연락처</span>
                      <input
                        className="input-premium"
                        value={form.groomFatherContact}
                        onChange={(e) => updateContactField("groomFatherContact", e.target.value)}
                        inputMode="numeric"
                        maxLength={MAX_CONTACT_LENGTH}
                        placeholder="숫자와 -만 입력"
                      />
                      <input
                        className="input-premium"
                        value={form.brideFatherContact}
                        onChange={(e) => updateContactField("brideFatherContact", e.target.value)}
                        inputMode="numeric"
                        maxLength={MAX_CONTACT_LENGTH}
                        placeholder="숫자와 -만 입력"
                      />
                    </div>

                    <div className="grid grid-cols-[72px_1fr_1fr] gap-3 items-center">
                      <span className="text-xs font-bold text-theme-secondary">어머니</span>
                      <input className="input-premium" value={form.groomMotherName} onChange={(e) => updateField("groomMotherName", e.target.value)} />
                      <input className="input-premium" value={form.brideMotherName} onChange={(e) => updateField("brideMotherName", e.target.value)} />
                    </div>

                    <div className="grid grid-cols-[72px_1fr_1fr] gap-3 items-center">
                      <span className="text-xs font-bold text-theme-secondary">어머니 연락처</span>
                      <input
                        className="input-premium"
                        value={form.groomMotherContact}
                        onChange={(e) => updateContactField("groomMotherContact", e.target.value)}
                        inputMode="numeric"
                        maxLength={MAX_CONTACT_LENGTH}
                        placeholder="숫자와 -만 입력"
                      />
                      <input
                        className="input-premium"
                        value={form.brideMotherContact}
                        onChange={(e) => updateContactField("brideMotherContact", e.target.value)}
                        inputMode="numeric"
                        maxLength={MAX_CONTACT_LENGTH}
                        placeholder="숫자와 -만 입력"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div id="editor-step-hero" className={`${openSections.hero ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.hero && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("hero")}
              >
                <span className="text-lg font-medium text-theme-brand">메인 화면 & 예식 일시</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.hero ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.hero ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">예식 일시</span>
                    <input className="input-premium" type="datetime-local" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
                  </label>
                  
                  <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-6 md:p-5">
                    <span className="text-xs font-bold text-theme-secondary">메인 이미지 및 디자인</span>
                    <div className="flex flex-col gap-4">
                      <div className="relative mx-auto aspect-[3/4] w-[30%] min-w-[120px] max-w-[180px] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center group">
                        {form.mainImageUrl ? (
                          <>
                            <img className="h-full w-full object-cover" src={resolveAssetUrl(form.mainImageUrl)} alt="Main Preview" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-bold">이미지 변경</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">메인 이미지를 업로드해 주세요</span>
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
                        className="w-full rounded-xl bg-white border border-warm py-3 text-sm font-bold text-theme-brand shadow-sm hover:bg-theme transition-colors"
                        type="button"
                        onClick={() => {
                          setSelectedHeroDesign(form.heroDesignId);
                          setIsDesignModalOpen(true);
                        }}
                      >
                        디자인 선택
                      </button>
                      <button
                        className="w-full rounded-xl bg-white border border-warm py-3 text-sm font-bold text-theme-brand shadow-sm hover:bg-theme transition-colors"
                        type="button"
                        onClick={() => {
                          setSelectedHeroEffect(form.heroEffectType);
                          setSelectedHeroEffectParticleCount(form.heroEffectParticleCount);
                          setSelectedHeroEffectSpeed(form.heroEffectSpeed);
                          setSelectedHeroEffectOpacity(form.heroEffectOpacity);
                          setIsEffectModalOpen(true);
                        }}
                      >
                        이펙트 선택
                      </button>
                      <p className="text-[11px] text-theme-secondary">
                        선택된 이펙트: {HERO_EFFECTS.find((effect) => effect.id === form.heroEffectType)?.name ?? "없음"} / 입자 {form.heroEffectParticleCount} · 속도 {form.heroEffectSpeed}% · 투명도 {form.heroEffectOpacity}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-5 space-y-4 md:p-4">
                    <p className="text-xs font-bold tracking-wider text-theme-brand">메인 디자인 텍스트 스타일</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">메인 텍스트 색상</span>
                        <div className="flex gap-3">
                            <input
                                className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                                type="color"
                                value={form.heroMainFontColor}
                                onChange={(e) => updateField("heroMainFontColor", e.target.value)}
                            />
                            <input className="input-premium flex-1" value={form.heroMainFontColor} onChange={(e) => updateField("heroMainFontColor", e.target.value)} />
                        </div>
                    </label>
                    <label className="space-y-2 block"></label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">메인 텍스트 폰트</span>
                        <select className="input-premium text-xs" value={form.heroMainFontFamily} onChange={(e) => updateField("heroMainFontFamily", e.target.value)}>
                          {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                            <option key={`hero-main-font-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">메인 텍스트 크기 (px)</span>
                        <input
                          className="input-premium"
                          type="number"
                          min={12}
                          max={42}
                          value={form.heroMainFontSize}
                          onChange={(e) => updateField("heroMainFontSize", Number(e.target.value))}
                        />
                      </label>
                        <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">보조 텍스트 색상</span>
                            <div className="flex gap-3">
                                <input
                                    className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                                    type="color"
                                    value={form.heroSubFontColor}
                                    onChange={(e) => updateField("heroSubFontColor", e.target.value)}
                                />
                                <input className="input-premium flex-1" value={form.heroSubFontColor} onChange={(e) => updateField("heroSubFontColor", e.target.value)} />
                            </div>
                        </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">보조 텍스트 폰트</span>
                        <select className="input-premium text-xs" value={form.heroSubFontFamily} onChange={(e) => updateField("heroSubFontFamily", e.target.value)}>
                          {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                            <option key={`hero-sub-font-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">보조 텍스트 크기 (px)</span>
                        <input
                          className="input-premium"
                          type="number"
                          min={10}
                          max={36}
                          value={form.heroSubFontSize}
                          onChange={(e) => updateField("heroSubFontSize", Number(e.target.value))}
                        />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">장식 문구 폰트</span>
                        <select className="input-premium text-xs" value={form.heroAccentFontFamily} onChange={(e) => updateField("heroAccentFontFamily", e.target.value)}>
                          {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                            <option key={`hero-accent-font-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="text-[11px] text-theme-secondary">메인 화면 폰트/색상은 메인 이미지(히어로)에만 적용됩니다.</p>
                  </div>

                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-5 space-y-4 md:p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-theme-brand">오프닝 애니메이션</p>
                        <p className="mt-1 text-[11px] text-theme-secondary">
                          모바일 청첩장 본문 진입 전에 전체 레이어로 재생됩니다.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold text-theme-secondary">
                        <input
                          type="checkbox"
                          checked={form.openingEnabled}
                          onChange={(e) => updateField("openingEnabled", e.target.checked)}
                        />
                        사용
                      </label>
                    </div>

                    {form.openingEnabled ? (
                      <div className="space-y-4">
                        <label className="space-y-2 block">
                          <span className="text-xs font-bold text-theme-secondary">오프닝 문구 애니메이션</span>
                          <select
                            className="input-premium text-xs"
                            value={form.openingAnimationType}
                            onChange={(e) => updateField("openingAnimationType", e.target.value)}
                          >
                            {OPENING_ANIMATION_OPTIONS.map((option) => (
                              <option key={`opening-animation-${option.id}`} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 block">
                          <span className="text-xs font-bold text-theme-secondary">상단 문구 (이름 영역)</span>
                          <input
                            className="input-premium"
                            value={form.openingTitle}
                            maxLength={40}
                            onChange={(e) => updateField("openingTitle", e.target.value)}
                            placeholder="예: 신랑 신부"
                          />
                        </label>

                        <label className="space-y-2 block">
                          <span className="text-xs font-bold text-theme-secondary">하단 문구</span>
                          <input
                            className="input-premium"
                            value={form.openingMessage}
                            maxLength={60}
                            onChange={(e) => updateField("openingMessage", e.target.value)}
                            placeholder="기본값: 우리 결혼합니다."
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">오프닝 폰트</span>
                            <select
                              className="input-premium text-xs"
                              value={form.openingFontFamily}
                              onChange={(e) => updateField("openingFontFamily", e.target.value)}
                            >
                              {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                                <option key={`opening-font-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">폰트 색상</span>
                            <div className="flex gap-3">
                              <input
                                className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                                type="color"
                                value={form.openingFontColor}
                                onChange={(e) => updateField("openingFontColor", e.target.value)}
                              />
                              <input
                                className="input-premium flex-1"
                                value={form.openingFontColor}
                                onChange={(e) => updateField("openingFontColor", e.target.value)}
                              />
                            </div>
                          </label>
                          <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">상단 문구 크기 (px)</span>
                            <input
                              className="input-premium"
                              type="number"
                              min={MIN_OPENING_TITLE_FONT_SIZE}
                              max={MAX_OPENING_TITLE_FONT_SIZE}
                              value={form.openingTitleFontSize}
                              onChange={(e) =>
                                updateField(
                                  "openingTitleFontSize",
                                  Math.round(
                                    clampHeroEffectValue(
                                      Number(e.target.value) || defaultFormState.openingTitleFontSize,
                                      MIN_OPENING_TITLE_FONT_SIZE,
                                      MAX_OPENING_TITLE_FONT_SIZE,
                                    ),
                                  ),
                                )
                              }
                            />
                          </label>
                          <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">하단 문구 크기 (px)</span>
                            <input
                              className="input-premium"
                              type="number"
                              min={MIN_OPENING_MESSAGE_FONT_SIZE}
                              max={MAX_OPENING_MESSAGE_FONT_SIZE}
                              value={form.openingMessageFontSize}
                              onChange={(e) =>
                                updateField(
                                  "openingMessageFontSize",
                                  Math.round(
                                    clampHeroEffectValue(
                                      Number(e.target.value) || defaultFormState.openingMessageFontSize,
                                      MIN_OPENING_MESSAGE_FONT_SIZE,
                                      MAX_OPENING_MESSAGE_FONT_SIZE,
                                    ),
                                  ),
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">배경 방식</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                                form.openingBackgroundType === "color"
                                  ? "border-theme-brand bg-theme text-theme-brand"
                                  : "border-warm bg-white text-theme-secondary hover:bg-theme/20"
                              }`}
                              type="button"
                              onClick={() => updateField("openingBackgroundType", "color")}
                            >
                              컬러
                            </button>
                            <button
                              className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                                form.openingBackgroundType === "image"
                                  ? "border-theme-brand bg-theme text-theme-brand"
                                  : "border-warm bg-white text-theme-secondary hover:bg-theme/20"
                              }`}
                              type="button"
                              onClick={() => updateField("openingBackgroundType", "image")}
                            >
                              사진
                            </button>
                          </div>
                        </div>

                        {form.openingBackgroundType === "color" ? (
                          <label className="space-y-2 block">
                            <span className="text-xs font-bold text-theme-secondary">오프닝 배경 컬러</span>
                            <div className="flex gap-3">
                              <input
                                className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden"
                                type="color"
                                value={form.openingBackgroundColor}
                                onChange={(e) => updateField("openingBackgroundColor", e.target.value)}
                              />
                              <input
                                className="input-premium flex-1"
                                value={form.openingBackgroundColor}
                                onChange={(e) => updateField("openingBackgroundColor", e.target.value)}
                              />
                            </div>
                          </label>
                        ) : (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">오프닝 배경 사진</span>
                            <div className="relative mx-auto aspect-[3/4] w-[44%] min-w-[130px] max-w-[190px] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center group">
                              {form.openingImageUrl ? (
                                <>
                                  <img className="h-full w-full object-cover" src={resolveAssetUrl(form.openingImageUrl)} alt="Opening Preview" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">이미지 변경</span>
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-400 text-xs text-center px-2">오프닝용 사진을 업로드해 주세요</span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                                disabled={actionLockedUntilSaved}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  updateField("openingBackgroundType", "image");
                                  void handleAssetUpload({ openingImageFile: file });
                                  event.currentTarget.value = "";
                                }}
                              />
                            </div>
                            {form.openingImageUrl ? (
                              <button
                                className="rounded-lg border border-warm bg-white px-3 py-1.5 text-[11px] font-bold text-theme-secondary hover:bg-theme/20"
                                type="button"
                                onClick={() => updateField("openingImageUrl", "")}
                              >
                                오프닝 사진 제거
                              </button>
                            ) : null}

                            <OpeningAnimationPreview
                              openingImageUrl={form.openingImageUrl}
                              openingImageMotionPreset={form.openingImageMotionPreset}
                              openingAnimationType={form.openingAnimationType}
                              openingTitle={form.openingTitle.trim() || buildDefaultOpeningTitle(form.groomName, form.brideName)}
                              openingMessage={form.openingMessage.trim() || defaultFormState.openingMessage}
                              openingFontFamily={form.openingFontFamily}
                              openingFontColor={sanitizeColorValue(form.openingFontColor, defaultFormState.openingFontColor)}
                              openingTitleFontSize={Math.round(
                                clampHeroEffectValue(form.openingTitleFontSize, MIN_OPENING_TITLE_FONT_SIZE, MAX_OPENING_TITLE_FONT_SIZE),
                              )}
                              openingMessageFontSize={Math.round(
                                clampHeroEffectValue(form.openingMessageFontSize, MIN_OPENING_MESSAGE_FONT_SIZE, MAX_OPENING_MESSAGE_FONT_SIZE),
                              )}
                              openingTextOffsetX={clampOpeningTextOffset(form.openingTextOffsetX)}
                              openingTextOffsetY={clampOpeningTextOffset(form.openingTextOffsetY)}
                            />

                            <div className="space-y-2 pt-1">
                              <span className="text-xs font-bold text-theme-secondary">Single 애니메이션 프리셋</span>
                              <div className="overflow-x-auto pb-1">
                                <div className="flex min-w-max gap-2">
                                  {OPENING_IMAGE_MOTION_PRESET_OPTIONS.map((preset) => {
                                    const isActive = form.openingImageMotionPreset === preset.id;
                                    return (
                                      <button
                                        key={`opening-motion-${preset.id}`}
                                        type="button"
                                        onClick={() => updateField("openingImageMotionPreset", preset.id)}
                                        className={`flex h-[92px] w-[92px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 transition-colors ${
                                          isActive
                                            ? "border-theme-brand bg-theme text-theme-brand shadow-sm"
                                            : "border-warm bg-white text-theme-secondary hover:bg-theme/20"
                                        }`}
                                      >
                                        <span className="material-symbols-outlined text-[28px] leading-none">{preset.icon}</span>
                                        <span className="text-[11px] font-semibold leading-tight">{preset.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="rounded-2xl border border-warm bg-white p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-theme-secondary">문구 가로 위치 세부 조정</span>
                            <span className="text-xs font-semibold text-theme-secondary">{form.openingTextOffsetX}px</span>
                          </div>
                          <input
                            type="range"
                            min={MIN_OPENING_TEXT_OFFSET}
                            max={MAX_OPENING_TEXT_OFFSET}
                            value={form.openingTextOffsetX}
                            onChange={(e) => updateField("openingTextOffsetX", clampOpeningTextOffset(Number(e.target.value)))}
                            className="w-full accent-[var(--theme-brand)]"
                          />

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-theme-secondary">문구 세로 위치 세부 조정</span>
                            <span className="text-xs font-semibold text-theme-secondary">{form.openingTextOffsetY}px</span>
                          </div>
                          <input
                            type="range"
                            min={MIN_OPENING_TEXT_OFFSET}
                            max={MAX_OPENING_TEXT_OFFSET}
                            value={form.openingTextOffsetY}
                            onChange={(e) => updateField("openingTextOffsetY", clampOpeningTextOffset(Number(e.target.value)))}
                            className="w-full accent-[var(--theme-brand)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-theme-secondary">사용 시 초대장 본문 이전에 오프닝 레이어가 자동 재생됩니다.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-theme-secondary">초대 메시지</span>
                    <div className="space-y-3">
                      <select
                        aria-label="초대 메시지 폰트"
                        className="input-premium text-xs"
                        value={form.messageFontFamily}
                        onChange={(e) => updateField("messageFontFamily", e.target.value)}
                      >
                        {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                          <option key={`message-font-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <RichTextEditor
                        value={form.message}
                        onChange={(val) => updateField("message", val)}
                        placeholder="축하해주시는 분들께 전할 메시지를 입력해 주세요."
                      />
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            <div id="editor-step-location" className={`${openSections.location ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.location && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("location")}
              >
                <span className="text-lg font-medium text-theme-brand">예식 장소</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.location ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.location ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">제목</span>
                      <input className="input-premium" value={form.locationTitle} onChange={(e) => updateField("locationTitle", e.target.value)} placeholder="예: 오시는 길" />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">예식장 명</span>
                      <input className="input-premium" value={form.locationName} onChange={(e) => updateField("locationName", e.target.value)} placeholder="예: 시그니엘 서울" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">층과 홀</span>
                      <input className="input-premium" value={form.locationFloorHall} onChange={(e) => updateField("locationFloorHall", e.target.value)} placeholder="예: 76층 그랜드볼룸" />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">연락처</span>
                      <input
                        className="input-premium"
                        value={form.locationContact}
                        onChange={(e) => updateContactField("locationContact", e.target.value)}
                        placeholder="숫자와 -만 입력 (최대 14자리)"
                        inputMode="numeric"
                        maxLength={MAX_CONTACT_LENGTH}
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-theme-secondary">주소</span>
                    <div className="flex gap-2">
                      <input
                        className="input-premium flex-1 cursor-pointer bg-gray-50"
                        value={form.address}
                        readOnly
                        placeholder="주소 검색 버튼을 눌러주세요."
                        onClick={() => setIsPostcodeOpen(true)}
                      />
                      <button className="rounded-xl bg-theme-brand px-6 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity" type="button" onClick={() => setIsPostcodeOpen(true)}>
                        주소 검색
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${form.showMap ? 'bg-theme-brand' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${form.showMap ? 'translate-x-4' : ''}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={form.showMap} onChange={(e) => updateField("showMap", e.target.checked)} />
                      <span className="text-xs font-bold text-theme-secondary">지도 표시</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${form.lockMap ? 'bg-theme-brand' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${form.lockMap ? 'translate-x-4' : ''}`} />
                      </div>
                      <input type="checkbox" className="hidden" checked={form.lockMap} onChange={(e) => updateField("lockMap", e.target.checked)} />
                      <span className="text-xs font-bold text-theme-secondary">지도 잠금 (조작 비활성화)</span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div id="editor-step-transport" className={`${openSections.transport ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.transport && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("transport")}
              >
                <span className="text-lg font-medium text-theme-brand">교통 및 기타 (종이청첩장)</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.transport ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.transport ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="space-y-4">
                    <select 
                      className="input-premium text-xs" 
                      value={form.transportFontFamily} 
                      onChange={(e) => updateField("transportFontFamily", e.target.value)}
                    >
                      {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                        <option key={`transport-font-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">지하철 안내</span>
                      <RichTextEditor value={form.subway} onChange={(val) => updateField("subway", val)} />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">버스 안내</span>
                      <RichTextEditor value={form.bus} onChange={(val) => updateField("bus", val)} />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">자가용 안내</span>
                      <RichTextEditor value={form.car} onChange={(val) => updateField("car", val)} />
                    </label>
                  </div>
                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">종이 청첩장 이미지 업로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-theme file:text-theme-brand hover:file:bg-theme-divider disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={actionLockedUntilSaved}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleAssetUpload({ paperInvitationFile: file });
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div id="editor-step-guestbook" className={`${openSections.guestbook ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.guestbook && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("guestbook")}
              >
                <span className="text-lg font-medium text-theme-brand">방명록 설정</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.guestbook ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.guestbook ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <label className="flex items-center gap-2 rounded-xl border border-warm bg-white px-4 py-3 text-sm text-theme-secondary">
                    <input type="checkbox" checked={form.useGuestbook} onChange={(e) => updateField("useGuestbook", e.target.checked)} /> 방명록 섹션 사용
                  </label>
                  <div className="rounded-2xl border border-warm bg-[#fdfcfb] p-5 space-y-4 md:p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-theme-secondary">방명록 등록/미리보기</p>
                      <button
                        className="rounded-lg bg-theme-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                        type="button"
                        onClick={() => setIsGuestbookModalOpen(true)}
                      >
                        방명록 등록
                      </button>
                    </div>
                    {guestbookLoading ? <p className="text-xs text-theme-secondary">불러오는 중...</p> : null}
                    {!guestbookLoading && guestbookEntries.length === 0 ? (
                      <p className="text-xs text-theme-secondary">등록된 방명록이 없습니다.</p>
                    ) : null}
                    {!guestbookLoading && guestbookEntries.length > 0 ? (
                      <div className="space-y-2">
                        {guestbookEntries.slice(0, 5).map((entry) => (
                          <div className="rounded-xl border border-warm bg-white p-3" key={`setting-guestbook-${entry.id}`}>
                            <p className="text-xs font-bold text-theme-brand">{entry.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-theme-secondary">{entry.content}</p>
                            <p className="mt-1 text-[11px] text-gray-400">{formatGuestbookDate(entry.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div id="editor-step-rsvp" className={`${openSections.rsvp ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.rsvp && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("rsvp")}
              >
                <span className="text-lg font-medium text-theme-brand">참석여부 전달 팝업 설정</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.rsvp ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.rsvp ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <label className="flex items-center gap-2 mb-4 rounded-xl border border-warm bg-white px-4 py-3 text-sm text-theme-secondary">
                    <input type="checkbox" checked={form.useRsvpModal} onChange={(e) => updateField("useRsvpModal", e.target.checked)} /> 참석여부 전달 섹션 사용
                  </label>
                  
                  {form.useRsvpModal && (
                    <div className="space-y-4 rounded-2xl border border-warm bg-white p-6 shadow-sm md:p-5">
                      <label className="flex items-center gap-2 rounded-xl border border-warm bg-theme px-4 py-3 text-sm text-theme-secondary">
                        <input
                          type="checkbox"
                          checked={form.rsvpAutoOpenOnLoad}
                          onChange={(e) => updateField("rsvpAutoOpenOnLoad", e.target.checked)}
                        />
                        첫 화면 진입 시 참석여부 전달 안내 모달 자동 표시
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">팝업 제목</span>
                        <input className="input-premium" value={form.rsvpTitle} onChange={(e) => updateField("rsvpTitle", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">팝업 안내 문구</span>
                        <textarea className="input-premium min-h-24" value={form.rsvpMessage} onChange={(e) => updateField("rsvpMessage", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">버튼 텍스트</span>
                        <input className="input-premium" value={form.rsvpButtonText} onChange={(e) => updateField("rsvpButtonText", e.target.value)} />
                      </label>
                      <label className="space-y-2 block">
                        <span className="text-xs font-bold text-theme-secondary">팝업 폰트</span>
                        <select 
                          className="input-premium text-xs" 
                          value={form.rsvpFontFamily} 
                          onChange={(e) => updateField("rsvpFontFamily", e.target.value)}
                        >
                          {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                            <option key={`rsvp-font-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div id="editor-step-music" className={`${openSections.music ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.music && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("music")}
              >
                <span className="text-lg font-medium text-theme-brand">배경음악 설정</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.music ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.music ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-theme-secondary italic block mb-2">Music Library</span>
                    <div className="grid grid-cols-1 gap-2">
                      <label
                        className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer ${form.backgroundMusicUrl === "" ? "border-theme-brand bg-theme/30" : "border-warm bg-white hover:bg-theme/10"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            className="accent-theme-brand"
                            checked={form.backgroundMusicUrl === ""}
                            onChange={() => updateField("backgroundMusicUrl", "")}
                          />
                          <span className="text-sm font-medium text-theme-secondary">사용 안 함</span>
                        </div>
                        <span className="material-symbols-outlined text-[20px] text-theme-secondary">music_off</span>
                      </label>
                      {MP3_LIBRARY.map((music) => (
                        <label 
                          key={music.url} 
                          className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer ${form.backgroundMusicUrl === music.url ? "border-theme-brand bg-theme/30" : "border-warm bg-white hover:bg-theme/10"}`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              className="accent-theme-brand"
                              checked={form.backgroundMusicUrl === music.url} 
                              onChange={() => updateField("backgroundMusicUrl", music.url)} 
                            />
                            <span className="text-sm font-medium text-theme-secondary">{music.name}</span>
                          </div>
                          <button 
                            type="button" 
                            className="text-theme-secondary hover:text-theme-brand"
                            onClick={(e) => {
                              e.preventDefault();
                              void playMusicPreview(music.url);
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px]">play_circle</span>
                          </button>
                        </label>
                      ))}
                      <div className="relative mt-2">
                        <label className="flex items-center gap-2 p-4 rounded-xl border border-warm bg-white hover:bg-theme/10 cursor-pointer">
                          <input type="radio" className="accent-theme-brand" checked={!MP3_LIBRARY.some(m => m.url === form.backgroundMusicUrl) && form.backgroundMusicUrl !== ""} readOnly />
                          <span className="text-sm font-medium text-theme-secondary">직접 업로드</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            disabled={actionLockedUntilSaved}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void handleAssetUpload({ backgroundMusicFile: file });
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <p className="mt-2 text-[11px] text-theme-secondary">업로드한 음악은 본인 계정에서만 사용할 수 있습니다.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div id="editor-step-detail" className={`${openSections.detail ? "block" : "hidden"} relative overflow-hidden rounded-2xl border border-warm bg-white`}>
              {openSections.detail && <div className="absolute left-0 top-0 bottom-0 w-1 bg-theme-accent" />}
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left md:px-8 md:py-4"
                type="button"
                onClick={() => toggleSection("detail")}
              >
                <span className="text-lg font-medium text-theme-brand">상세 내용 (문구/계좌/갤러리)</span>
                <span
                  className={`material-symbols-outlined text-theme-secondary transition-transform duration-200 ${openSections.detail ? "rotate-180" : ""}`}
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  expand_more
                </span>
              </button>
              {openSections.detail ? (
                <div className="space-y-6 px-6 pt-2 pb-10 md:space-y-5 md:px-8 md:pb-8">
                  <div className="space-y-3 rounded-2xl border border-warm bg-[#fdfcfb] p-6 md:p-5">
                    <label className="space-y-2 block">
                      <span className="text-xs font-bold text-theme-secondary">공유 URL</span>
                      <div className="flex gap-2">
                        <input className="input-premium flex-1" placeholder="예: gunho-sebin-wedding" value={form.slug} onChange={(e) => updateField("slug", e.target.value)} />
                        <button
                          className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          onClick={handleSlugCheck}
                          disabled={actionLockedUntilSaved}
                        >
                          중복확인
                        </button>
                      </div>
                    </label>
                    {slugStatus ? <p className="text-xs text-theme-secondary">{slugStatus}</p> : null}
                  </div>

                  <div className="space-y-4 rounded-2xl border border-warm bg-[#fdfcfb] p-6 md:p-5">
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-theme-secondary">
                      <input type="checkbox" checked={form.useSeparateAccounts} onChange={(e) => updateField("useSeparateAccounts", e.target.checked)} />
                      신랑/신부 계좌 분리 사용
                    </label>

                    {!form.useSeparateAccounts ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]">
                        <label className="space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">은행</span>
                          <select className="input-premium" value={form.accountBank} onChange={(e) => updateField("accountBank", e.target.value)}>
                            <option value="">은행 선택</option>
                            {BANK_OPTIONS.map((bank) => (
                              <option key={bank} value={bank}>
                                {bank}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-bold text-theme-secondary">입금 계좌</span>
                          <input
                            className="input-premium"
                            value={form.accountNumber}
                            onChange={(e) => updateAccountField("accountNumber", e.target.value)}
                            inputMode="numeric"
                            maxLength={MAX_ACCOUNT_LENGTH}
                            placeholder="숫자만 입력 (최대 14자리)"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]">
                          <label className="space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">신랑측 은행</span>
                            <select className="input-premium" value={form.groomAccountBank} onChange={(e) => updateField("groomAccountBank", e.target.value)}>
                              <option value="">은행 선택</option>
                              {BANK_OPTIONS.map((bank) => (
                                <option key={`groom-${bank}`} value={bank}>
                                  {bank}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">신랑측 입금 계좌</span>
                            <input
                              className="input-premium"
                              value={form.groomAccountNumber}
                              onChange={(e) => updateAccountField("groomAccountNumber", e.target.value)}
                              inputMode="numeric"
                              maxLength={MAX_ACCOUNT_LENGTH}
                              placeholder="숫자만 입력 (최대 14자리)"
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[170px_1fr]">
                          <label className="space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">신부측 은행</span>
                            <select className="input-premium" value={form.brideAccountBank} onChange={(e) => updateField("brideAccountBank", e.target.value)}>
                              <option value="">은행 선택</option>
                              {BANK_OPTIONS.map((bank) => (
                                <option key={`bride-${bank}`} value={bank}>
                                  {bank}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold text-theme-secondary">신부측 입금 계좌</span>
                            <input
                              className="input-premium"
                              value={form.brideAccountNumber}
                              onChange={(e) => updateAccountField("brideAccountNumber", e.target.value)}
                              inputMode="numeric"
                              maxLength={MAX_ACCOUNT_LENGTH}
                              placeholder="숫자만 입력 (최대 14자리)"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-bold text-theme-secondary">폰트 종류 (메인 이미지 제외)</span>
                      <select className="input-premium" value={form.themeFontFamily} onChange={(e) => updateField("themeFontFamily", e.target.value)}>
                        {EDITOR_FONT_FAMILY_OPTIONS.map((option) => (
                          <option key={`main-font-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-bold text-theme-secondary">폰트 크기(px)</span>
                      <input
                        className="input-premium"
                        type="number"
                        min={MIN_THEME_FONT_SIZE}
                        max={MAX_THEME_FONT_SIZE}
                        value={form.themeFontSize}
                        onChange={(e) =>
                          updateField(
                            "themeFontSize",
                            Math.round(clampHeroEffectValue(Number(e.target.value), MIN_THEME_FONT_SIZE, MAX_THEME_FONT_SIZE)),
                          )
                        }
                      />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">기본 텍스트 컬러 (메인 이미지 제외)</span>
                    <div className="flex gap-4">
                      <input className="h-10 w-14 cursor-pointer rounded border border-warm overflow-hidden" type="color" value={form.themeTextColor} onChange={(e) => updateField("themeTextColor", e.target.value)} />
                      <input className="input-premium flex-1" value={form.themeTextColor} onChange={(e) => updateField("themeTextColor", e.target.value)} />
                    </div>
                  </label>

                  <div className="space-y-3 rounded-2xl border border-warm bg-white p-4">
                    <span className="text-xs font-bold text-theme-secondary">미리보기 대표 이미지</span>
                    <div className="flex flex-col gap-3">
                      <div className="relative aspect-[4/3] w-full max-w-[200px] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white group">
                        {seoImagePreviewUrl ? (
                          <>
                            <img className="h-full w-full object-cover" src={seoImagePreviewUrl} alt="미리보기 대표 이미지" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-xs font-bold text-white">이미지 변경</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] text-gray-400">
                            미리보기 대표 이미지를 업로드해 주세요
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                          disabled={actionLockedUntilSaved}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleAssetUpload({ seoImageFile: file });
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">갤러리 제목</span>
                    <input className="input-premium" value={form.galleryTitle} onChange={(e) => updateField("galleryTitle", e.target.value)} />
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-theme-secondary">갤러리 타입</span>
                    <div className="flex gap-2">
                      {[
                        { id: "swipe", label: "스와이프" },
                        { id: "thumbnail-swipe", label: "썸네일 스와이프" },
                        { id: "grid", label: "그리드" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                            form.galleryType === item.id
                              ? "bg-theme-brand text-white"
                              : "border border-warm bg-white text-theme-secondary hover:bg-theme"
                          }`}
                          onClick={() => updateField("galleryType", item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block space-y-2 text-sm">
                    <span className="text-xs font-bold text-theme-secondary">갤러리 이미지 업로드 (1장씩 업로드)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="text-xs text-theme-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-theme file:text-theme-brand hover:file:bg-theme-divider disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={actionLockedUntilSaved}
                      onChange={(event) => {
                        const files = event.target.files;
                        if (files && files.length > 1) {
                          setSlugStatus("갤러리 이미지는 한 번에 1장씩만 업로드할 수 있습니다.");
                          event.currentTarget.value = "";
                          return;
                        }

                        const file = files?.[0];
                        if (file) {
                          void handleAssetUpload({ galleryFile: file });
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">미리보기 제목</span>
                    <input className="input-premium" value={form.seoTitle} onChange={(e) => updateField("seoTitle", e.target.value)} />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-xs font-bold text-theme-secondary">미리 보기 설명</span>
                    <textarea className="input-premium" value={form.seoDescription} onChange={(e) => updateField("seoDescription", e.target.value)} />
                  </label>

                  {uploading ? <p className="text-xs text-theme-secondary">파일 업로드 중...</p> : null}

                  {form.imageUrls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {form.imageUrls.map((url, index) => (
                        <div className="relative group" key={`${url}-${index}`}>
                          <img className="aspect-square w-full rounded-lg object-cover border border-warm shadow-sm" src={resolveAssetUrl(url)} alt={`gallery-upload-${index + 1}`} />
                          <button
                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            type="button"
                            onClick={() => updateField("imageUrls", form.imageUrls.filter((_, i) => i !== index))}
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
                </div>
              </div>
            </div>

            <div className="h-6" />
          </form>
        </section>
      </main>

      {/* 방명록 등록 모달 */}
      {isGuestbookModalOpen && (
        <div className="fixed inset-0 z-[98] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-warm px-8 py-5 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">방명록 등록</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-900 transition-colors"
                onClick={() => setIsGuestbookModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto bg-[#fdfcfb] px-8 py-6">
              <form className="space-y-4 rounded-2xl border border-warm bg-white p-5" onSubmit={handleGuestbookSubmit}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-theme-secondary">이름</span>
                    <input
                      className="input-premium"
                      value={guestbookForm.name}
                      maxLength={30}
                      onChange={(event) => setGuestbookForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="작성자 이름"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-theme-secondary">비밀번호</span>
                    <input
                      className="input-premium"
                      type="password"
                      value={guestbookForm.password}
                      maxLength={30}
                      onChange={(event) => setGuestbookForm((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="삭제/수정용 비밀번호"
                    />
                  </label>
                </div>
                <label className="space-y-2 block">
                  <span className="text-xs font-bold text-theme-secondary">내용</span>
                  <textarea
                    className="input-premium min-h-28"
                    value={guestbookForm.content}
                    maxLength={1000}
                    onChange={(event) => setGuestbookForm((prev) => ({ ...prev, content: event.target.value }))}
                    placeholder="축하 메시지를 남겨주세요."
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-warm px-4 py-2 text-xs font-bold text-theme-secondary hover:bg-theme"
                    onClick={() => setIsGuestbookModalOpen(false)}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-theme-brand px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                    disabled={guestbookSaving}
                  >
                    {guestbookSaving ? "등록중..." : "등록하기"}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <p className="text-xs font-bold text-theme-secondary">등록된 방명록</p>
                {guestbookLoading ? <p className="text-xs text-theme-secondary">불러오는 중...</p> : null}
                {!guestbookLoading && guestbookEntries.length === 0 ? (
                  <div className="rounded-xl border border-warm bg-white p-4 text-xs text-theme-secondary">등록된 방명록이 없습니다.</div>
                ) : null}
                {!guestbookLoading && guestbookEntries.length > 0 ? (
                  <div className="space-y-2">
                    {guestbookEntries.map((entry) => (
                      <div className="rounded-xl border border-warm bg-white p-3" key={`modal-guestbook-${entry.id}`}>
                        <p className="text-xs font-bold text-theme-brand">
                          {entry.name}
                          <span className="ml-2 font-normal text-gray-400">{formatGuestbookDate(entry.createdAt)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-theme-secondary">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 디자인 선택 모달 */}
      {isDesignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white shadow-2xl flex flex-col">
            <header className="px-10 py-6 border-b border-warm flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-gray-800">메인 화면 디자인 선택</h3>
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-900 transition-colors"
                onClick={() => {
                  setSelectedHeroDesign(form.heroDesignId);
                  setIsDesignModalOpen(false);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#fdfcfb]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {HERO_DESIGNS.map((design) => (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => setSelectedHeroDesign(design.id)}
                    className={`group relative flex flex-col gap-3 text-left transition-all ${selectedHeroDesign === design.id ? "scale-[1.02]" : "hover:scale-[1.01]"}`}
                  >
                    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-4 transition-all shadow-md ${selectedHeroDesign === design.id ? "border-theme-brand ring-4 ring-theme-brand/20" : "border-white hover:border-warm"}`}>
                      {/* 템플릿 미리보기 시뮬레이션 */}
                      <div className="absolute inset-0 bg-stone-100">
                        {form.mainImageUrl ? (
                          <img className="h-full w-full object-cover" src={resolveAssetUrl(form.mainImageUrl)} alt="Preview" />
                        ) : (
                          <div className="w-full h-full bg-stone-200 flex items-center justify-center text-[10px] text-gray-400">이미지 없음</div>
                        )}
                        <div className="absolute inset-0 bg-[#4f5568]/20" />
                        
                        {/* 디자인 오버레이 미리보기 */}
                        {design.id === "happy-wedding-day" && (
                          <div className="absolute inset-0 p-3 pointer-events-none">
                            <div className="flex items-center gap-1 text-[6px] text-white/90">
                              <span>{weddingTitle}</span>
                              <span className="h-px flex-1 bg-white/70" />
                              <span>결혼합니다</span>
                            </div>
                            <p className="absolute left-5 top-[22%] text-[20px] leading-[0.88] text-pink-300 font-semibold">Happy<br/>Wedding<br/>Day</p>
                            <div className="absolute inset-x-0 bottom-3 text-center text-[6px] text-white/90">
                              <p>{form.date ? formatWeddingDate(form.date) : "2030년 8월 10일 오후 1시 정각"}</p>
                            </div>
                          </div>
                        )}
                        {design.id === "happily-ever-after" && (
                          <div className="absolute inset-0 pointer-events-none bg-black/30">
                            <div className="absolute inset-x-0 top-2 text-center text-[5px] text-white/90">{weddingTitle}</div>
                            <p className="absolute left-2 top-[16%] text-[16px] leading-none text-amber-300 font-semibold">Happily</p>
                            <p className="absolute left-1 bottom-[18%] text-[15px] leading-[0.9] text-amber-300 font-semibold">Ever<br/>After</p>
                          </div>
                        )}
                        {design.id === "blush-circle" && (
                          <div className="absolute inset-0 pointer-events-none bg-[#e8d4d8]">
                            <div className="absolute inset-x-0 top-4 text-center text-[7px] text-[#3f3338]">
                              <p className="font-semibold">결혼합니다</p>
                              <p className="mt-1">{weddingTitle}</p>
                            </div>
                            <div className="absolute left-1/2 top-[52%] h-[70px] w-[70px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-sky-200/60" />
                            <div className="absolute inset-x-0 bottom-3 text-center text-[6px] text-[#3f3338]">2030.08.17</div>
                          </div>
                        )}
                        {design.id === "two-become-one" && (
                          <div className="absolute inset-0 pointer-events-none bg-[#baa596]/90">
                            <p className="absolute inset-x-0 top-3 text-center text-[9px] leading-[0.95] text-white/95 font-semibold">
                              TWO<br/>BECOME<br/>ONE
                            </p>
                            <div className="absolute inset-x-3 top-[42%] h-[42%] bg-white/30" />
                          </div>
                        )}
                        {design.id === "sky-invitation" && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-x-0 top-4 text-center text-[7px] text-[#2d3d4d]">
                              <p className="font-semibold">결혼합니다</p>
                              <p className="text-[6px] text-cyan-100 mt-0.5">Wedding Invitation</p>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-[28%] bg-white/90 text-center text-[5px] text-[#444] flex flex-col items-center justify-center">
                              <p>2030년 3월 30일 오후 12시 정각</p>
                            </div>
                          </div>
                        )}
                        {design.id === "simply-meant" && (
                          <div className="absolute inset-0 p-3 flex flex-col justify-between text-[6px] text-white/80 pointer-events-none scale-[0.6]">
                            <div className="flex justify-between font-bold"><span>SIMPLY</span><span>MEANT</span></div>
                            <div className="text-center font-bold text-[30px] leading-none opacity-90">26<br/>10<br/>24</div>
                            <div className="flex justify-between font-bold"><span>TO BE</span><span>TOGETHER</span></div>
                          </div>
                        )}
                        {design.id === "modern-center" && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center bg-black/10 scale-[0.7] pointer-events-none">
                            <p className="text-[6px] tracking-widest mb-2">2026 / 10 / 24</p>
                            <div className="w-4 h-px bg-white/50 my-2" />
                            <p className="text-[10px] font-bold">{weddingTitle}</p>
                          </div>
                        )}
                        {design.id === "serif-classic" && (
                          <div className="absolute inset-0 p-3 flex flex-col items-center justify-center text-white scale-[0.6] pointer-events-none">
                            <div className="border border-white/30 p-4 w-full h-full flex flex-col items-center justify-center">
                              <p className="serif-font text-2xl mb-2">10.24</p>
                              <p className="text-[8px] tracking-widest font-medium">{weddingTitle}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedHeroDesign === design.id && (
                        <div className="absolute top-3 right-3 z-20 bg-theme-brand text-white rounded-full p-1 shadow-lg">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{design.name}</p>
                      <p className="text-[11px] text-theme-secondary opacity-70 leading-tight">{design.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <footer className="px-10 py-6 border-t border-warm bg-white flex gap-3 shrink-0">
              <button 
                type="button" 
                className="flex-1 rounded-2xl border border-warm py-4 text-sm font-bold text-theme-secondary hover:bg-theme transition-colors"
                onClick={() => {
                  setSelectedHeroDesign(form.heroDesignId);
                  setIsDesignModalOpen(false);
                }}
              >
                닫기
              </button>
              <button 
                type="button" 
                className="flex-[2] rounded-2xl bg-theme-brand py-4 text-sm font-bold text-white shadow-lg shadow-theme-brand/20 hover:opacity-90 transition-opacity"
                onClick={() => {
                  updateField("heroDesignId", selectedHeroDesign);
                  setIsDesignModalOpen(false);
                }}
              >
                적용하기
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* 이펙트 선택 모달 */}
      {isEffectModalOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white shadow-2xl flex flex-col">
            <header className="px-10 py-6 border-b border-warm flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-gray-800">메인 화면 이펙트 선택</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-900 transition-colors"
                onClick={() => {
                  setSelectedHeroEffect(form.heroEffectType);
                  setSelectedHeroEffectParticleCount(form.heroEffectParticleCount);
                  setSelectedHeroEffectSpeed(form.heroEffectSpeed);
                  setSelectedHeroEffectOpacity(form.heroEffectOpacity);
                  setIsEffectModalOpen(false);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-[#fdfcfb] space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {HERO_EFFECTS.map((effect) => (
                  <button
                    key={effect.id}
                    type="button"
                    onClick={() => setSelectedHeroEffect(effect.id)}
                    className={`group relative flex flex-col gap-3 text-left transition-all ${selectedHeroEffect === effect.id ? "scale-[1.02]" : "hover:scale-[1.01]"}`}
                  >
                    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-4 transition-all shadow-md ${selectedHeroEffect === effect.id ? "border-theme-brand ring-4 ring-theme-brand/20" : "border-white hover:border-warm"}`}>
                      <div className="absolute inset-0 bg-stone-100">
                        {form.mainImageUrl ? (
                          <img className="h-full w-full object-cover" src={resolveAssetUrl(form.mainImageUrl)} alt="Effect Preview" />
                        ) : (
                          <div className="w-full h-full bg-stone-200 flex items-center justify-center text-[10px] text-gray-400">이미지 없음</div>
                        )}
                        {renderHeroEffectLayer(effect.id, {
                          particleCount: selectedHeroEffectParticleCount,
                          speed: selectedHeroEffectSpeed,
                          opacity: selectedHeroEffectOpacity,
                        })}
                      </div>

                      {selectedHeroEffect === effect.id && (
                        <div className="absolute top-3 right-3 z-20 bg-theme-brand text-white rounded-full p-1 shadow-lg">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{effect.name}</p>
                      <p className="text-[11px] text-theme-secondary opacity-70 leading-tight">{effect.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className={`rounded-2xl border border-warm bg-white p-6 space-y-5 ${selectedHeroEffect === "none" ? "opacity-50" : ""}`}>
                <p className="text-xs font-bold text-theme-secondary">이펙트 세부 설정</p>
                <label className="block space-y-2">
                  <div className="flex items-center justify-between text-xs text-theme-secondary">
                    <span className="font-bold">입자 수</span>
                    <span>{selectedHeroEffectParticleCount}</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={120}
                    step={1}
                    disabled={selectedHeroEffect === "none"}
                    value={selectedHeroEffectParticleCount}
                    onChange={(event) => setSelectedHeroEffectParticleCount(Number(event.target.value))}
                    className="w-full accent-[var(--theme-brand)]"
                  />
                </label>
                <label className="block space-y-2">
                  <div className="flex items-center justify-between text-xs text-theme-secondary">
                    <span className="font-bold">속도</span>
                    <span>{selectedHeroEffectSpeed}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={220}
                    step={1}
                    disabled={selectedHeroEffect === "none"}
                    value={selectedHeroEffectSpeed}
                    onChange={(event) => setSelectedHeroEffectSpeed(Number(event.target.value))}
                    className="w-full accent-[var(--theme-brand)]"
                  />
                </label>
                <label className="block space-y-2">
                  <div className="flex items-center justify-between text-xs text-theme-secondary">
                    <span className="font-bold">투명도</span>
                    <span>{selectedHeroEffectOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    step={1}
                    disabled={selectedHeroEffect === "none"}
                    value={selectedHeroEffectOpacity}
                    onChange={(event) => setSelectedHeroEffectOpacity(Number(event.target.value))}
                    className="w-full accent-[var(--theme-brand)]"
                  />
                </label>
              </div>
            </div>

            <footer className="px-10 py-6 border-t border-warm bg-white flex gap-3 shrink-0">
              <button
                type="button"
                className="flex-1 rounded-2xl border border-warm py-4 text-sm font-bold text-theme-secondary hover:bg-theme transition-colors"
                onClick={() => {
                  setSelectedHeroEffect(form.heroEffectType);
                  setSelectedHeroEffectParticleCount(form.heroEffectParticleCount);
                  setSelectedHeroEffectSpeed(form.heroEffectSpeed);
                  setSelectedHeroEffectOpacity(form.heroEffectOpacity);
                  setIsEffectModalOpen(false);
                }}
              >
                닫기
              </button>
              <button
                type="button"
                className="flex-[2] rounded-2xl bg-theme-brand py-4 text-sm font-bold text-white shadow-lg shadow-theme-brand/20 hover:opacity-90 transition-opacity"
                onClick={() => {
                  updateField("heroEffectType", selectedHeroEffect);
                  updateField("heroEffectParticleCount", selectedHeroEffectParticleCount);
                  updateField("heroEffectSpeed", selectedHeroEffectSpeed);
                  updateField("heroEffectOpacity", selectedHeroEffectOpacity);
                  setIsEffectModalOpen(false);
                }}
              >
                적용하기
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* 주소 검색 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-[500px] h-[600px] overflow-hidden rounded-[2rem] bg-white shadow-2xl flex flex-col">
            <header className="px-8 py-5 border-b border-warm flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-gray-800">주소 검색</h3>
              <button type="button" className="text-gray-400 hover:text-gray-900 transition-colors" onClick={() => setIsPostcodeOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>
            <div id="postcode-container" className="flex-1 w-full h-full" />
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 768px) {
          .editor-page .editor-form-panel .input-premium {
            font-size: 0.8125rem;
            padding: 0.625rem 0.75rem;
          }

          .editor-page .editor-form-panel textarea.input-premium {
            min-height: 5rem;
          }

          .editor-page .editor-form-panel [id^="editor-step-"] > button > span:first-child {
            font-size: 1rem;
            line-height: 1.4;
          }

          .editor-page .editor-form-panel .ql-toolbar.ql-snow {
            padding: 6px 10px !important;
          }

          .editor-page .editor-form-panel .ql-container.ql-snow,
          .editor-page .editor-form-panel .ql-editor {
            min-height: 108px !important;
          }

          .editor-page .editor-form-panel .ql-editor {
            font-size: 0.8125rem;
            line-height: 1.7;
            padding: 12px 14px !important;
          }
        }
      `}</style>
      <EditorToast toast={toast} />
    </div>
  );
}
