import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { resolveAssetUrl } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/site-url";
import ThankyouMobileView, { type ThankyouMobileViewData } from "./ThankyouMobileView";

type ThankyouRouteParams = {
  thankyouId: string;
};

type ThankyouPageProps = {
  params: Promise<ThankyouRouteParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const INVALID_ASSET_URL_TOKENS = new Set(["null", "undefined", "nan"]);

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.WEDDING_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function parsePreviewFlag(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === "1" || entry.toLowerCase() === "true");
  }
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function toNonEmptyString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (INVALID_ASSET_URL_TOKENS.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

function normalizeLegacyHeadingPrefixSize(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 25;
  const rounded = Math.round(value as number);
  if (rounded === 30) return 25;
  return Math.min(64, Math.max(16, rounded));
}

function normalizeLegacyHeadingTitleSize(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 29;
  const rounded = Math.round(value as number);
  if (rounded === 58) return 29;
  return Math.min(96, Math.max(28, rounded));
}

function normalizeThankyou(data: Partial<ThankyouMobileViewData>, thankyouId: string): ThankyouMobileViewData {
  const senderType = data.basicInfo?.senderType === "parents" ? "parents" : "couple";

  return {
    id: String(data.id ?? thankyouId),
    themeId: data.themeId ?? "classic-thankyou",
    main: {
      imageUrl: data.main?.imageUrl ?? "",
      caption: data.main?.caption ?? "",
    },
    basicInfo: {
      title: data.basicInfo?.title ?? "감사장",
      senderType,
      groomName: data.basicInfo?.groomName,
      brideName: data.basicInfo?.brideName,
      groomParentName: data.basicInfo?.groomParentName,
      brideParentName: data.basicInfo?.brideParentName,
      recipientName: data.basicInfo?.recipientName ?? data.basicInfo?.receiverName,
      headingPrefixText: data.basicInfo?.headingPrefixText,
      headingPrefixColor: data.basicInfo?.headingPrefixColor,
      headingPrefixFontSize: normalizeLegacyHeadingPrefixSize(data.basicInfo?.headingPrefixFontSize),
      headingTitleColor: data.basicInfo?.headingTitleColor,
      headingTitleFontSize: normalizeLegacyHeadingTitleSize(data.basicInfo?.headingTitleFontSize),
      senderName: data.basicInfo?.senderName ?? "감사의 마음",
      receiverName: data.basicInfo?.receiverName ?? data.basicInfo?.recipientName,
      eventDate: data.basicInfo?.eventDate,
    },
    greetingHtml: data.greetingHtml ?? "",
    detail: {
      bodyText: data.detail?.bodyText,
      ending: {
        imageUrl: data.detail?.ending?.imageUrl,
        caption: data.detail?.ending?.caption,
      },
    },
    share: {
      slug: data.share?.slug,
      shareUrl: data.share?.shareUrl,
      ogTitle: data.share?.ogTitle,
      ogDescription: data.share?.ogDescription,
      ogImageUrl: data.share?.ogImageUrl,
    },
    themeBackgroundColor: data.themeBackgroundColor,
    themeTextColor: data.themeTextColor,
    themeAccentColor: data.themeAccentColor,
    themePattern: data.themePattern,
    themeEffectType: data.themeEffectType,
    themeFontFamily: data.themeFontFamily,
    themeFontSize: data.themeFontSize,
    themeScrollReveal: data.themeScrollReveal,
  };
}

function buildSenderDescription(thankyou: ThankyouMobileViewData): string {
  const basicInfo = thankyou.basicInfo;
  if (basicInfo.senderType === "parents") {
    if (basicInfo.groomParentName && basicInfo.brideParentName) {
      return `${basicInfo.groomParentName} · ${basicInfo.brideParentName} 혼주가 전하는 감사 인사`;
    }
  } else if (basicInfo.groomName && basicInfo.brideName) {
    return `신랑 ${basicInfo.groomName}, 신부 ${basicInfo.brideName}가 전하는 감사 인사`;
  }
  return basicInfo.senderName ? `${basicInfo.senderName}님이 전하는 감사 인사` : "감사의 마음을 전합니다.";
}

async function fetchThankyouFromBackend(thankyouId: string): Promise<ThankyouMobileViewData | null> {
  const apiBaseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}/api/public/thankyou-cards/${encodeURIComponent(thankyouId)}`, {
      method: "GET",
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<ThankyouMobileViewData>;
    return normalizeThankyou(payload, thankyouId);
  } catch {
    return null;
  }
}

async function fetchThankyouForPreview(thankyouId: string): Promise<ThankyouMobileViewData | null> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookieHeader) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/thankyou-cards/${encodeURIComponent(thankyouId)}`, {
      method: "GET",
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as Partial<ThankyouMobileViewData>;
    return normalizeThankyou(payload, thankyouId);
  } catch {
    return null;
  }
}

async function getThankyouData(thankyouId?: string, options?: { preview?: boolean }): Promise<ThankyouMobileViewData | null> {
  const resolvedId = thankyouId?.trim();
  if (!resolvedId) return null;

  if (options?.preview) {
    return fetchThankyouForPreview(resolvedId);
  }

  return fetchThankyouFromBackend(resolvedId);
}

function buildMetadata(thankyou: ThankyouMobileViewData, thankyouId: string): Metadata {
  const siteUrl = getSiteOrigin();
  const canonicalSlug = thankyou.share.slug ?? thankyouId;
  const canonical = `${siteUrl}/thankyou/${encodeURIComponent(canonicalSlug)}`;

  const title = toNonEmptyString(thankyou.share.ogTitle) ?? thankyou.basicInfo.title ?? "감사장";
  const description = toNonEmptyString(thankyou.share.ogDescription) ?? buildSenderDescription(thankyou);
  const imageCandidate =
    toNonEmptyString(thankyou.share.ogImageUrl) ??
    toNonEmptyString(thankyou.main.imageUrl) ??
    toNonEmptyString(thankyou.detail.ending.imageUrl) ??
    "";
  const imageUrl = imageCandidate ? resolveAssetUrl(imageCandidate, siteUrl) : "";

  return {
    title,
    description,
    keywords: ["결혼", "웨딩", "감사장", "모바일 감사장"],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "ko_KR",
      siteName: "바우리",
      images: imageUrl ? [{ url: imageUrl, alt: `${title} 대표 이미지` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export async function generateMetadata({ params, searchParams }: ThankyouPageProps): Promise<Metadata> {
  const { thankyouId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPreview = parsePreviewFlag(resolvedSearchParams?.preview);
  const thankyou = await getThankyouData(thankyouId, { preview: isPreview });

  if (!thankyou) {
    return {
      title: "페이지를 찾을 수 없습니다.",
      description: "요청하신 감사장을 찾을 수 없습니다.",
      robots: { index: false, follow: false },
    };
  }

  const metadata = buildMetadata(thankyou, thankyou.id);
  if (isPreview) {
    return {
      ...metadata,
      robots: { index: false, follow: false },
    };
  }

  return metadata;
}

export default async function ThankyouPage({ params, searchParams }: ThankyouPageProps) {
  const { thankyouId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isPreview = parsePreviewFlag(resolvedSearchParams?.preview);
  const thankyou = await getThankyouData(thankyouId, { preview: isPreview });

  if (!thankyou) {
    notFound();
  }

  const apiBaseUrl = getApiBaseUrl();

  return <ThankyouMobileView thankyou={thankyou} apiBaseUrl={apiBaseUrl} />;
}
