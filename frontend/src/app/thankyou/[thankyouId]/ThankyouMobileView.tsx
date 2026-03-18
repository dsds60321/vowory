"use client";

import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { resolveAssetUrl } from "@/lib/assets";
import { sanitizeRichTextHtml } from "@/lib/sanitize";
import {
  THEME_DEFAULTS,
  ThemeParticle,
  buildThemeParticles,
  buildThemePatternStyle,
  clampThemeFontSize,
  normalizeHexColor,
  toRgba,
} from "@/components/mobile/theme-utils";

export type ThankyouMobileViewData = {
  id: string;
  themeId: string;
  main: {
    imageUrl?: string | null;
    caption?: string | null;
  };
  basicInfo: {
    title: string;
    senderType: "couple" | "parents";
    groomName?: string | null;
    brideName?: string | null;
    groomParentName?: string | null;
    brideParentName?: string | null;
    recipientName?: string | null;
    headingPrefixText?: string | null;
    headingPrefixColor?: string | null;
    headingPrefixFontSize?: number | null;
    headingTitleColor?: string | null;
    headingTitleFontSize?: number | null;
    senderName: string;
    receiverName?: string | null;
    eventDate?: string | null;
  };
  greetingHtml: string;
  detail: {
    bodyText?: string | null;
    ending: {
      imageUrl?: string | null;
      caption?: string | null;
    };
  };
  share: {
    slug?: string | null;
    shareUrl?: string | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImageUrl?: string | null;
  };
  themeBackgroundColor?: string | null;
  themeTextColor?: string | null;
  themeAccentColor?: string | null;
  themePattern?: string | null;
  themeEffectType?: string | null;
  themeFontFamily?: string | null;
  themeFontSize?: number | null;
  themeScrollReveal?: boolean;
};

type ThankyouMobileViewProps = {
  thankyou: ThankyouMobileViewData;
  apiBaseUrl?: string;
  embedded?: boolean;
};

function formatDateText(rawDate?: string | null): string {
  if (!rawDate) return "";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function buildSignatureText(thankyou: ThankyouMobileViewData): string {
  const basicInfo = thankyou.basicInfo;
  if (basicInfo.senderType === "parents") {
    if (basicInfo.groomParentName && basicInfo.brideParentName) {
      return `${basicInfo.groomParentName} · ${basicInfo.brideParentName} 드림(혼주)`;
    }
  } else if (basicInfo.groomName && basicInfo.brideName) {
    return `신랑 ${basicInfo.groomName} · 신부 ${basicInfo.brideName} 드림`;
  }
  return basicInfo.senderName || "감사의 마음을 전합니다.";
}

function buildDisplayTitle(rawTitle?: string): string {
  const normalized = rawTitle?.trim();
  if (!normalized) return "감사드립니다.";
  return normalized;
}

function clampHeadingFontSize(value: number | null | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value as number)));
}

