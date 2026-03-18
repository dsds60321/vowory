"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuthMe, logout, oauthLoginUrl } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const loadAuth = async () => {
      const me = await fetchAuthMe();
      setLoggedIn(me.loggedIn);
      setMounted(true);
    };

    void loadAuth();
  }, []);

  const handleSocialLogin = (provider: "google" | "kakao") => {
    window.location.href = oauthLoginUrl(provider);
  };

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme p-6">
      <div className="w-full max-w-[440px] space-y-12 text-center">
        <div className="space-y-4">
          <h1 className="serif-font text-3xl font-semibold tracking-tight text-theme-brand">바우리</h1>
          <p className="text-sm leading-relaxed text-theme-secondary">
            가장 소중한 날의 시작,
            <br />
            품격 있는 모바일 청첩장을 만들어보세요.
          </p>
        </div>

        <div className="login-card space-y-8">
          {!mounted ? <div className="rounded-xl border border-warm py-6 text-sm text-theme-secondary">로그인 정보 확인 중...</div> : null}

          {mounted && loggedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-theme-secondary">이미 로그인되어 있습니다.</p>
              <button className="w-full rounded-xl bg-theme-brand py-4 text-sm font-bold text-white" type="button" onClick={() => router.push("/")}>
                랜딩으로 이동
              </button>
              <button
                className="w-full rounded-xl border border-warm py-4 text-sm font-bold text-theme-secondary"
                type="button"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          ) : null}

          {mounted && !loggedIn ? (
            <div className="space-y-3">
              <button className="btn-social bg-[#FEE500] text-[#191919] hover:opacity-90" type="button" onClick={() => handleSocialLogin("kakao")}>
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                카카오로 시작하기
              </button>
              <button
                className="btn-social border border-warm bg-white text-gray-700 hover:bg-gray-50"
                type="button"
                onClick={() => handleSocialLogin("google")}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google 계정으로 로그인
              </button>
            </div>
          ) : null}
        </div>

        <Link className="inline-block text-xs text-theme-secondary underline" href="/">
          랜딩으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
