"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/assets";
import { normalizeFontFamilyValue } from "@/lib/font-family-options";
import {
  THEME_DEFAULTS,
  buildThemeParticles,
  buildThemePatternStyle,
  clampThemeFontSize,
  normalizeHexColor,
  toRgba,
} from "@/components/mobile/theme-utils";
import InvitationLocationMap from "./InvitationLocationMap";
import WeddingGallery from "@/components/WeddingGallery";
import MapShortcutButtons from "@/components/MapShortcutButtons";
import CopyTextButton from "@/components/CopyTextButton";
import GuestbookSection from "./GuestbookSection";
import RsvpEntryModal from "./RsvpEntryModal";
import InvitationFullscreenModal from "./InvitationFullscreenModal";

export type InvitationMobileViewData = {
  id: string;
  slug?: string;
  groomName: string;
  brideName: string;
  weddingDateTime: string;
  venueName: string;
  venueAddress: string;
  coverImageUrl?: string;
  mainImageUrl?: string;
  imageUrls: string[];
  messageLines: string[];
  message?: string;
  groomContact?: string;
  brideContact?: string;
  groomFatherName?: string;
  groomFatherContact?: string;
  groomMotherName?: string;
  groomMotherContact?: string;
  brideFatherName?: string;
  brideFatherContact?: string;
  brideMotherName?: string;
  brideMotherContact?: string;
  subway?: string;
  bus?: string;
  car?: string;
  fontFamily?: string;
  fontColor?: string;
  fontSize?: number;
  heroMainFontFamily?: string;
  heroMainFontColor?: string;
  heroMainFontSize?: number;
  heroSubFontFamily?: string;
  heroSubFontColor?: string;
  heroSubFontSize?: number;
  useSeparateAccounts: boolean;
  useGuestbook: boolean;
  useRsvpModal: boolean;
  rsvpAutoOpenOnLoad?: boolean;
  backgroundMusicUrl?: string;
  accountNumber?: string;
  groomAccountNumber?: string;
  brideAccountNumber?: string;
  galleryTitle?: string;
  galleryType?: string;
  themeBackgroundColor?: string;
  themeTextColor?: string;
  themeAccentColor?: string;
  themePatternColor?: string;
  themePattern?: string;
  themeEffectType?: string;
  themeFontFamily?: string;
  themeFontSize?: number;
  themeScrollReveal?: boolean;
  heroDesignId?: string;
  heroEffectType?: string;
  heroEffectParticleCount?: number;
  heroEffectSpeed?: number;
  heroEffectOpacity?: number;
  heroAccentFontFamily?: string;
  messageFontFamily?: string;
  transportFontFamily?: string;
  rsvpTitle?: string;
  rsvpMessage?: string;
  rsvpButtonText?: string;
  rsvpFontFamily?: string;
  detailContent?: string;
  detailFontFamily?: string;
  seoImageUrl?: string;
  locationTitle?: string;
  locationFloorHall?: string;
  locationContact?: string;
  showMap?: boolean;
  lockMap?: boolean;
  openingEnabled?: boolean;
  openingAnimationType?: string;
  openingBackgroundType?: string;
  openingBackgroundColor?: string;
  openingImageUrl?: string;
  openingImageMotionPreset?: string;
  openingTitle?: string;
  openingMessage?: string;
  openingTextOffsetX?: number;
  openingTextOffsetY?: number;
  openingFontFamily?: string;
  openingFontColor?: string;
  openingTitleFontSize?: number;
  openingMessageFontSize?: number;
};

type HeroEffectOptions = {
  particleCount: number;
  speed: number;
  opacity: number;
};

type InvitationMobileViewProps = {
  invitation: InvitationMobileViewData;
  apiBaseUrl?: string;
  preview?: boolean;
  invitationIdForActions: string;
  slugForActions: string;
  embedded?: boolean;
};

const INVALID_ASSET_URL_TOKENS = new Set(["null", "undefined", "nan"]);
const OPENING_BACKGROUND_DEFAULT = "#e6d8ca";
const OPENING_TITLE_DEFAULT = "신랑 신부";
const OPENING_MESSAGE_DEFAULT = "우리 결혼합니다.";
const OPENING_TITLE_SIZE_DEFAULT = 34;
const OPENING_MESSAGE_SIZE_DEFAULT = 19;
const OPENING_TYPEWRITER_STEP_MS = 92;
const OPENING_CLOSE_DELAY_MS = 900;
const OPENING_CLOSE_DURATION_MS = 680;
const OPENING_IMAGE_MOTION_PRESET_IDS = new Set([
  "none",
  "zoom-in",
  "zoom-out",
  "move-right",
  "move-down",
  "diag-left",
  "diag-right",
  "diag-zoom-in",
  "diag-zoom-out",
  "circle",
]);

const HERO_EFFECT_DEFAULTS: HeroEffectOptions = {
  particleCount: 30,
  speed: 100,
  opacity: 72,
};
const HERO_ACCENT_FONT_FAMILY = "'Playfair Display', serif";

function clampHeroEffectValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
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

function createTelHref(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function createSmsHref(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `sms:${digits}` : "";
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

function normalizeOpeningImageMotionPreset(value?: string | null): string {
  if (!value) return "none";
  return OPENING_IMAGE_MOTION_PRESET_IDS.has(value) ? value : "none";
}

function pickReadableTextColor(backgroundHex: string): string {
  const normalized = normalizeHexColor(backgroundHex, OPENING_BACKGROUND_DEFAULT);
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luma = (red * 299 + green * 587 + blue * 114) / 1000;
  return luma >= 160 ? "#202228" : "#ffffff";
}

const SEOUL_TIME_ZONE = "Asia/Seoul";

type SeoulDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseSeoulDateParts(rawDate: string): SeoulDateParts | null {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(parsed);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? NaN);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? NaN);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? NaN);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? NaN);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? NaN);

  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;

  return { year, month, day, hour, minute };
}

function formatInvitationDate(dateTime: string) {
  const parts = parseSeoulDateParts(dateTime);
  if (!parts) {
    return {
      infoDate: "2026년 5월 23일 토요일 낮 12시 30분",
      year: "2026",
      yearShort: "26",
      month: "05",
      day: "23",
    };
  }

  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
  const year = String(parts.year);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = parts.hour;
  const minute = String(parts.minute).padStart(2, "0");

  const ampmText = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return {
    infoDate: `${year}년 ${Number(month)}월 ${Number(day)}일 ${weekdayKo}요일 ${ampmText} ${hour12}시 ${minute}분`,
    year,
    yearShort: year.slice(-2),
    month,
    day: String(Number(day)),
  };
}

function buildCalendarInfo(rawDate: string) {
  if (!rawDate) {
    return { days: [] as Array<number | null>, weddingDay: 24, fullDateText: "2026.10.24", weekdayTimeText: "토요일 오후 12시 00분" };
  }

  const parts = parseSeoulDateParts(rawDate);
  if (!parts) {
    return { days: [] as Array<number | null>, weddingDay: 24, fullDateText: rawDate, weekdayTimeText: rawDate };
  }

  const year = parts.year;
  const month = parts.month - 1;
  const weddingDay = parts.day;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  const days: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) days.push(null);
  for (let i = 1; i <= lastDate; i += 1) days.push(i);

  const formattedDateText = `${year}.${String(month + 1).padStart(2, "0")}.${String(weddingDay).padStart(2, "0")}`;
  const weekday = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  ];
  const ampm = parts.hour < 12 ? "오전" : "오후";
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const weekdayTimeText = `${weekday} ${ampm} ${hour12}시 ${String(parts.minute).padStart(2, "0")}분`;

  return {
    days,
    weddingDay,
    fullDateText: formattedDateText,
    weekdayTimeText,
  };
}