export default function ThankyouMobileView({ thankyou, apiBaseUrl, embedded = false }: ThankyouMobileViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const themeBackgroundColor = useMemo(
    () => normalizeHexColor(thankyou.themeBackgroundColor ?? undefined, THEME_DEFAULTS.backgroundColor),
    [thankyou.themeBackgroundColor],
  );
  const themeTextColor = useMemo(
    () => normalizeHexColor(thankyou.themeTextColor ?? undefined, THEME_DEFAULTS.textColor),
    [thankyou.themeTextColor],
  );
  const themeAccentColor = useMemo(
    () => normalizeHexColor(thankyou.themeAccentColor ?? undefined, THEME_DEFAULTS.accentColor),
    [thankyou.themeAccentColor],
  );
  const themePattern = thankyou.themePattern ?? THEME_DEFAULTS.pattern;
  const themeEffectType = thankyou.themeEffectType ?? THEME_DEFAULTS.effectType;
  const themeFontFamily = thankyou.themeFontFamily ?? THEME_DEFAULTS.fontFamily;
  const themeFontSize = clampThemeFontSize(thankyou.themeFontSize ?? undefined);
  const revealEnabled = thankyou.themeScrollReveal ?? THEME_DEFAULTS.scrollReveal;

  const patternStyle = useMemo(() => buildThemePatternStyle(themePattern, themeAccentColor), [themePattern, themeAccentColor]);
  const themeParticles = useMemo<ThemeParticle[]>(() => buildThemeParticles(themeEffectType), [themeEffectType]);

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
        "--invite-theme-text": themeTextColor,
        "--invite-surface": toRgba(themeBackgroundColor, 0.86),
        "--invite-surface-soft": toRgba(themeBackgroundColor, 0.72),
        backgroundColor: themeBackgroundColor,
        color: themeTextColor,
        fontFamily: themeFontFamily,
        fontSize: `${themeFontSize}px`,
      }) as CSSProperties,
    [patternStyle, themeBackgroundColor, themeTextColor, themeAccentColor, themeFontFamily, themeFontSize],
  );

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
  }, [embedded, revealEnabled, thankyou.id]);

  const heroImageUrl = resolveAssetUrl(thankyou.main.imageUrl ?? "", apiBaseUrl);
  const endingImageUrl = resolveAssetUrl(thankyou.detail.ending.imageUrl ?? "", apiBaseUrl);
  const greetingHtml = sanitizeRichTextHtml(thankyou.greetingHtml ?? "");
  const recipientName = thankyou.basicInfo.recipientName ?? thankyou.basicInfo.receiverName;
  const signatureText = buildSignatureText(thankyou);
  const displayTitle = buildDisplayTitle(thankyou.basicInfo.title);
  const isParentsType = thankyou.basicInfo.senderType === "parents";
  const coupleReady = Boolean(thankyou.basicInfo.groomName && thankyou.basicInfo.brideName);
  const parentsReady = Boolean(thankyou.basicInfo.groomParentName && thankyou.basicInfo.brideParentName);
  const headingPrefixText = thankyou.basicInfo.headingPrefixText?.trim() || (isParentsType ? "고마운 마음을 담아" : "진심을 담아");
  const headingPrefixColor = normalizeHexColor(thankyou.basicInfo.headingPrefixColor ?? undefined, "#df9a9d");
  const headingPrefixFontSize = clampHeadingFontSize(thankyou.basicInfo.headingPrefixFontSize, 16, 64, 25);
  const headingTitleColor = normalizeHexColor(thankyou.basicInfo.headingTitleColor ?? undefined, "#524b51");
  const headingTitleFontSize = clampHeadingFontSize(thankyou.basicInfo.headingTitleFontSize, 28, 96, 29);

  const content = (
    <div
      ref={rootRef}
      className={`invitation-theme-scope relative overflow-hidden ${revealEnabled ? "invite-reveal-enabled" : ""}`}
      style={themeWrapperStyle}
    >
      {themeParticles.length > 0 ? (
        <div className={`invite-theme-effect-layer invite-theme-effect-${themeEffectType}`}>
          {themeParticles.map((particle, index) => (
            <span
              key={`thankyou-theme-particle-${themeEffectType}-${index}`}
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

      <div className="relative z-[2]">
        <section className="relative overflow-hidden" data-invite-reveal>
          {heroImageUrl ? <img className="h-[560px] w-full object-cover" src={heroImageUrl} alt="감사장 메인 이미지" /> : <div className="h-[560px] w-full bg-stone-100" />}
          <div className="absolute inset-0 bg-black/20" />
          {thankyou.main.caption ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-6 py-6 text-white">
              <p className="text-center text-sm leading-relaxed">{thankyou.main.caption}</p>
            </div>
          ) : null}
        </section>

        <section className="px-6 py-12 text-center" data-invite-reveal>
          <div className="mx-auto max-w-[360px]">
            <p className="serif-kr leading-none tracking-[0.08em]" style={{ color: headingPrefixColor, fontSize: `${headingPrefixFontSize}px` }}>
              {headingPrefixText}
            </p>
            <h1 className="serif-kr mt-3 leading-[0.95] font-semibold tracking-[-0.02em]" style={{ color: headingTitleColor, fontSize: `${headingTitleFontSize}px` }}>
              {displayTitle}
            </h1>

            {recipientName ? <p className="mt-8 text-[13px] tracking-[0.08em] text-theme-accent">{recipientName}님께</p> : null}

            <div className="mt-6 min-h-[34px] text-center text-[18px] leading-relaxed text-theme-brand">
              {!isParentsType && coupleReady ? (
                <p className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                  <span className="serif-font text-[18px] italic text-[#ef9ea3] lowercase">groom</span>
                  <strong className="font-semibold text-[#463f45]">{thankyou.basicInfo.groomName}</strong>
                  <span className="serif-font px-1 text-[20px] italic text-[#8c8388]">and</span>
                  <span className="serif-font text-[18px] italic text-[#ef9ea3] lowercase">bride</span>
                  <strong className="font-semibold text-[#463f45]">{thankyou.basicInfo.brideName}</strong>
                  <span className="text-[#8c8388]">드림</span>
                </p>
              ) : null}

              {isParentsType && parentsReady ? (
                <p className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                  <span className="text-[13px] tracking-[0.06em] text-[#ef9ea3]">신랑측 혼주</span>
                  <strong className="font-semibold text-[#463f45]">{thankyou.basicInfo.groomParentName}</strong>
                  <span className="serif-font px-1 text-[20px] italic text-[#8c8388]">and</span>
                  <span className="text-[13px] tracking-[0.06em] text-[#ef9ea3]">신부측 혼주</span>
                  <strong className="font-semibold text-[#463f45]">{thankyou.basicInfo.brideParentName}</strong>
                  <span className="text-[#8c8388]">드림</span>
                </p>
              ) : null}

              {(!coupleReady && !isParentsType) || (!parentsReady && isParentsType) ? <p className="text-[15px] text-theme-brand">{signatureText}</p> : null}
            </div>

            {thankyou.basicInfo.eventDate ? <p className="mt-4 text-xs text-theme-secondary">{formatDateText(thankyou.basicInfo.eventDate)}</p> : null}
          </div>
        </section>

        <section className="px-6 pb-10" data-invite-reveal>
          <div className="rounded-2xl bg-white/55 px-4 py-2">
            <div className="border-y border-warm py-5">
              <div className="border-l-2 border-warm pl-4">
                <div
                  className="ql-editor !p-0 text-[15px] leading-[1.9] text-theme-secondary [&_p]:mb-4 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: greetingHtml }}
                />
              </div>
            </div>
          </div>
        </section>

        {thankyou.detail.bodyText ? (
          <section className="px-6 pb-10" data-invite-reveal>
            <div className="rounded-2xl bg-white/70 p-5 text-sm leading-relaxed text-theme-secondary whitespace-pre-wrap">{thankyou.detail.bodyText}</div>
          </section>
        ) : null}

        {endingImageUrl || thankyou.detail.ending.caption ? (
          <section className="space-y-4 px-6 pb-14" data-invite-reveal>
            {endingImageUrl ? (
              <div className="overflow-hidden rounded-2xl bg-white/80">
                <img className="h-auto w-full object-cover" src={endingImageUrl} alt="감사장 엔딩 이미지" />
              </div>
            ) : null}
            {thankyou.detail.ending.caption ? (
              <div className="rounded-xl bg-white/70 p-4 text-center text-sm text-theme-secondary whitespace-pre-wrap">{thankyou.detail.ending.caption}</div>
            ) : null}
          </section>
        ) : null}
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
