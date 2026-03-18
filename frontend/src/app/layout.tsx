import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { DEFAULT_THEME, normalizeTheme } from "@/lib/theme";
import { getSiteOrigin, joinSiteUrl } from "@/lib/site-url";
import GoogleAdsenseLoader from "@/components/GoogleAdsenseLoader";

const siteOrigin = getSiteOrigin();
const DEFAULT_API_BASE_URL = "http://localhost:8080";

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.WEDDING_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

async function resolveInitialThemeFromConfig(): Promise<string> {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/api/public/config`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return DEFAULT_THEME;
    const payload = (await response.json()) as { appThemeKey?: string | null };
    return normalizeTheme(payload.appThemeKey);
  } catch {
    return DEFAULT_THEME;
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: "바우리 | 모바일 청첩장 제작",
    template: "%s | 바우리",
  },
  description: "무료 모바일청첩장, 결혼식 초대장, 웨딩 감사장을 쉽고 예쁘게 제작하고 공유하세요.",
  applicationName: "바우리",
  other: {
    "google-adsense-account": "ca-pub-8833422495639297",
  },
  keywords: [
    "모바일청첩장",
    "무료 모바일청첩장",
    "무료 모바일 청첩장",
    "모바일 청첩장",
    "청첩장",
    "결혼",
    "웨딩",
    "결혼식 초대장",
    "모바일 초대장",
    "wedding invitation",
  ],
  alternates: {
    canonical: siteOrigin,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "바우리",
    url: siteOrigin,
    title: "바우리 | 모바일 청첩장 제작",
    description: "무료 모바일청첩장, 결혼식 초대장, 웨딩 감사장을 쉽고 예쁘게 제작하고 공유하세요.",
    images: [
      {
        url: joinSiteUrl("/favicon.ico"),
        alt: "바우리",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "바우리 | 모바일 청첩장 제작",
    description: "무료 모바일청첩장, 결혼식 초대장, 웨딩 감사장을 쉽고 예쁘게 제작하고 공유하세요.",
    images: [joinSiteUrl("/favicon.ico")],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
      ? {
          "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
        }
      : undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme = await resolveInitialThemeFromConfig();
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "바우리",
    url: siteOrigin,
    inLanguage: "ko-KR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteOrigin}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="ko" data-theme={initialTheme}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Noto+Serif+KR:wght@300;400;500;600;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__WEDDING_THEME__ = ${JSON.stringify(initialTheme)};`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <GoogleAdsenseLoader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