function buildCountdownInfo(rawDate: string, nowMs: number) {
  if (!rawDate) return { days: "00", hours: "00", mins: "00", secs: "00", diffDaysText: "0" };
  const target = new Date(rawDate).getTime();
  const diff = target - nowMs;

  if (!Number.isFinite(target) || diff <= 0) return { days: "00", hours: "00", mins: "00", secs: "00", diffDaysText: "0" };

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    days: String(d).padStart(2, "0"),
    hours: String(h).padStart(2, "0"),
    mins: String(m).padStart(2, "0"),
    secs: String(s).padStart(2, "0"),
    diffDaysText: String(d),
  };
}

export default function InvitationMobileView({
  invitation,
  apiBaseUrl,
  preview = false,
  invitationIdForActions,
  slugForActions,
  embedded = false,
}: InvitationMobileViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBackgroundMusicPlaying, setIsBackgroundMusicPlaying] = useState(false);
  const [backgroundMusicError, setBackgroundMusicError] = useState<string | null>(null);
  const [isOpeningVisible, setIsOpeningVisible] = useState(false);
  const [isOpeningClosing, setIsOpeningClosing] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [typedOpeningTitle, setTypedOpeningTitle] = useState("");
  const [typedOpeningMessage, setTypedOpeningMessage] = useState("");
  const [openingViewportHeight, setOpeningViewportHeight] = useState(720);
  const dateInfo = useMemo(() => formatInvitationDate(invitation.weddingDateTime), [invitation.weddingDateTime]);
  const calendarInfo = useMemo(() => buildCalendarInfo(invitation.weddingDateTime), [invitation.weddingDateTime]);
  const [countdownInfo, setCountdownInfo] = useState(() => ({ days: "00", hours: "00", mins: "00", secs: "00", diffDaysText: "0" }));
  const groomTel = useMemo(() => createTelHref(invitation.groomContact), [invitation.groomContact]);
  const brideTel = useMemo(() => createTelHref(invitation.brideContact), [invitation.brideContact]);
  const groomFatherTel = useMemo(() => createTelHref(invitation.groomFatherContact), [invitation.groomFatherContact]);
  const groomMotherTel = useMemo(() => createTelHref(invitation.groomMotherContact), [invitation.groomMotherContact]);
  const brideFatherTel = useMemo(() => createTelHref(invitation.brideFatherContact), [invitation.brideFatherContact]);
  const brideMotherTel = useMemo(() => createTelHref(invitation.brideMotherContact), [invitation.brideMotherContact]);
  const groomSms = useMemo(() => createSmsHref(invitation.groomContact), [invitation.groomContact]);
  const brideSms = useMemo(() => createSmsHref(invitation.brideContact), [invitation.brideContact]);
  const groomFatherSms = useMemo(() => createSmsHref(invitation.groomFatherContact), [invitation.groomFatherContact]);
  const groomMotherSms = useMemo(() => createSmsHref(invitation.groomMotherContact), [invitation.groomMotherContact]);
  const brideFatherSms = useMemo(() => createSmsHref(invitation.brideFatherContact), [invitation.brideFatherContact]);
  const brideMotherSms = useMemo(() => createSmsHref(invitation.brideMotherContact), [invitation.brideMotherContact]);
  const themeBackgroundColor = useMemo(
    () => normalizeHexColor(invitation.themeBackgroundColor, THEME_DEFAULTS.backgroundColor),
    [invitation.themeBackgroundColor],
  );
  const themeTextColor = useMemo(
    () => normalizeHexColor(invitation.themeTextColor, THEME_DEFAULTS.textColor),
    [invitation.themeTextColor],
  );
  const themeAccentColor = useMemo(
    () => normalizeHexColor(invitation.themeAccentColor, THEME_DEFAULTS.accentColor),
    [invitation.themeAccentColor],
  );
  const themePatternColor = useMemo(
    () => normalizeHexColor(invitation.themePatternColor, themeAccentColor),
    [invitation.themePatternColor, themeAccentColor],
  );
  const themePattern = invitation.themePattern ?? THEME_DEFAULTS.pattern;
  const themeEffectType = invitation.themeEffectType ?? THEME_DEFAULTS.effectType;
  const contentFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.themeFontFamily, THEME_DEFAULTS.fontFamily),
    [invitation.themeFontFamily],
  );
  const heroMainFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.heroMainFontFamily ?? invitation.fontFamily, contentFontFamily),
    [invitation.heroMainFontFamily, invitation.fontFamily, contentFontFamily],
  );
  const heroSubFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.heroSubFontFamily ?? invitation.fontFamily, contentFontFamily),
    [invitation.heroSubFontFamily, invitation.fontFamily, contentFontFamily],
  );
  const themeFontSize = useMemo(() => clampThemeFontSize(invitation.themeFontSize), [invitation.themeFontSize]);
  const messageFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.messageFontFamily, contentFontFamily),
    [invitation.messageFontFamily, contentFontFamily],
  );
  const transportFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.transportFontFamily, contentFontFamily),
    [invitation.transportFontFamily, contentFontFamily],
  );
  const rsvpFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.rsvpFontFamily, contentFontFamily),
    [invitation.rsvpFontFamily, contentFontFamily],
  );
  const detailFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.detailFontFamily, contentFontFamily),
    [invitation.detailFontFamily, contentFontFamily],
  );
  const backgroundMusicUrl = useMemo(() => sanitizeAssetUrl(invitation.backgroundMusicUrl), [invitation.backgroundMusicUrl]);
  const backgroundMusicSrc = useMemo(
    () => (backgroundMusicUrl ? resolveAssetUrl(backgroundMusicUrl, apiBaseUrl) : ""),
    [backgroundMusicUrl, apiBaseUrl],
  );
  const weddingTitle = `${invitation.groomName || "신랑"} & ${invitation.brideName || "신부"}`;
  const openingAnimationType = useMemo(() => {
    if (invitation.openingAnimationType === "typewriter") return "typewriter";
    if (invitation.openingAnimationType === "soft-fade") return "soft-fade";
    return "none";
  }, [invitation.openingAnimationType]);
  const openingEnabled = (invitation.openingEnabled ?? false) && openingAnimationType !== "none";
  const openingBackgroundType = invitation.openingBackgroundType === "image" ? "image" : "color";
  const openingBackgroundColor = useMemo(
    () => normalizeHexColor(invitation.openingBackgroundColor, OPENING_BACKGROUND_DEFAULT),
    [invitation.openingBackgroundColor],
  );
  const openingImageUrl = useMemo(
    () => resolveAssetUrl(sanitizeAssetUrl(invitation.openingImageUrl), apiBaseUrl),
    [invitation.openingImageUrl, apiBaseUrl],
  );
  const openingImageMotionPreset = useMemo(
    () => normalizeOpeningImageMotionPreset(invitation.openingImageMotionPreset),
    [invitation.openingImageMotionPreset],
  );
  const openingMessageText = useMemo(() => {
    const normalized = invitation.openingMessage?.trim() ?? "";
    return normalized || OPENING_MESSAGE_DEFAULT;
  }, [invitation.openingMessage]);
  const openingTitleText = useMemo(
    () =>
      (invitation.openingTitle?.trim() ?? "") ||
      `${invitation.groomName || "신랑"} ${invitation.brideName || "신부"}` ||
      OPENING_TITLE_DEFAULT,
    [invitation.openingTitle, invitation.groomName, invitation.brideName],
  );
  const openingFontFamily = useMemo(
    () => normalizeFontFamilyValue(invitation.openingFontFamily, contentFontFamily),
    [invitation.openingFontFamily, contentFontFamily],
  );
  const openingFontColor = useMemo(() => {
    if (invitation.openingFontColor && /^#[0-9a-fA-F]{6}$/.test(invitation.openingFontColor.trim())) {
      return invitation.openingFontColor.trim();
    }
    return openingBackgroundType === "image" && openingImageUrl ? "#ffffff" : pickReadableTextColor(openingBackgroundColor);
  }, [invitation.openingFontColor, openingBackgroundType, openingImageUrl, openingBackgroundColor]);
  const openingTitleFontSize = useMemo(
    () =>
      Math.round(
        clampHeroEffectValue(
          Number(invitation.openingTitleFontSize ?? OPENING_TITLE_SIZE_DEFAULT),
          12,
          72,
        ),
      ),
    [invitation.openingTitleFontSize],
  );
  const openingMessageFontSize = useMemo(
    () =>
      Math.round(
        clampHeroEffectValue(
          Number(invitation.openingMessageFontSize ?? OPENING_MESSAGE_SIZE_DEFAULT),
          10,
          52,
        ),
      ),
    [invitation.openingMessageFontSize],
  );
  const openingTextOffsetX = useMemo(
    () => Math.round(clampHeroEffectValue(Number(invitation.openingTextOffsetX ?? 0), -140, 140)),
    [invitation.openingTextOffsetX],
  );
  const openingTextOffsetY = useMemo(
    () => Math.round(clampHeroEffectValue(Number(invitation.openingTextOffsetY ?? 0), -140, 140)),
    [invitation.openingTextOffsetY],
  );
  const openingImageStyle = useMemo<CSSProperties>(() => {
    if (openingBackgroundType !== "image" || !openingImageUrl) return {};
    return {
      backgroundImage: `url(${openingImageUrl})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    };
  }, [openingBackgroundType, openingImageUrl]);
  const openingBackgroundStyle = useMemo<CSSProperties>(() => {
    if (openingBackgroundType === "image" && openingImageUrl) {
      return {
        backgroundColor: "#101317",
      };
    }

    return {
      background: `linear-gradient(165deg, ${toRgba(openingBackgroundColor, 0.95)} 0%, ${toRgba(openingBackgroundColor, 0.82)} 100%)`,
    };
  }, [openingBackgroundType, openingImageUrl, openingBackgroundColor]);
  const openingContentOffsetStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${openingTextOffsetX}px, ${openingTextOffsetY}px, 0)`,
    }),
    [openingTextOffsetX, openingTextOffsetY],
  );
  const openingLayerPositionStyle = useMemo<CSSProperties>(() => {
    if (embedded) {
      return {
        height: `${openingViewportHeight}px`,
        inset: "0 0 auto 0",
        position: "absolute",
      };
    }

    return {
      height: "100dvh",
      left: "50%",
      maxWidth: "420px",
      position: "fixed",
      top: 0,
      transform: "translateX(-50%)",
      width: "100vw",
    };
  }, [embedded, openingViewportHeight]);
  const revealEnabled = invitation.themeScrollReveal ?? THEME_DEFAULTS.scrollReveal;
  const patternStyle = useMemo(
    () => buildThemePatternStyle(themePattern, themeAccentColor, themePatternColor),
    [themePattern, themeAccentColor, themePatternColor],
  );
  const patternBackgroundImage = typeof patternStyle.backgroundImage === "string" ? patternStyle.backgroundImage : "none";
  const patternBackgroundSize = typeof patternStyle.backgroundSize === "string" ? patternStyle.backgroundSize : "auto";
  const patternBackgroundPosition = typeof patternStyle.backgroundPosition === "string" ? patternStyle.backgroundPosition : "0 0";
  const patternBackgroundRepeat = typeof patternStyle.backgroundRepeat === "string" ? patternStyle.backgroundRepeat : "repeat";
  const themeParticles = useMemo(() => buildThemeParticles(themeEffectType), [themeEffectType]);
  const themeWrapperStyle = useMemo(
    () =>
      ({
        ...patternStyle,
        "--theme-bg": themeBackgroundColor,
        "--theme-text-primary": themeTextColor,
        "--theme-text-secondary": toRgba(themeTextColor, 0.72),
        "--theme-divider": toRgba(themeTextColor, 0.2),
        "--theme-brand": themeAccentColor,
        "--theme-accent": toRgba(themeAccentColor, 0.88),
        "--invite-pattern-color": themePatternColor,
        "--invite-theme-text": themeTextColor,
        "--invite-surface": toRgba(themeBackgroundColor, 0.86),
        "--invite-surface-soft": toRgba(themeBackgroundColor, 0.72),
        "--invite-pattern-image": patternBackgroundImage,
        "--invite-pattern-size": patternBackgroundSize,
        "--invite-pattern-position": patternBackgroundPosition,
        "--invite-pattern-repeat": patternBackgroundRepeat,
        backgroundColor: themeBackgroundColor,
        color: themeTextColor,
        fontFamily: contentFontFamily,
        fontSize: `${themeFontSize}px`,
      }) as CSSProperties,
    [
      patternStyle,
      themeBackgroundColor,
      themeTextColor,
      themeAccentColor,
      themePatternColor,
      contentFontFamily,
      themeFontSize,
      patternBackgroundImage,
      patternBackgroundPosition,
      patternBackgroundRepeat,
      patternBackgroundSize,
    ],
  );

  useEffect(() => {
    if (preview) return;
    if (!slugForActions) return;

    const storageKey = `invite-visit:${slugForActions}:${new Date().toISOString().slice(0, 10)}`;
    const alreadyTracked = typeof window !== "undefined" && window.sessionStorage.getItem(storageKey) === "1";
    if (alreadyTracked) return;

    apiFetch<{ message: string }>(`/api/public/invitations/${encodeURIComponent(slugForActions)}/visit`, {
      method: "POST",
    })
      .then(() => {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(storageKey, "1");
        }
      })
      .catch(() => {
        // 방문 집계 실패는 UI를 막지 않음
      });
  }, [preview, slugForActions]);

  useEffect(() => {
    const updateCountdown = () => {
      setCountdownInfo(buildCountdownInfo(invitation.weddingDateTime, Date.now()));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [invitation.weddingDateTime]);

  useEffect(() => {
    const updateOpeningViewportHeight = () => {
      if (embedded) {
        const frameHeight = rootRef.current?.parentElement?.clientHeight ?? 0;
        setOpeningViewportHeight(frameHeight > 0 ? frameHeight : 720);
        return;
      }
      setOpeningViewportHeight(window.innerHeight > 0 ? window.innerHeight : 720);
    };

    updateOpeningViewportHeight();
    window.addEventListener("resize", updateOpeningViewportHeight);
    return () => window.removeEventListener("resize", updateOpeningViewportHeight);
  }, [embedded]);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const queue = (handler: () => void, delay: number) => {
      const timerId = window.setTimeout(() => {
        if (cancelled) return;
        handler();
      }, delay);
      timers.push(timerId);
    };

    if (!openingEnabled) {
      queue(() => {
        setIsOpeningVisible(false);
        setIsOpeningClosing(false);
        setTypedOpeningTitle("");
        setTypedOpeningMessage("");
      }, 0);
      return () => {
        cancelled = true;
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const startClosing = () => {
      setIsOpeningClosing(true);
      queue(() => {
        setIsOpeningVisible(false);
        setIsOpeningClosing(false);
      }, OPENING_CLOSE_DURATION_MS);
    };

    queue(() => {
      setIsOpeningVisible(true);
      setIsOpeningClosing(false);

      if (openingAnimationType === "typewriter") {
        setTypedOpeningTitle("");
        setTypedOpeningMessage("");

        let titleIndex = 0;
        let messageIndex = 0;
        const titleText = openingTitleText;
        const messageText = openingMessageText;

        const typeMessage = () => {
          if (!messageText) {
            queue(startClosing, OPENING_CLOSE_DELAY_MS);
            return;
          }
          messageIndex += 1;
          setTypedOpeningMessage(messageText.slice(0, messageIndex));
          if (messageIndex < messageText.length) {
            queue(typeMessage, OPENING_TYPEWRITER_STEP_MS - 8);
            return;
          }
          queue(startClosing, OPENING_CLOSE_DELAY_MS);
        };

        const typeTitle = () => {
          if (!titleText) {
            queue(typeMessage, 180);
            return;
          }
          titleIndex += 1;
          setTypedOpeningTitle(titleText.slice(0, titleIndex));
          if (titleIndex < titleText.length) {
            queue(typeTitle, OPENING_TYPEWRITER_STEP_MS);
            return;
          }
          queue(typeMessage, 180);
        };

        queue(typeTitle, 260);
        return;
      }

      setTypedOpeningTitle(openingTitleText);
      setTypedOpeningMessage(openingMessageText);
      queue(startClosing, 3300);
    }, 0);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    openingEnabled,
    openingAnimationType,
    openingTitleText,
    openingMessageText,
    openingBackgroundColor,
    openingBackgroundType,
    openingImageUrl,
  ]);

  useEffect(() => {
    if (!isOpeningVisible || embedded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpeningVisible, embedded]);

  useEffect(() => {
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsBackgroundMusicPlaying(true);
      setBackgroundMusicError(null);
    };
    const handlePause = () => setIsBackgroundMusicPlaying(false);
    const handleError = () => {
      setIsBackgroundMusicPlaying(false);
      setBackgroundMusicError("배경음악을 재생할 수 없습니다.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [backgroundMusicSrc]);

  useEffect(() => {
    if (!backgroundMusicSrc) return;
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    let cancelled = false;
    let unlockHandler: (() => void) | null = null;

    const cleanupUnlockListeners = () => {
      if (!unlockHandler) return;
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("touchstart", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      unlockHandler = null;
    };

    const playByDefault = async (): Promise<boolean> => {
      audio.volume = 0.72;
      setBackgroundMusicError(null);
      try {
        await audio.play();
        if (!cancelled) {
          setIsBackgroundMusicPlaying(true);
        }
        return true;
      } catch {
        if (!cancelled) {
          setIsBackgroundMusicPlaying(false);
        }
        return false;
      }
    };

    void playByDefault().then((isPlayed) => {
      if (cancelled || isPlayed) return;

      unlockHandler = () => {
        cleanupUnlockListeners();
        if (cancelled) return;
        void playByDefault().catch(() => {
          // 사용자 액션 이후에도 실패하면 버튼으로 직접 재생하도록 유지
        });
      };
      window.addEventListener("pointerdown", unlockHandler, { once: true });
      window.addEventListener("touchstart", unlockHandler, { once: true });
      window.addEventListener("keydown", unlockHandler, { once: true });
    });

    return () => {
      cancelled = true;
      cleanupUnlockListeners();
    };
  }, [backgroundMusicSrc]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-invite-reveal]"));
    if (targets.length === 0) return;

    if (!revealEnabled) {
      targets.forEach((target) => target.classList.add("invite-reveal-visible"));
      return;
    }

    targets.forEach((target) => target.classList.remove("invite-reveal-visible"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("invite-reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        root: embedded ? root.parentElement : null,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [
    embedded,
    revealEnabled,
    invitation.id,
    invitation.heroDesignId,
    invitation.heroEffectType,
    invitation.heroEffectParticleCount,
    invitation.heroEffectSpeed,
    invitation.heroEffectOpacity,
    invitation.mainImageUrl,
    invitation.coverImageUrl,
    invitation.imageUrls.length,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollTarget = embedded ? root.parentElement : window;
    if (!scrollTarget) return;

    const handleScroll = () => {
      const container = root.parentElement;
      const scrollTop = embedded
        ? (container?.scrollTop ?? 0)
        : window.scrollY || document.documentElement.scrollTop || 0;
      setShowScrollTopButton(scrollTop > 140);
    };

    handleScroll();
    window.addEventListener("resize", handleScroll);

    if (scrollTarget instanceof Window) {
      scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        scrollTarget.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
      };
    }

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [embedded]);

  const accountRows = invitation.useSeparateAccounts
    ? [
        { label: "신랑측", value: invitation.groomAccountNumber },
        { label: "신부측", value: invitation.brideAccountNumber },
      ].filter((row): row is { label: string; value: string } => Boolean(row.value))
    : [{ label: "계좌", value: invitation.accountNumber }].filter((row): row is { label: string; value: string } => Boolean(row.value));

  const normalizedImageUrls = useMemo(() => sanitizeAssetUrlList(invitation.imageUrls), [invitation.imageUrls]);
  const heroImageCandidate = useMemo(
    () =>
      sanitizeAssetUrl(invitation.mainImageUrl) ||
      sanitizeAssetUrl(invitation.coverImageUrl) ||
      sanitizeAssetUrl(invitation.seoImageUrl) ||
      normalizedImageUrls[0] ||
      "",
    [invitation.mainImageUrl, invitation.coverImageUrl, invitation.seoImageUrl, normalizedImageUrls],
  );
  const heroImageUrl = resolveAssetUrl(
    heroImageCandidate,
    apiBaseUrl,
  );
  const contactGroups = useMemo(
    () => [
      {
        side: "신랑측",
        rows: [
          { relation: "신랑", name: invitation.groomName || "신랑", tel: groomTel, sms: groomSms },
          { relation: "아버지", name: invitation.groomFatherName || "아버지", tel: groomFatherTel, sms: groomFatherSms },
          { relation: "어머니", name: invitation.groomMotherName || "어머니", tel: groomMotherTel, sms: groomMotherSms },
        ],
      },
      {
        side: "신부측",
        rows: [
          { relation: "신부", name: invitation.brideName || "신부", tel: brideTel, sms: brideSms },
          { relation: "아버지", name: invitation.brideFatherName || "아버지", tel: brideFatherTel, sms: brideFatherSms },
          { relation: "어머니", name: invitation.brideMotherName || "어머니", tel: brideMotherTel, sms: brideMotherSms },
        ],
      },
    ],
    [
      invitation.groomName,
      invitation.brideName,
      invitation.groomFatherName,
      invitation.groomMotherName,
      invitation.brideFatherName,
      invitation.brideMotherName,
      groomTel,
      brideTel,
      groomSms,
      brideSms,
      groomFatherTel,
      groomMotherTel,
      brideFatherTel,
      brideMotherTel,
      groomFatherSms,
      groomMotherSms,
      brideFatherSms,
      brideMotherSms,
    ],
  );
  const availableContactGroups = useMemo(
    () =>
      contactGroups
        .map((group) => ({
          ...group,
          rows: group.rows.filter((row) => Boolean(row.tel)),
        }))
        .filter((group) => group.rows.length > 0),
    [contactGroups],
  );
  const toggleBackgroundMusic = useCallback(async () => {
    if (!backgroundMusicSrc) return;
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      setIsBackgroundMusicPlaying(false);
      return;
    }

    audio.volume = 0.72;
    setBackgroundMusicError(null);
    try {
      await audio.play();
      setIsBackgroundMusicPlaying(true);
    } catch {
      setIsBackgroundMusicPlaying(false);
      setBackgroundMusicError("화면을 터치한 뒤 다시 재생해 주세요.");
    }
  }, [backgroundMusicSrc]);
  const scrollToTop = useCallback(() => {
    if (embedded) {
      rootRef.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [embedded]);
  const renderBackgroundMusicControl = () => {
    if (!backgroundMusicSrc) return null;

    return (
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-1.5">
        <button
          className={`invite-music-toggle ${isBackgroundMusicPlaying ? "is-playing" : ""}`}
          type="button"
          onClick={() => void toggleBackgroundMusic()}
          aria-label={isBackgroundMusicPlaying ? "배경음악 일시정지" : "배경음악 재생"}
          title={isBackgroundMusicPlaying ? "배경음악 일시정지" : "배경음악 재생"}
        >
          <span className="material-symbols-outlined invite-music-icon" aria-hidden="true">
            {isBackgroundMusicPlaying ? "volume_off" : "music_note"}
          </span>
        </button>
        {backgroundMusicError ? <p className="rounded-lg bg-black/65 px-2 py-1 text-[10px] text-white">{backgroundMusicError}</p> : null}
      </div>
    );
  };
  const renderScrollTopButton = () => (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="맨 위로 이동"
      className={`invite-scroll-top ${showScrollTopButton ? "is-visible" : ""} ${embedded ? "is-embedded" : ""}`}
    >
      <span className="material-symbols-outlined text-[15px]">keyboard_arrow_up</span>
    </button>
  );
  const renderOpeningOverlay = () => {
    if (!isOpeningVisible) return null;

    return (
      <div className={`invite-opening-layer ${isOpeningClosing ? "is-closing" : ""}`} style={{ ...openingBackgroundStyle, ...openingLayerPositionStyle }}>
        {openingBackgroundType === "image" && openingImageUrl ? (
          <>
            <div className={`invite-opening-image-layer is-${openingImageMotionPreset}`} style={openingImageStyle} />
            <div className="invite-opening-image-overlay" />
          </>
        ) : null}
        <div className="invite-opening-content-shell" style={openingContentOffsetStyle}>
          <div
            className={`invite-opening-content ${openingAnimationType === "typewriter" ? "is-typewriter" : "is-soft-fade"}`}
            style={{ color: openingFontColor, fontFamily: openingFontFamily }}
          >
            <p
              className={`invite-opening-title whitespace-pre-line ${openingAnimationType === "typewriter" ? "invite-opening-caret" : ""}`}
              style={{ fontSize: `${openingTitleFontSize}px` }}
            >
              {openingAnimationType === "typewriter" ? typedOpeningTitle : openingTitleText}
            </p>
            <p
              className={`invite-opening-message whitespace-pre-line ${openingAnimationType === "typewriter" ? "invite-opening-caret-delay" : ""}`}
              style={{ fontSize: `${openingMessageFontSize}px` }}
            >
              {openingAnimationType === "typewriter" ? typedOpeningMessage : openingMessageText}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const designId = invitation.heroDesignId ?? "simply-meant";
  const heroTitleFontFamily = heroMainFontFamily;
  const heroBodyFontFamily = heroSubFontFamily;
  const heroAccentFontFamily = normalizeFontFamilyValue(invitation.heroAccentFontFamily, HERO_ACCENT_FONT_FAMILY);
  const heroTitleSize = clampHeroEffectValue(
    Number.isFinite(invitation.heroMainFontSize)
      ? (invitation.heroMainFontSize as number)
      : Number.isFinite(invitation.fontSize)
        ? (invitation.fontSize as number)
        : 16,
    12,
    42,
  );
  const heroBodySize = clampHeroEffectValue(
    Number.isFinite(invitation.heroSubFontSize)
      ? (invitation.heroSubFontSize as number)
      : Number.isFinite(invitation.fontSize)
        ? (invitation.fontSize as number)
        : 16,
    10,
    36,
  );
  const heroPrimaryColor = normalizeHexColor(invitation.heroMainFontColor ?? invitation.fontColor, themeTextColor);
  const heroSubColor = normalizeHexColor(invitation.heroSubFontColor ?? invitation.fontColor, themeTextColor);
  const heroAccentTextColor = heroPrimaryColor;
  const heroBodyColor = heroSubColor;
  const heroDateCompact = `${dateInfo.year}.${dateInfo.month}.${String(dateInfo.day).padStart(2, "0")}`;
  const heroLocationText = invitation.venueName || "예식장 정보 미입력";

  const renderHeroOverlay = () => {
    if (designId === "none") return null;

    if (designId === "happy-wedding-day") {
      return (
        <>
          <div className="absolute inset-0 bg-black/10" />
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex items-center gap-3 px-5 pt-6">
              <span
                className="truncate"
                style={{ fontFamily: heroBodyFontFamily, fontSize: `${heroBodySize * 0.92}px`, color: toRgba(heroBodyColor, 0.98) }}
              >
                {weddingTitle}
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: toRgba(heroBodyColor, 0.64) }} />
              <span style={{ fontFamily: heroBodyFontFamily, fontSize: `${heroBodySize * 0.92}px`, color: toRgba(heroBodyColor, 0.98) }}>결혼합니다</span>
            </div>
            <div className="absolute left-10 top-[16%]">
              <p
                className="leading-[0.86]"
                style={{
                  fontFamily: heroTitleFontFamily,
                  color: heroAccentTextColor,
                  fontSize: `${heroTitleSize * 3}px`,
                  fontWeight: 700,
                  textShadow: `0 2px 10px ${toRgba("#000000", 0.2)}`,
                }}
              >
                Happy
                <br />
                Wedding
                <br />
                Day
              </p>
            </div>
            <div className="absolute left-4 top-[24%] text-white/90 text-2xl">✶</div>
            <div className="absolute right-5 top-[30%] text-white/90 text-xl">♡</div>
            <div className="absolute left-8 bottom-[29%] text-white/90 text-xl">✶</div>
            <div className="absolute right-7 bottom-[35%] text-white/90 text-xl">♡</div>
            <div className="absolute inset-x-0 bottom-7 text-center space-y-1">
              <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.98), fontSize: `${heroBodySize}px` }}>{dateInfo.infoDate}</p>
              <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.92), fontSize: `${heroBodySize * 0.95}px` }}>{heroLocationText}</p>
            </div>
          </div>
        </>
      );
    }

    if (designId === "simply-meant") {
      return (
        <>
          <div className="absolute inset-0 bg-[#4f5568]/30" />
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="flex justify-between px-5 pt-6 text-[28px]">
              <span className="text-sm tracking-[0.08em] font-semibold" style={{ fontFamily: heroAccentFontFamily, color: toRgba(heroBodyColor, 0.86) }}>SIMPLY</span>
              <span className="text-sm tracking-[0.08em] font-semibold" style={{ fontFamily: heroAccentFontFamily, color: toRgba(heroBodyColor, 0.86) }}>MEANT</span>
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
              <p
                className="leading-[0.82] font-bold"
                style={{ fontFamily: heroAccentFontFamily, fontSize: `${heroTitleSize * 6.6}px`, color: toRgba(heroPrimaryColor, 0.96) }}
              >
                {dateInfo.yearShort}
                <br />
                {dateInfo.month}
                <br />
                {`${dateInfo.day}`.padStart(2, "0")}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-6 flex justify-between px-5">
              <span className="font-semibold tracking-[0.05em]" style={{ fontFamily: heroAccentFontFamily, fontSize: `${heroTitleSize * 1.8}px`, color: toRgba(heroPrimaryColor, 0.92) }}>TO BE</span>
              <span className="font-semibold tracking-[0.05em]" style={{ fontFamily: heroAccentFontFamily, fontSize: `${heroTitleSize * 1.8}px`, color: toRgba(heroPrimaryColor, 0.92) }}>TOGETHER</span>
            </div>
          </div>
        </>
      );
    }

    if (designId === "modern-center") {
      return (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-black/10">
          <p className="tracking-[0.4em] font-light mb-4" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.95), fontSize: `${heroBodySize * 0.9}px` }}>
            {dateInfo.year} / {dateInfo.month} / {dateInfo.day}
          </p>
          <div className="w-8 h-px my-6" style={{ backgroundColor: toRgba(heroPrimaryColor, 0.58) }} />
          <p className="font-bold tracking-widest" style={{ fontFamily: heroTitleFontFamily, color: toRgba(heroPrimaryColor, 0.97), fontSize: `${heroTitleSize * 1.8}px` }}>{weddingTitle}</p>
          <p className="mt-4 italic tracking-widest" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.82), fontSize: `${heroBodySize * 0.78}px` }}>We are getting married</p>
        </div>
      );
    }

    if (designId === "serif-classic") {
      return (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
          <div className="p-8 w-full h-full flex flex-col items-center justify-center" style={{ border: `1px solid ${toRgba(heroPrimaryColor, 0.4)}` }}>
            <p className="mb-6" style={{ fontFamily: heroAccentFontFamily, fontSize: `${heroTitleSize * 2.8}px`, color: toRgba(heroPrimaryColor, 0.96) }}>
              {dateInfo.month}.{dateInfo.day}
            </p>
            <p className="tracking-[0.3em] font-medium uppercase" style={{ fontFamily: heroBodyFontFamily, fontSize: `${heroBodySize}px`, color: toRgba(heroBodyColor, 0.96) }}>{weddingTitle}</p>
            <div className="mt-10 tracking-[0.5em]" style={{ fontFamily: heroBodyFontFamily, fontSize: `${heroBodySize * 0.62}px`, color: toRgba(heroBodyColor, 0.72) }}>INVITATION</div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderHeroSection = () => {
    if (designId === "happily-ever-after") {
      return (
        <section className="relative overflow-hidden text-center bg-[#16171b] h-[560px]" data-invite-reveal>
          <div className="absolute inset-x-0 top-[23%] h-[54%]">
            {heroImageUrl ? <img className="h-full w-full object-cover" src={heroImageUrl} alt="hero" /> : <div className="h-full w-full bg-stone-200" />}
          </div>
          {renderHeroEffectLayer(invitation.heroEffectType, {
            particleCount: invitation.heroEffectParticleCount,
            speed: invitation.heroEffectSpeed,
            opacity: invitation.heroEffectOpacity,
          })}
          {renderBackgroundMusicControl()}
          <div className="absolute inset-x-0 top-10 text-center">
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.92), fontSize: `${heroBodySize * 0.84}px` }}>{weddingTitle}</p>
          </div>
          <p
            className="absolute left-5 top-[12%] leading-none"
            style={{ fontFamily: heroTitleFontFamily, color: heroAccentTextColor, fontSize: `${heroTitleSize * 2.8}px`, fontWeight: 700 }}
          >
            Happily
          </p>
          <p
            className="absolute left-4 bottom-[20%] leading-[0.88] text-left"
            style={{ fontFamily: heroTitleFontFamily, color: heroAccentTextColor, fontSize: `${heroTitleSize * 2.25}px`, fontWeight: 700 }}
          >
            Ever
            <br />
            After
          </p>
          <div className="absolute inset-x-0 bottom-7 text-center space-y-1">
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.95), fontSize: `${heroBodySize}px` }}>{dateInfo.infoDate}</p>
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.88), fontSize: `${heroBodySize * 0.94}px` }}>{heroLocationText}</p>
          </div>
        </section>
      );
    }

    if (designId === "blush-circle") {
      return (
        <section className="relative overflow-hidden text-center bg-[#e8d4d8] h-[700px]" data-invite-reveal>
          <div className="pt-14">
            <p style={{ fontFamily: heroTitleFontFamily, color: toRgba(heroPrimaryColor, 0.95), fontSize: `${heroTitleSize * 1.9}px`, fontWeight: 700 }}>결혼합니다</p>
            <p className="mt-2" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.92), fontSize: `${heroBodySize * 1.05}px` }}>{weddingTitle}</p>
          </div>
          <div className="absolute left-2 top-[48%] -translate-y-1/2 [writing-mode:vertical-rl]" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.74), fontSize: `${heroBodySize * 0.74}px` }}>
            Wedding
          </div>
          <div className="absolute right-2 top-[48%] -translate-y-1/2 [writing-mode:vertical-rl]" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.74), fontSize: `${heroBodySize * 0.74}px` }}>
            Invitation
          </div>
          <div className="mx-auto mt-12 h-[330px] w-[330px] overflow-hidden rounded-full bg-[#cbdff0] shadow-md">
            {heroImageUrl ? <img className="h-full w-full object-cover" src={heroImageUrl} alt="hero" /> : <div className="h-full w-full bg-stone-200" />}
          </div>
          {renderHeroEffectLayer(invitation.heroEffectType, {
            particleCount: invitation.heroEffectParticleCount,
            speed: invitation.heroEffectSpeed,
            opacity: invitation.heroEffectOpacity,
          })}
          {renderBackgroundMusicControl()}
          <p className="mt-11" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.95), fontSize: `${heroBodySize * 1.06}px` }}>{heroDateCompact}</p>
          <div className="absolute inset-x-0 bottom-7 text-center space-y-1">
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.94), fontSize: `${heroBodySize}px` }}>{dateInfo.infoDate}</p>
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.9), fontSize: `${heroBodySize * 0.94}px` }}>{heroLocationText}</p>
          </div>
        </section>
      );
    }

    if (designId === "two-become-one") {
      return (
        <section className="relative overflow-hidden text-center bg-[#baa596] h-[680px]" data-invite-reveal>
          <div className="pt-10 space-y-3">
            <p
              className="leading-[0.9]"
              style={{ fontFamily: heroTitleFontFamily, color: toRgba(heroPrimaryColor, 0.96), fontSize: `${heroTitleSize * 2.3}px`, fontWeight: 600 }}
            >
              TWO
              <br />
              BECOME
              <br />
              ONE
            </p>
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.92), fontSize: `${heroBodySize * 1.02}px` }}>
              {invitation.groomName || "신랑"} 그리고 {invitation.brideName || "신부"}, 결혼합니다.
            </p>
          </div>
          <div className="mx-auto mt-9 h-[380px] w-[88%] overflow-hidden bg-[#ded4cb] shadow-md">
            {heroImageUrl ? <img className="h-full w-full object-cover" src={heroImageUrl} alt="hero" /> : <div className="h-full w-full bg-stone-200" />}
          </div>
          {renderHeroEffectLayer(invitation.heroEffectType, {
            particleCount: invitation.heroEffectParticleCount,
            speed: invitation.heroEffectSpeed,
            opacity: invitation.heroEffectOpacity,
          })}
          {renderBackgroundMusicControl()}
          <div className="absolute inset-x-0 bottom-9 text-center space-y-1">
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.95), fontSize: `${heroBodySize}px` }}>{dateInfo.infoDate}</p>
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.88), fontSize: `${heroBodySize * 0.94}px` }}>{heroLocationText}</p>
          </div>
        </section>
      );
    }

    if (designId === "sky-invitation") {
      return (
        <section className="relative overflow-hidden text-center h-[620px]" data-invite-reveal>
          <div className="relative h-[74%] overflow-hidden bg-[#8db5da]">
            {heroImageUrl ? <img className="h-full w-full object-cover" src={heroImageUrl} alt="hero" /> : <div className="h-full w-full bg-sky-200" />}
            {renderHeroEffectLayer(invitation.heroEffectType, {
              particleCount: invitation.heroEffectParticleCount,
              speed: invitation.heroEffectSpeed,
              opacity: invitation.heroEffectOpacity,
            })}
            {renderBackgroundMusicControl()}
            <div className="absolute inset-x-0 top-10 text-center">
              <p style={{ fontFamily: heroTitleFontFamily, color: toRgba(heroPrimaryColor, 0.95), fontSize: `${heroTitleSize * 1.85}px`, fontWeight: 700 }}>결혼합니다</p>
              <p className="mt-1" style={{ fontFamily: heroTitleFontFamily, color: toRgba(heroAccentTextColor, 0.9), fontSize: `${heroTitleSize * 0.98}px` }}>Wedding Invitation</p>
              <p className="mt-8" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.94), fontSize: `${heroBodySize * 1.02}px` }}>{weddingTitle}</p>
            </div>
            <p className="absolute inset-x-0 bottom-6 text-center" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.9), fontSize: `${heroBodySize * 1.28}px`, fontWeight: 600 }}>
              {heroDateCompact}
            </p>
          </div>
          <div className="flex h-[26%] flex-col items-center justify-center bg-[#f6f6f6] text-center">
            <p style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.86), fontSize: `${heroBodySize * 0.5}px` }}>{dateInfo.infoDate}</p>
            <p className="mt-1" style={{ fontFamily: heroBodyFontFamily, color: toRgba(heroBodyColor, 0.82), fontSize: `${heroBodySize * 0.5}px` }}>{heroLocationText}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="relative overflow-hidden text-center" data-invite-reveal>
        {heroImageUrl ? <img className="h-[560px] w-full object-cover" src={heroImageUrl} alt="hero" /> : <div className="h-[560px] w-full bg-stone-100" />}
        {renderHeroEffectLayer(invitation.heroEffectType, {
          particleCount: invitation.heroEffectParticleCount,
          speed: invitation.heroEffectSpeed,
          opacity: invitation.heroEffectOpacity,
        })}
        {renderBackgroundMusicControl()}
        {renderHeroOverlay()}
      </section>
    );
  };

  const renderHeroEffectLayer = (effectType?: string, inputOptions?: Partial<HeroEffectOptions>) => {
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

  const content = (
    <div
      ref={rootRef}
      className={`invitation-theme-scope relative overflow-hidden ${revealEnabled ? "invite-reveal-enabled" : ""}`}
      style={themeWrapperStyle}
    >
      {backgroundMusicSrc ? (
        <audio key={backgroundMusicSrc} ref={backgroundMusicRef} src={backgroundMusicSrc} loop preload="metadata" autoPlay playsInline />
      ) : null}

      {themeParticles.length > 0 ? (
        <div className={`invite-theme-effect-layer invite-theme-effect-${themeEffectType}`}>
          {themeParticles.map((particle, index) => (
            <span
              key={`theme-particle-${themeEffectType}-${index}`}
              className="invite-theme-particle"
              style={{
                left: `${particle.left}%`,
                top: `${particle.startTop}%`,
                width: `${particle.width}px`,
                height: `${particle.height}px`,
                opacity: particle.opacity,
                borderRadius: particle.radius,
                background: particle.background,
                filter: `blur(${particle.blur}px)`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                ["--invite-drift-x" as string]: `${particle.driftX}px`,
                ["--invite-rotate" as string]: `${particle.rotate}deg`,
              }}
            />
          ))}
        </div>
      ) : null}

      {renderOpeningOverlay()}

      <div className={`relative z-[2] transition-opacity duration-200 ${isOpeningVisible ? "pointer-events-none select-none opacity-0" : "opacity-100"}`}>
      {renderHeroSection()}

      <div className="space-y-8 px-6 py-10">
        <section className="space-y-5 text-center" data-invite-reveal style={{ fontFamily: messageFontFamily }}>
          <p className="serif-font text-xs tracking-[0.33em] text-gray-400 uppercase">Invitation</p>
          <h3 className="serif-kr text-3xl font-semibold text-gray-800">소중한 분들을 초대합니다</h3>
          <div className="text-sm leading-8 text-theme-secondary ql-editor !p-0">
            {invitation.message ? (
              <div dangerouslySetInnerHTML={{ __html: invitation.message }} />
            ) : (
              invitation.messageLines.map((line, index) => <p key={`${invitation.id}-line-${index}`}>{line}</p>)
            )}
          </div>
          <p className="pt-2 text-sm font-medium text-gray-700">{weddingTitle}</p>
        </section>

        {invitation.detailContent ? (
          <section className="px-2" data-invite-reveal style={{ fontFamily: detailFontFamily }}>
            <div className="text-sm leading-relaxed text-theme-secondary ql-editor !p-0" dangerouslySetInnerHTML={{ __html: invitation.detailContent }} />
          </section>
        ) : null}

        <section className="bg-white py-16 px-8 text-center" data-invite-reveal>
          <div className="mb-10 space-y-2">
            <p className="serif-font text-[22px] tracking-widest text-theme-primary">{calendarInfo.fullDateText}</p>
            <p className="text-[13px] text-theme-primary font-light">{calendarInfo.weekdayTimeText}</p>
          </div>

          <div className="mx-auto max-w-[320px] pt-6 border-t border-warm/50">
            <div className="grid grid-cols-7 mb-6 text-[11px] font-medium text-theme-primary">
              {["일", "월", "화", "수", "목", "금", "토"].map((weekday) => (
                <div key={weekday}>
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-[14px] font-light text-theme-primary gap-y-4">
              {calendarInfo.days.map((day, index) => {
                const isWeddingDay = day === calendarInfo.weddingDay;
                if (day === null) return <div key={`empty-${index}`} />;
                return (
                  <div key={`day-${index}`} className="relative flex items-center justify-center h-9">
                    {isWeddingDay ? <span className="absolute h-9 w-9 rounded-full -z-0" style={{ backgroundColor: toRgba(themeAccentColor, 0.22) }} /> : null}
                    <span className={`relative z-10 ${isWeddingDay ? "font-bold" : ""}`} style={isWeddingDay ? { color: themeAccentColor } : undefined}>
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-16 pt-10 border-t border-warm/30 space-y-8">
            <div className="flex justify-center items-center gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] tracking-widest text-theme-primary uppercase font-bold">Days</span>
                <span className="text-[24px] font-light tracking-widest text-theme-primary">{countdownInfo.days}</span>
              </div>
              <span className="text-xl font-light mb-1 text-theme-primary opacity-55">:</span>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] tracking-widest text-theme-primary uppercase font-bold">Hour</span>
                <span className="text-[24px] font-light tracking-widest text-theme-primary">{countdownInfo.hours}</span>
              </div>
              <span className="text-xl font-light mb-1 text-theme-primary opacity-55">:</span>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] tracking-widest text-theme-primary uppercase font-bold">Min</span>
                <span className="text-[24px] font-light tracking-widest text-theme-primary">{countdownInfo.mins}</span>
              </div>
              <span className="text-xl font-light mb-1 text-theme-primary opacity-55">:</span>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] tracking-widest text-theme-primary uppercase font-bold">Sec</span>
                <span className="text-[24px] font-light tracking-widest text-theme-primary">{countdownInfo.secs}</span>
              </div>
            </div>
            <p className="text-[13px] text-theme-primary font-light">
              <span className="font-bold text-theme-primary">
                {invitation.groomName || "신랑"}, {invitation.brideName || "신부"}
              </span>
              의 결혼식이 <span className="text-theme-brand font-bold">{countdownInfo.diffDaysText}일</span> 남았습니다.
            </p>
          </div>
        </section>

        {availableContactGroups.length > 0 ? (
          <section className="pb-16 px-6 text-center" data-invite-reveal>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-warm bg-white px-10 py-3 text-sm font-bold text-theme-secondary shadow-sm transition-colors hover:bg-theme"
              type="button"
              onClick={() => setIsContactModalOpen(true)}
            >
              <span className="material-symbols-outlined text-[20px]">call</span>
              <span>연락하기</span>
            </button>
          </section>
        ) : null}

        {normalizedImageUrls.length > 0 ? (
          <section className="space-y-3" data-invite-reveal>
            <p className="text-center text-sm font-semibold">{invitation.galleryTitle || "웨딩 갤러리"}</p>
            <WeddingGallery images={normalizedImageUrls.map((url) => resolveAssetUrl(url, apiBaseUrl)).filter(Boolean)} mode={invitation.galleryType} />
          </section>
        ) : null}

        <section className="py-12 space-y-8" data-invite-reveal style={{ fontFamily: transportFontFamily }}>
          <div className="text-center space-y-2">
            <p className="serif-font text-xs tracking-widest text-theme-accent italic uppercase">Location</p>
            <h3 className="serif-kr text-xl font-semibold text-gray-800">{invitation.locationTitle}</h3>
          </div>

          {invitation.showMap !== false ? (
            <div className="relative w-full h-[280px] bg-stone-50 border-y border-warm">
              <InvitationLocationMap address={invitation.venueAddress} />
              {invitation.lockMap ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5">
                  <span className="material-symbols-outlined text-gray-400">lock</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="px-8 text-center space-y-2">
            <p className="text-base font-bold text-gray-800">{invitation.venueName}</p>
            {invitation.locationFloorHall ? <p className="text-sm text-theme-secondary">{invitation.locationFloorHall}</p> : null}
            <p className="text-sm text-theme-secondary">{invitation.venueAddress}</p>
            {invitation.locationContact ? <p className="text-xs text-theme-accent pt-1">{invitation.locationContact}</p> : null}
          </div>

          <MapShortcutButtons
            venueName={invitation.venueName}
            address={invitation.venueAddress}
            className="grid grid-cols-3 gap-2 px-2.5"
            buttonClassName="flex h-[44px] min-w-0 items-center justify-center gap-1 rounded-md border border-warm bg-white px-1 text-[12px] font-semibold text-theme-secondary shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:bg-theme"
          />

          <div className="px-8 space-y-6 pt-4">
            {invitation.subway ? (
              <div className="space-y-1 text-left">
                <p className="font-bold text-xs text-theme-brand">지하철</p>
                <div className="text-[13px] leading-relaxed text-theme-secondary ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: invitation.subway }} />
              </div>
            ) : null}
            {invitation.bus ? (
              <div className="space-y-1 text-left">
                <p className="font-bold text-xs text-theme-brand">버스</p>
                <div className="text-[13px] leading-relaxed text-theme-secondary ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: invitation.bus }} />
              </div>
            ) : null}
            {invitation.car ? (
              <div className="space-y-1 text-left">
                <p className="font-bold text-xs text-theme-brand">자가용</p>
                <div className="text-[13px] leading-relaxed text-theme-secondary ql-editor !p-0 !min-h-0" dangerouslySetInnerHTML={{ __html: invitation.car }} />
              </div>
            ) : null}
          </div>
        </section>

        {accountRows.length > 0 ? (
          <section className="py-12 space-y-10 bg-white" data-invite-reveal>
            <div className="space-y-2 text-center">
              <div className="serif-font text-sm tracking-widest text-theme-accent italic">Account</div>
              <h3 className="serif-kr text-xl">마음 전하실 곳</h3>
            </div>
            <div className="space-y-4">
              {accountRows.map((row) => (
                <div className="space-y-4 rounded-2xl border border-warm bg-theme p-6" key={`${invitation.id}-${row.label}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-widest font-bold text-theme-secondary uppercase">{row.label}</span>
                    <CopyTextButton text={row.value} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <RsvpEntryModal
          enabled={invitation.useRsvpModal}
          invitationId={invitationIdForActions}
          slug={slugForActions}
          preview={preview}
          embedded={embedded}
          groomName={invitation.groomName}
          brideName={invitation.brideName}
          venueAddress={invitation.venueAddress}
          venueName={invitation.venueName}
          weddingDateText={dateInfo.infoDate}
          autoOpenOnFirstLoad={invitation.rsvpAutoOpenOnLoad ?? false}
          rsvpTitle={invitation.rsvpTitle}
          rsvpMessage={invitation.rsvpMessage}
          rsvpButtonText={invitation.rsvpButtonText}
          rsvpFontFamily={rsvpFontFamily}
        />

        <GuestbookSection
          enabled={invitation.useGuestbook}
          invitationId={invitationIdForActions}
          slug={slugForActions}
          preview={preview}
          embedded={embedded}
        />
      </div>

      <InvitationFullscreenModal
        open={isContactModalOpen}
        embedded={embedded}
        title="연락하기"
        onClose={() => setIsContactModalOpen(false)}
        closeLabel="연락처 모달 닫기"
      >
        <div className="space-y-8">
          {availableContactGroups.map((group) => (
            <section key={`${invitation.id}-${group.side}`} className="space-y-2">
              <h4 className="text-[12px] font-semibold text-[#2f3136]">{group.side}</h4>
              <div className="space-y-0.5 border-t border-[#ececed] pt-2.5">
                {group.rows.map((row) => (
                  <div key={`${group.side}-${row.relation}-${row.name}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 py-2.5">
                    <span className="text-[13px] font-medium text-[#9a9ca1]">{row.relation}</span>
                    <span className="truncate text-[13px] font-semibold text-[#3b3d42]">{row.name}</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e8e8ea] bg-white text-[#8d9096]"
                        href={row.tel}
                        aria-label={`${group.side} ${row.relation} 전화`}
                      >
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                          call
                        </span>
                      </a>
                      <a
                        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e8e8ea] bg-white text-[#8d9096]"
                        href={row.sms}
                        aria-label={`${group.side} ${row.relation} 문자`}
                      >
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                          mail
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </InvitationFullscreenModal>
      {renderScrollTopButton()}
    </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="bg-theme">
      <div className="mobile-view">{content}</div>
    </div>
  );
}
