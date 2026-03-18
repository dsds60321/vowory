"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAuthMe } from "@/lib/auth";
import LandingTopHeader from "@/components/LandingTopHeader";

type FeatureItem = {
  id: string;
  title: string;
  description: string;
  point: string;
};

type TemplateItem = {
  id: string;
  title: string;
  concept: string;
  imageUrl: string;
};

function getCircularDistance(index: number, activeIndex: number, length: number): number {
  let distance = index - activeIndex;
  const half = Math.floor(length / 2);
  if (distance > half) distance -= length;
  if (distance < -half) distance += length;
  return distance;
}

const featureItems: FeatureItem[] = [
  {
    id: "feature-fast",
    title: "3분 완성 제작 플로우",
    description: "신랑신부 정보, 예식 정보, 계좌/지도 입력만으로 첫 시안을 빠르게 생성합니다.",
    point: "빠른 시작",
  },
  {
    id: "feature-mobile",
    title: "모바일 최적화 청첩장",
    description: "모든 섹션이 모바일 터치 환경에 최적화되어 전달률과 가독성을 높입니다.",
    point: "모바일 퍼스트",
  },
  {
    id: "feature-brand",
    title: "웨딩 톤앤무드 커스터마이징",
    description: "색감, 폰트, 문구 톤을 손쉽게 조정해 커플만의 분위기를 표현할 수 있습니다.",
    point: "브랜드 감성",
  },
  {
    id: "feature-share",
    title: "공유와 응답 관리",
    description: "URL 공유, RSVP, 방명록 기능으로 하객과의 소통을 한 화면에서 관리합니다.",
    point: "운영 효율",
  },
];

