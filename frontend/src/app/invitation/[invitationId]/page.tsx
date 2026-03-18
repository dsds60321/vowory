import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { resolveAssetUrl } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/site-url";
import InvitationMobileView, { type InvitationMobileViewData } from "./InvitationMobileView";

type InvitationData = InvitationMobileViewData & {
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  mapImageUrl?: string;
};

type InvitationRouteParams = {
  invitationId: string;
};

type InvitationPageProps = {
  params: Promise<InvitationRouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const INVALID_ASSET_URL_TOKENS = new Set(["null", "undefined", "nan"]);
const METADATA_PLACEHOLDER_TOKENS = new Set(["예식 일시 정보 미입력", "예식장 정보 미입력", "주소 정보 미입력"]);

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.WEDDING_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function toOriginOrUndefined(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

function getMetadataAssetBaseUrl(siteUrl: string): string {
  const candidates = [
    process.env.NEXT_PUBLIC_ASSET_BASE_URL,
    process.env.WEDDING_ASSET_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.WEDDING_API_BASE_URL,
    siteUrl,
  ];

  for (const candidate of candidates) {
    const origin = toOriginOrUndefined(candidate);
    if (!origin) continue;
    if (isLocalOrigin(origin)) continue;
    return origin;
  }

  return siteUrl;
}

function toNonEmptyString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (INVALID_ASSET_URL_TOKENS.has(trimmed.toLowerCase())) return undefined;
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFirstNonEmpty(values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const normalized = toNonEmptyString(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function toMetadataValue(value: string | null | undefined): string | undefined {
  const normalized = toNonEmptyString(value);
  if (!normalized) return undefined;
  return METADATA_PLACEHOLDER_TOKENS.has(normalized) ? undefined : normalized;
}

function normalizeInvitation(data: Partial<InvitationData>, invitationId: string): InvitationData {
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [];
  const normalizedSlug = pickFirstNonEmpty([data.slug ? String(data.slug) : undefined, invitationId]) ?? invitationId;
  const normalizedCoverImage = pickFirstNonEmpty([data.coverImageUrl, data.mainImageUrl, imageUrls[0]]) ?? "";
  const normalizedMainImage = pickFirstNonEmpty([data.mainImageUrl, data.coverImageUrl, imageUrls[0]]) ?? "";
  const normalizedDefaultFontFamily = "'Noto Sans KR', sans-serif";
  const normalizedThemeTextColor = data.themeTextColor ?? "#4a2c2a";
  const normalizedThemeFontSize = data.themeFontSize ?? 16;
  const normalizedThemeFontFamily = data.themeFontFamily ?? normalizedDefaultFontFamily;
  const normalizedHeroFontFamily = data.fontFamily ?? normalizedThemeFontFamily;
  const normalizedHeroMainFontFamily = data.heroMainFontFamily ?? normalizedHeroFontFamily;
  const normalizedHeroSubFontFamily = data.heroSubFontFamily ?? normalizedHeroFontFamily;
  const normalizedHeroMainFontColor = data.heroMainFontColor ?? data.fontColor ?? normalizedThemeTextColor;
  const normalizedHeroSubFontColor = data.heroSubFontColor ?? data.fontColor ?? normalizedThemeTextColor;
  const normalizedHeroMainFontSize = data.heroMainFontSize ?? data.fontSize ?? normalizedThemeFontSize;
  const normalizedHeroSubFontSize = data.heroSubFontSize ?? data.fontSize ?? normalizedThemeFontSize;

  const messageLines =
    data.messageLines && data.messageLines.length > 0
      ? data.messageLines
      : typeof data.message === "string"
        ? (data.message ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

  return {
    id: String(data.id ?? invitationId),
    slug: normalizedSlug,
    groomName: data.groomName ?? "신랑",
    brideName: data.brideName ?? "신부",
    weddingDateTime: data.weddingDateTime ?? (data as { date?: string }).date ?? "",
    venueName: data.venueName ?? (data as { locationName?: string }).locationName ?? "예식장 정보 미입력",
    venueAddress: data.venueAddress ?? (data as { address?: string }).address ?? "주소 정보 미입력",
    coverImageUrl: normalizedCoverImage,
    mainImageUrl: normalizedMainImage,
    mapImageUrl: pickFirstNonEmpty([data.mapImageUrl]) ?? "",
    imageUrls,
    messageLines,
    message: data.message,
    groomContact: data.groomContact,
    brideContact: data.brideContact,
    groomFatherName: data.groomFatherName,
    groomFatherContact: data.groomFatherContact,
    groomMotherName: data.groomMotherName,
    groomMotherContact: data.groomMotherContact,
    brideFatherName: data.brideFatherName,
    brideFatherContact: data.brideFatherContact,
    brideMotherName: data.brideMotherName,
    brideMotherContact: data.brideMotherContact,
    subway: data.subway,
    bus: data.bus,
    car: data.car,
    useSeparateAccounts: data.useSeparateAccounts ?? false,
    useGuestbook: data.useGuestbook ?? true,
    useRsvpModal: data.useRsvpModal ?? true,
    rsvpAutoOpenOnLoad: data.rsvpAutoOpenOnLoad ?? false,
    backgroundMusicUrl: toNonEmptyString(data.backgroundMusicUrl),
    fontFamily: normalizedHeroFontFamily,
    fontColor: data.fontColor ?? normalizedThemeTextColor,
    fontSize: data.fontSize ?? normalizedThemeFontSize,
    heroMainFontFamily: normalizedHeroMainFontFamily,
    heroMainFontColor: normalizedHeroMainFontColor,
    heroMainFontSize: normalizedHeroMainFontSize,
    heroSubFontFamily: normalizedHeroSubFontFamily,
    heroSubFontColor: normalizedHeroSubFontColor,
    heroSubFontSize: normalizedHeroSubFontSize,
    accountNumber: data.accountNumber,
    groomAccountNumber: data.groomAccountNumber,
    brideAccountNumber: data.brideAccountNumber,
    seoTitle: toNonEmptyString(data.seoTitle),
    seoDescription: toNonEmptyString(data.seoDescription),
    seoImageUrl: toNonEmptyString(data.seoImageUrl),
    galleryTitle: data.galleryTitle ?? "웨딩 갤러리",
    galleryType: data.galleryType ?? "swipe",
    themeBackgroundColor: data.themeBackgroundColor ?? "#fdf8f5",
    themeTextColor: data.themeTextColor ?? "#4a2c2a",
    themeAccentColor: data.themeAccentColor ?? "#803b2a",
    themePatternColor: data.themePatternColor ?? data.themeAccentColor ?? "#803b2a",
    themePattern: data.themePattern ?? "none",
    themeEffectType: data.themeEffectType ?? "none",
    themeFontFamily: normalizedThemeFontFamily,
    themeFontSize: normalizedThemeFontSize,
    themeScrollReveal: data.themeScrollReveal ?? false,
    heroDesignId: data.heroDesignId ?? "simply-meant",
    heroEffectType: data.heroEffectType === "shadow" ? "none" : (data.heroEffectType ?? "none"),
    heroEffectParticleCount: data.heroEffectParticleCount ?? 30,
    heroEffectSpeed: data.heroEffectSpeed ?? 100,
    heroEffectOpacity: data.heroEffectOpacity ?? 72,
    heroAccentFontFamily: data.heroAccentFontFamily ?? "'Playfair Display', serif",
    messageFontFamily: data.messageFontFamily ?? normalizedThemeFontFamily,
    transportFontFamily: data.transportFontFamily ?? normalizedThemeFontFamily,
    rsvpTitle: data.rsvpTitle ?? "참석 여부 전달",
    rsvpMessage: data.rsvpMessage ?? "특별한 날 축하의 마음으로 참석해주시는 모든 분들을 위해\n참석 여부 전달을 부탁드립니다.",
    rsvpButtonText: data.rsvpButtonText ?? "참석 여부 전달",
    rsvpFontFamily: data.rsvpFontFamily ?? normalizedThemeFontFamily,
    detailContent: data.detailContent,
    detailFontFamily: data.detailFontFamily ?? normalizedThemeFontFamily,
    locationTitle: data.locationTitle ?? "오시는 길",
    locationFloorHall: data.locationFloorHall,
    locationContact: data.locationContact,
    showMap: data.showMap ?? true,
    lockMap: data.lockMap ?? false,
    openingEnabled: data.openingEnabled ?? false,
    openingAnimationType:
      data.openingAnimationType === "typewriter" || data.openingAnimationType === "soft-fade"
        ? data.openingAnimationType
        : "none",
    openingBackgroundType: data.openingBackgroundType === "image" ? "image" : "color",
    openingBackgroundColor: data.openingBackgroundColor ?? "#e6d8ca",
    openingImageUrl: toNonEmptyString(data.openingImageUrl),
    openingImageMotionPreset: toNonEmptyString(data.openingImageMotionPreset) ?? "none",
    openingTitle: toNonEmptyString(data.openingTitle) ?? `${data.groomName ?? "신랑"} ${data.brideName ?? "신부"}`,
    openingMessage: toNonEmptyString(data.openingMessage) ?? "우리 결혼합니다.",
    openingTextOffsetX: Number.isFinite(data.openingTextOffsetX) ? data.openingTextOffsetX : 0,
    openingTextOffsetY: Number.isFinite(data.openingTextOffsetY) ? data.openingTextOffsetY : 0,
    openingFontFamily: toNonEmptyString(data.openingFontFamily) ?? normalizedThemeFontFamily,
    openingFontColor: toNonEmptyString(data.openingFontColor),
    openingTitleFontSize: data.openingTitleFontSize ?? 34,
    openingMessageFontSize: data.openingMessageFontSize ?? 19,
  };
}

async function fetchInvitationFromBackend(invitationId: string): Promise<InvitationData | null> {
  const apiBaseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/public/invitations/${encodeURIComponent(invitationId)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<InvitationData>;
    return normalizeInvitation(payload, invitationId);
  } catch {
    return null;
  }
}

async function fetchInvitationForPreview(invitationId: string): Promise<InvitationData | null> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/invitations/${encodeURIComponent(invitationId)}`, {
      method: "GET",
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<InvitationData>;
    return normalizeInvitation(payload, invitationId);
  } catch {
    return null;
  }
}

function parsePreviewFlag(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === "1" || entry.toLowerCase() === "true");
  }
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

async function getInvitationData(invitationId?: string, options?: { preview?: boolean }): Promise<InvitationData | null> {
  const resolvedId = invitationId?.trim();
  if (!resolvedId) return null;

  if (options?.preview) {
    return fetchInvitationForPreview(resolvedId);
  }

  return fetchInvitationFromBackend(resolvedId);
}

function formatInvitationDate(dateTime: string | null | undefined): string | undefined {
  if (!dateTime?.trim()) return undefined;
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const weekdayKo = ["일", "월", "화", "수", "목", "금", "토"][parsed.getDay()];
  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = parsed.getHours();
  const minute = String(parsed.getMinutes()).padStart(2, "0");
  const ampmText = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${weekdayKo}요일 ${ampmText} ${hour12}시 ${minute}분`;
}

function buildFallbackDescription(invitation: InvitationData): string {
  const dateText = formatInvitationDate(invitation.weddingDateTime);
  const venueText = toMetadataValue(invitation.venueName);
  const groomName = toMetadataValue(invitation.groomName) ?? "신랑";
  const brideName = toMetadataValue(invitation.brideName) ?? "신부";
  const pieces = [dateText, venueText].filter((value): value is string => Boolean(value));

  if (pieces.length > 0) {
    return pieces.join(" · ");
  }

  return `${groomName} & ${brideName} 결혼식에 초대합니다`;
}

function buildMetadata(invitation: InvitationData, invitationId: string): Metadata {
  const siteUrl = getSiteOrigin();
  const canonicalSlug = pickFirstNonEmpty([invitation.slug, invitationId]) ?? invitationId;
  const canonical = `${siteUrl}/invitation/${encodeURIComponent(canonicalSlug)}`;

  const groomName = toMetadataValue(invitation.groomName) ?? "신랑";
  const brideName = toMetadataValue(invitation.brideName) ?? "신부";
  const fallbackTitle = `${groomName} & ${brideName} 결혼식에 초대합니다`;
  const fallbackDescription = buildFallbackDescription(invitation);
  const title = toMetadataValue(invitation.seoTitle) ?? fallbackTitle;
  const description = toMetadataValue(invitation.seoDescription) ?? fallbackDescription;
  const metadataImage = pickFirstNonEmpty([
    invitation.seoImageUrl,
    invitation.mainImageUrl,
    invitation.coverImageUrl,
    invitation.imageUrls[0],
  ]);
  const assetBaseUrl = getMetadataAssetBaseUrl(siteUrl);
  const imageUrl = metadataImage ? resolveAssetUrl(metadataImage, assetBaseUrl) : "";

  return {
    title,
    description,
    keywords: ["모바일청첩장", "무료 모바일청첩장", "모바일 청첩장", "결혼", "웨딩", "결혼식 초대장"],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "ko_KR",
      siteName: "바우리",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: `${invitation.groomName} ${invitation.brideName} 청첩장 대표 이미지`,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export async function generateMetadata({ params, searchParams }: InvitationPageProps): Promise<Metadata> {
  const { invitationId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPreview = parsePreviewFlag(resolvedSearchParams?.preview);
  const invitation = await getInvitationData(invitationId, { preview: isPreview });

  if (!invitation) {
    return {
      title: "페이지를 찾을 수 없습니다.",
      description: "요청하신 청첩장을 찾을 수 없습니다.",
      robots: { index: false, follow: false },
    };
  }

  const metadata = buildMetadata(invitation, invitationId);
  if (isPreview) {
    return {
      ...metadata,
      robots: { index: false, follow: false },
    };
  }

  return metadata;
}

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const { invitationId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPreview = parsePreviewFlag(resolvedSearchParams?.preview);
  const invitation = await getInvitationData(invitationId, { preview: isPreview });

  if (!invitation) {
    notFound();
  }

  const apiBaseUrl = getApiBaseUrl();

  return (
    <InvitationMobileView
      invitation={invitation}
      apiBaseUrl={apiBaseUrl}
      preview={isPreview}
      invitationIdForActions={invitation.id}
      slugForActions={invitation.slug ?? invitationId}
    />
  );
}
