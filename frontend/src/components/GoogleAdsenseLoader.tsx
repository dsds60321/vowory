"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { fetchAuthMe } from "@/lib/auth";

const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8833422495639297";
const ADSENSE_SCRIPT_ATTR = "data-google-adsense-loader";

function shouldShowAdsense(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return true;
  if (pathname === "/editor" || pathname === "/editor/") return true;
  if (pathname === "/notices" || pathname === "/notices/") return true;
  if (/^\/notices\/[^/]+\/?$/.test(pathname)) return true;
  return false;
}

function isEditorPath(pathname: string): boolean {
  return pathname === "/editor" || pathname === "/editor/";
}

function cleanupAdSenseArtifacts() {
  document.querySelectorAll("ins.adsbygoogle").forEach((element) => element.remove());
  document.querySelectorAll("iframe[id^='aswift_']").forEach((element) => element.remove());
  document.querySelectorAll("iframe[id^='google_ads_iframe']").forEach((element) => element.remove());
  document.querySelectorAll(".google-auto-placed").forEach((element) => element.remove());
}

export default function GoogleAdsenseLoader() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const existingScripts = document.querySelectorAll<HTMLScriptElement>(`script[${ADSENSE_SCRIPT_ATTR}='true']`);
    const removeAdsense = () => {
      existingScripts.forEach((script) => script.remove());
      cleanupAdSenseArtifacts();
    };
    const appendAdsenseScript = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = ADSENSE_SRC;
      script.crossOrigin = "anonymous";
      script.setAttribute(ADSENSE_SCRIPT_ATTR, "true");
      document.head.appendChild(script);
    };

    let active = true;
    void (async () => {
      const baseAllowed = shouldShowAdsense(pathname);
      if (!baseAllowed) {
        if (!active) return;
        removeAdsense();
        return;
      }

      // /editor는 비로그인 접근 시 로그인 페이지로 이동하므로, 리다이렉트 화면 광고 노출을 방지한다.
      if (isEditorPath(pathname)) {
        const me = await fetchAuthMe();
        if (!active) return;
        if (!me.loggedIn) {
          removeAdsense();
          return;
        }
      }

      if (existingScripts.length > 0) {
        return;
      }
      appendAdsenseScript();
    })();

    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}