const templateItems: TemplateItem[] = [
  {
    id: "template-style-1",
    title: "클래식 프레임",
    concept: "밝은 야외 사진과 정제된 레터링 스타일",
    imageUrl: "/sample/1.png",
  },
  {
    id: "template-style-2",
    title: "소프트 로맨틱",
    concept: "부드러운 톤과 중앙 포인트 타이포",
    imageUrl: "/sample/2.png",
  },
  {
    id: "template-style-3",
    title: "투 비컴 원",
    concept: "웜 베이지 배경의 클래식 카드 구성",
    imageUrl: "/sample/3.png",
  },
  {
    id: "template-style-4",
    title: "해피 웨딩데이",
    concept: "타이틀 중심의 오버레이 포스터 무드",
    imageUrl: "/sample/4.png",
  },
  {
    id: "template-style-5",
    title: "내추럴 선셋",
    concept: "자연광 사진 중심의 미니멀 레이아웃",
    imageUrl: "/sample/5.png",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(2);
  const activeTemplate = templateItems[activeTemplateIndex];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTemplateIndex((previous) => (previous + 1) % templateItems.length);
    }, 4600);

    return () => window.clearInterval(timer);
  }, []);

  const goToEditorWithGuard = () => {
    void (async () => {
      const me = await fetchAuthMe();
      if (me.loggedIn) {
        router.push("/editor");
        return;
      }
      router.push("/login");
    })();
  };

  return (
    <div className="selection:bg-[var(--theme-selection-bg)]">
      <LandingTopHeader />

      <main className="bg-gradient-to-b from-white via-[var(--theme-hero-via)] to-white text-theme-primary">
        <section id="hero" className="landing-section overflow-hidden pb-24 pt-16 md:pb-32 md:pt-24">
          <div className="landing-shell relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="space-y-7">
              <div className="inline-flex items-center rounded-md border border-[var(--theme-badge-border)] bg-[var(--theme-badge-bg)] px-4 py-2 text-xs font-semibold text-[var(--theme-badge-text)]">
                프리미엄 모바일 청첩장 스튜디오
              </div>
              <div className="space-y-5">
                <p className="text-sm tracking-[0.2em] text-theme-accent uppercase">The Most Beautiful Beginning</p>
                <h1 className="text-4xl leading-[1.2] font-semibold tracking-tight text-theme-brand md:text-6xl">
                  감성은 살리고,
                  <br />
                  제작은 더 빠르게.
                </h1>
                <p className="max-w-xl text-base leading-7 text-theme-secondary md:text-lg">
                  기존 바우리 스타일은 유지하면서, 웨딩 브랜드 특유의 정돈된 정보 구조와 프리미엄 감성을 결합했습니다.
                  하객이 필요한 정보를 한 번에 찾고 바로 행동할 수 있는 랜딩 UX를 제공합니다.
                </p>
              </div>

              <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button className="btn-cta-primary w-full whitespace-nowrap sm:w-auto" type="button" onClick={goToEditorWithGuard}>
                  무료로 청첩장 시작하기
                </button>
                <button className="btn-cta-secondary w-full whitespace-nowrap sm:w-auto" type="button" onClick={goToEditorWithGuard}>
                  모바일 청첩장 보기
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-theme-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-theme-accent">●</span>
                  제작비 0원
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-theme-accent">●</span>
                  실시간 수정
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-theme-accent">●</span>
                  모바일 최적화
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[430px]">
              <div className="wedding-surface p-4 md:p-5">
                <div className="relative h-[560px] overflow-hidden rounded-2xl bg-[#111111]">
                  <img
                    className="h-full w-full object-cover opacity-85"
                    src="https://cdn.vowory.com/wedding/users/sample/invitations/3.png"
                    alt="대표 모바일 청첩장 템플릿"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5" />
                  <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                    <p className="serif-font text-xs tracking-[0.28em] uppercase opacity-80">Wedding Invitation</p>
                    <h2 className="serif-font mt-2 text-3xl font-light">Aurora Garden</h2>
                    <p className="mt-2 text-sm text-white/80">2026.03.14 SAT 13:00 · Seoul</p>
                  </div>
                </div>
              </div>

              <div className="wedding-floating-card absolute -bottom-9 -left-6 hidden w-48 bg-white/95 p-4 backdrop-blur md:block">
                <p className="text-xs font-semibold tracking-[0.08em] text-theme-secondary">핵심 전환 포인트</p>
                <p className="mt-2 text-sm font-semibold text-theme-brand">정보 탐색 시간 단축</p>
              </div>

              <div className="wedding-floating-card absolute -right-6 top-8 hidden w-44 bg-white/95 p-4 backdrop-blur md:block">
                <p className="text-xs font-semibold tracking-[0.08em] text-theme-secondary">모바일 최적화</p>
                <p className="mt-2 text-sm font-semibold text-theme-brand">Responsive 360~1280px</p>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="landing-section border-y border-warm bg-[var(--theme-section-soft)] py-16 md:py-24">
          <div className="landing-shell">
            <div className="mb-10 md:mb-14">
              <p className="text-sm font-semibold tracking-[0.14em] text-theme-accent">SERVICE FEATURES</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-theme-brand md:text-5xl">핵심 서비스 특징</h2>
              <p className="mt-4 max-w-3xl text-theme-secondary">
                첫 방문 사용자도 바로 이해할 수 있는 정보 흐름으로 구성했습니다. 상단 CTA에서 시작해 템플릿 탐색, 신뢰 확보,
                문의/시작으로 자연스럽게 전환됩니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featureItems.map((feature) => (
                <article key={feature.id} className="wedding-feature-card">
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-theme-secondary">
                    {feature.point}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-theme-brand">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-theme-secondary">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="landing-section py-16 md:py-24">
          <div className="landing-shell">
            <div className="text-center">
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-theme-brand md:text-5xl">이런 청첩장을 만들 수 있어요</h2>
              <p className="mt-4 text-sm text-theme-secondary md:text-base">좌우로 넘기며 다양한 디자인을 확인해보세요</p>
            </div>

            <div className="relative mx-auto mt-10 h-[430px] w-full max-w-[1140px] overflow-hidden [perspective:1600px] md:h-[500px]">
              {templateItems.map((template, index) => {
                const distance = getCircularDistance(index, activeTemplateIndex, templateItems.length);
                const absDistance = Math.abs(distance);
                const hidden = absDistance > 3;
                const offsetX = distance * 180;
                const rotateY = distance * -12;
                const scale = absDistance === 0 ? 1 : Math.max(0.62, 1 - absDistance * 0.14);
                const opacity = absDistance === 0 ? 1 : Math.max(0.18, 0.88 - absDistance * 0.22);
                const zIndex = 50 - absDistance;

                return (
                  <button
                    key={template.id}
                    className={`absolute left-1/2 top-4 w-[180px] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.55)] transition-all duration-500 md:w-[220px] ${
                      hidden ? "pointer-events-none opacity-0" : ""
                    }`}
                    style={{
                      opacity,
                      transform: `translateX(calc(-50% + ${offsetX}px)) rotateY(${rotateY}deg) scale(${scale})`,
                      transformStyle: "preserve-3d",
                      zIndex,
                    }}
                    type="button"
                    onClick={() => setActiveTemplateIndex(index)}
                    aria-label={`${template.title} 템플릿 선택`}
                  >
                    <div className="h-[285px] md:h-[350px]">
                      <img className="h-full w-full object-cover" src={template.imageUrl} alt={template.title} />
                    </div>
                  </button>
                );
              })}

              <button
                className="absolute left-3 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-warm bg-white/95 p-2 text-theme-secondary shadow-sm transition-colors hover:text-theme-brand"
                type="button"
                onClick={() =>
                  setActiveTemplateIndex((previous) => (previous - 1 + templateItems.length) % templateItems.length)
                }
                aria-label="이전 템플릿"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                className="absolute right-3 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-warm bg-white/95 p-2 text-theme-secondary shadow-sm transition-colors hover:text-theme-brand"
                type="button"
                onClick={() => setActiveTemplateIndex((previous) => (previous + 1) % templateItems.length)}
                aria-label="다음 템플릿"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xl font-semibold text-theme-brand">{activeTemplate.title}</p>
              <p className="mt-1 text-sm text-theme-secondary">{activeTemplate.concept}</p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              {templateItems.map((template, index) => (
                <button
                  key={`template-dot-${template.id}`}
                  className={`h-2.5 rounded-full transition-all ${index === activeTemplateIndex ? "w-6 bg-theme-brand" : "w-2.5 bg-[#cfd8e3]"}`}
                  type="button"
                  onClick={() => setActiveTemplateIndex(index)}
                  aria-label={`${template.title} 보기`}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button className="btn-cta-primary min-w-[170px]" type="button" onClick={goToEditorWithGuard}>
                청첩장 제작하기
              </button>
              {/*<button className="btn-cta-secondary min-w-[170px]" type="button" onClick={goToEditorWithGuard}>*/}
              {/*  샘플 전체 보러가기*/}
              {/*</button>*/}
            </div>
          </div>
        </section>

        <section id="reviews" className="landing-section bg-[var(--theme-section-muted)] py-16 md:py-24">
          <div className="landing-shell space-y-8 md:space-y-10">
            <article className="mx-auto max-w-[1040px] rounded-[26px] border border-warm bg-white px-6 py-10 shadow-[0_16px_45px_-34px_rgba(15,23,42,0.35)] md:px-10 md:py-12">
              <p className="text-center text-sm font-semibold text-theme-secondary">연중무휴 24시간 편집 지원</p>
              <h2 className="mt-2 text-center text-3xl font-semibold tracking-tight text-theme-brand md:text-5xl">
                <span className="text-[#a9adb4]">발행 후에도 </span>
                무제한 수정
              </h2>

              <div className="mx-auto mt-8 grid max-w-[620px] grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1].map((phoneIndex) => (
                  <div key={`edit-phone-${phoneIndex}`} className="relative overflow-hidden rounded-2xl border border-warm bg-[#1b1d22] p-3 shadow-sm">
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-theme-secondary">
                      {phoneIndex === 0 ? "샘플 이용중" : "210일 뒤 완료"}
                    </div>
                    <div className="mt-8 rounded-xl bg-white/92 p-3">
                      <div className="space-y-2">
                        {["관리페이지", "공유하기", "청첩장 보기", "청첩장 편집하기", "프로필/제목 변경", "삭제하기"].map((menu, menuIndex) => (
                          <div
                            key={`${menu}-${menuIndex}`}
                            className={`rounded-md px-2 py-1.5 text-[11px] font-medium ${
                              menu === "청첩장 편집하기" ? "bg-[var(--theme-section-soft)] text-theme-brand" : "text-[#a0a5ad]"
                            }`}
                          >
                            {menu}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-white px-2 py-1 text-center text-[10px] font-semibold text-theme-secondary">...</div>
                      <div className="rounded-md bg-[#dce8ff] px-2 py-1 text-center text-[10px] font-semibold text-[#2f6dd8]">
                        {phoneIndex === 0 ? "편집하기" : "관리페이지"}
                      </div>
                      <div className="rounded-md bg-[#dce8ff] px-2 py-1 text-center text-[10px] font-semibold text-[#2f6dd8]">
                        {phoneIndex === 0 ? "구매하기" : "공유하기"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="landing-section border-t border-warm bg-white py-16 text-center md:py-20">
          <div className="landing-shell">
            <h2 className="text-3xl font-semibold tracking-tight text-theme-brand md:text-5xl">지금, 우리만의 청첩장을 시작하세요</h2>
            <p className="mx-auto mt-4 max-w-2xl text-theme-secondary">
              섹션 구조는 익숙하게, 무드는 더 섬세하게. 웨딩 초대장의 첫인상을 완성할 준비가 되었습니다.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="btn-cta-primary" type="button" onClick={goToEditorWithGuard}>
                청첩장 제작하기
              </button>
              <button className="btn-cta-secondary" type="button" onClick={goToEditorWithGuard}>
                데모 확인하기
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-warm bg-[var(--theme-section-muted)] py-12">
          <div className="landing-shell grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="serif-font text-3xl text-theme-brand">바우리</p>
              <p className="mt-4 max-w-md text-sm leading-6 text-theme-secondary">
                화이트 베이스 위에 절제된 포인트 컬러를 더해, 세련된 웨딩 무드를 전달하는 모바일 청첩장 플랫폼.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm text-theme-secondary md:grid-cols-3">
              <div className="space-y-2">
                <p className="font-semibold text-theme-brand">서비스</p>
                <a href="#services">주요 특징</a>
                <a href="#templates">템플릿</a>
                <a href="#reviews">고객 후기</a>
              </div>
              <div className="flex flex-col items-start gap-2">
                <p className="font-semibold text-theme-brand">고객지원</p>
                <Link href="/notices">공지사항</Link>
                <Link href="/login">로그인</Link>
                <button type="button" className="text-left" onClick={goToEditorWithGuard}>
                  제작 시작
                </button>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-theme-brand">사업자 정보</p>
                <p>바우리 Inc.</p>
                <a href="mailto:admin@vowory.com">admin@vowory.com</a>
                <p>© 2026 바우리. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
