"use client";

import { useCallback, useMemo } from "react";

type MapShortcutButtonsProps = {
  venueName?: string;
  address?: string;
  className?: string;
  buttonClassName?: string;
};

type MapShortcutOption = {
  id: "naver" | "kakao" | "tmap";
  label: string;
  iconSrc: string;
  appUrl: string;
  webUrl: string;
};

const DEFAULT_WRAPPER_CLASS = "grid grid-cols-3 gap-2 px-2.5";
const DEFAULT_BUTTON_CLASS =
  "flex h-[44px] min-w-0 items-center justify-center gap-1 rounded-md border border-warm bg-white px-1 text-[12px] font-semibold text-theme-secondary shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:bg-theme";
const APP_NAME = "wedding-letter";

function buildMapShortcutOptions(query: string): MapShortcutOption[] {
  const encodedQuery = encodeURIComponent(query);
  const encodedAppName = encodeURIComponent(APP_NAME);

  return [
    {
      id: "tmap",
      label: "티맵",
      iconSrc: "/tmap_icon.png",
      appUrl: `tmap://search?name=${encodedQuery}`,
      webUrl: "https://www.tmap.co.kr/",
    },
    {
      id: "kakao",
      label: "카카오내비",
      iconSrc: "/kakao_icon.png",
      appUrl: `kakaomap://search?q=${encodedQuery}`,
      webUrl: `https://map.kakao.com/?q=${encodedQuery}`,
    },
    {
      id: "naver",
      label: "네이버지도",
      iconSrc: "/navermap_icon_2.png",
      appUrl: `nmap://search?query=${encodedQuery}&appname=${encodedAppName}`,
      webUrl: `https://map.naver.com/v5/search/${encodedQuery}`,
    },
  ];
}

export default function MapShortcutButtons({
  venueName,
  address,
  className = DEFAULT_WRAPPER_CLASS,
  buttonClassName = DEFAULT_BUTTON_CLASS,
}: MapShortcutButtonsProps) {
  const destination = useMemo(() => [venueName, address].filter(Boolean).join(" ").trim(), [venueName, address]);
  const options = useMemo(() => buildMapShortcutOptions(destination), [destination]);
  const disabled = destination.length === 0;

  const openMapApp = useCallback((appUrl: string, webUrl: string) => {
    if (typeof window === "undefined") return;

    let fallbackTimer = 0;

    const clearFallback = () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("pagehide", clearFallback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearFallback();
      }
    };

    window.addEventListener("pagehide", clearFallback);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    fallbackTimer = window.setTimeout(() => {
      clearFallback();
      window.location.href = webUrl;
    }, 800);

    window.location.href = appUrl;
  }, []);

  return (
    <div className={className}>
      {options.map((option) => (
        <button
          className={`${buttonClassName}${disabled ? " cursor-not-allowed opacity-50 hover:bg-transparent" : ""}`}
          key={option.id}
          type="button"
          onClick={() => {
            if (disabled) return;
            openMapApp(option.appUrl, option.webUrl);
          }}
          disabled={disabled}
        >
          <img src={option.iconSrc} alt="" className="h-[15px] w-[15px] shrink-0 object-contain" aria-hidden="true" />
          <span className="min-w-0 truncate whitespace-nowrap leading-none">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
