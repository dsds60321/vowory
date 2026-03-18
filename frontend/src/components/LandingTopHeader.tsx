"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { fetchAuthMe, logout } from "@/lib/auth";
import type { NoticeSummary } from "@/types/notice";

export default function LandingTopHeader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [welcomeName, setWelcomeName] = useState("회원");
  const [bannerNotices, setBannerNotices] = useState<NoticeSummary[]>([]);

  useEffect(() => {
    const loadAuth = async () => {
      const me = await fetchAuthMe();
      setLoggedIn(me.loggedIn);
      setWelcomeName(me.name ?? "회원");
      setMounted(true);
    };

    void loadAuth();
  }, []);

  useEffect(() => {
    const loadBannerNotices = async () => {
      try {
        const data = await apiFetch<NoticeSummary[]>("/api/public/notices/banner", {
          cache: "no-store",
        });
        setBannerNotices(data);
      } catch {
        setBannerNotices([]);
      }
    };

    void loadBannerNotices();
  }, []);

  const goToEditorWithGuard = () => {
    if (!mounted) return;
    if (loggedIn) {
      router.push("/editor");
      return;
    }
    router.push("/login");
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setWelcomeName("회원");
    router.refresh();
  };

  return (
    <>
      {bannerNotices.length > 0 ? (
        <div className="relative overflow-hidden bg-theme-brand px-4 py-2 text-white sm:px-6 sm:py-2.5">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 pr-14 text-[12px] font-medium tracking-wide sm:gap-6 sm:pr-20 sm:text-[13px]">
            <div className="flex items-center gap-2">
              <button
                className="max-w-[340px] truncate text-left underline-offset-2 hover:underline"
                type="button"
                onClick={() => router.push(`/notices/${bannerNotices[0].id}`)}
              >
                {bannerNotices[0].title}
              </button>
            </div>
            <button className="absolute right-4 text-[10px] opacity-60 transition-opacity hover:opacity-100 sm:right-6" type="button">
              <span className="sm:hidden">닫기 ✕</span>
              <span className="hidden sm:inline">7일 동안 보지 않기 ✕</span>
            </button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-50 border-b border-warm bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 md:px-8">
          <div className="flex items-center gap-5 md:gap-14">
            <Link className="inline-flex items-center" href="/">
              <Image
                src="/logo.png"
                alt="바우리"
                width={220}
                height={80}
                priority
                className="h-10 w-auto"
              />
            </Link>
            <nav className="hidden items-center gap-10 text-[14px] font-medium text-theme-secondary lg:flex">
              <button className="transition-colors hover:text-[var(--theme-brand)]" type="button" onClick={goToEditorWithGuard}>
                모바일 청첩장
              </button>
              {/*<a className="transition-colors hover:text-[var(--theme-brand)]" href="#">*/}
              {/*  고객후기*/}
              {/*</a>*/}
              <Link className="transition-colors hover:text-[var(--theme-brand)]" href="/notices">
                공지사항
              </Link>
              {/*<a className="flex items-center gap-1 text-theme-accent" href="#">*/}
              {/*  이벤트 <span className="material-symbols-outlined text-xs">forest</span>*/}
              {/*</a>*/}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {!mounted ? <div className="h-8 w-20 rounded-md border border-warm sm:h-9 sm:w-24" /> : null}

            {mounted && !loggedIn ? (
              <button
                className="flex h-8 w-8 items-center justify-center rounded-md border border-warm bg-theme text-theme-secondary transition-colors hover:text-[var(--theme-brand)] sm:h-9 sm:w-9"
                type="button"
                onClick={() => router.push("/login")}
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
              </button>
            ) : null}

            {mounted && loggedIn ? (
              <>
                <span className="hidden text-sm font-medium text-theme-secondary md:block">{welcomeName}님 환영합니다</span>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-warm px-2.5 py-2 text-[11px] font-bold text-theme-secondary whitespace-nowrap transition-colors hover:bg-[var(--theme-bg)] sm:px-4 sm:text-xs"
                  type="button"
                  onClick={() => router.push("/mypage")}
                >
                  <span className="material-symbols-outlined text-[16px] sm:hidden">person</span>
                  <span className="hidden sm:inline">마이페이지</span>
                </button>
                <button
                  className="rounded-md bg-theme-brand px-2.5 py-2 text-[11px] font-bold text-white whitespace-nowrap sm:px-4 sm:text-xs"
                  type="button"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
