"use client";

import { useEffect, useMemo, useState } from "react";
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

type ReviewItem = {
  id: string;
  couple: string;
  quote: string;
  meta: string;
};

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
    id: "template-aurora",
    title: "Aurora Garden",
    concept: "은은한 플로럴과 따뜻한 오프화이트 톤",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: "template-cream",
    title: "Cream Signature",
    concept: "미니멀 레이아웃과 캘리 타이포 강조",
    imageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: "template-classic",
    title: "Classic Ribbon",
    concept: "정제된 라인과 클래식 무드",
    imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: "template-glow",
    title: "Sunset Glow",
    concept: "화이트 베이스 + 코랄 포인트 컬러",
    imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: "template-vintage",
    title: "Vintage Blossom",
    concept: "필름 톤 이미지와 감성적인 레터링",
    imageUrl: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: "template-clean",
    title: "Clean Moment",
    concept: "콘텐츠 중심의 고밀도 정보 구성",
    imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=900",
  },
];

const reviewItems: ReviewItem[] = [
  {
    id: "review-01",
    couple: "민서 & 태준",
    quote: "처음부터 모바일 화면이 예쁘게 잡혀서 부모님께도 바로 공유할 수 있었어요. 수정도 정말 간단했습니다.",
    meta: "2025.11 예식 · 서울",
  },
  {
    id: "review-02",
    couple: "지현 & 도윤",
    quote: "화이트톤 기반 디자인이 고급스럽고, CTA 버튼 위치가 명확해서 하객들이 필요한 정보를 바로 찾았습니다.",
    meta: "2025.10 예식 · 부산",
  },
  {
    id: "review-03",
    couple: "서영 & 현우",
    quote: "템플릿 선택 폭이 넓고 갤러리, 지도, 계좌안내까지 한 번에 정리돼 준비 시간이 크게 줄었어요.",
    meta: "2025.09 예식 · 대구",
  },
  {
    id: "review-04",
    couple: "유진 & 성훈",
    quote: "반응형이 깔끔해서 친구들은 모바일, 어르신들은 태블릿으로도 불편함 없이 확인하셨어요.",
    meta: "2025.08 예식 · 인천",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const activeReview = reviewItems[activeReviewIndex];
  const reviewProgress = useMemo(
    () => ((activeReviewIndex + 1) / reviewItems.length) * 100,
    [activeReviewIndex],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveReviewIndex((previous) => (previous + 1) % reviewItems.length);
    }, 5200);

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
    <div className="selection:bg-[#F9EBE6]" style={{ fontFamily: 'Pretendard, "Noto Sans KR", sans-serif' }}>
      <LandingTopHeader />

      <main className="bg-white text-theme-primary">
        <section id="hero" className="landing-section overflow-hidden pb-24 pt-16 md:pb-32 md:pt-24">
          <div className="landing-shell relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="space-y-7">
              <div className="inline-flex items-center rounded-full border border-warm bg-white px-4 py-2 text-xs font-semibold text-theme-secondary">
                프리미엄 모바일 청첩장 스튜디오
              </div>
              <div className="space-y-5">
                <p className="serif-font text-lg tracking-[0.18em] text-theme-accent italic">The Most Beautiful Beginning</p>
                <h1 className="text-4xl leading-[1.2] text-theme-brand md:text-6xl">
                  감성은 살리고,
                  <br />
                  제작은 더 빠르게.
                </h1>
                <p className="max-w-xl text-base leading-7 text-theme-secondary md:text-lg">
                  기존 바우리 스타일은 유지하면서, 웨딩 브랜드 특유의 정돈된 정보 구조와 프리미엄 감성을 결합했습니다.
                  하객이 필요한 정보를 한 번에 찾고 바로 행동할 수 있는 랜딩 UX를 제공합니다.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button className="btn-cta-primary" type="button" onClick={goToEditorWithGuard}>
                  무료로 청첩장 시작하기
                </button>
                <button className="btn-cta-secondary" type="button" onClick={goToEditorWithGuard}>
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
                <div className="relative h-[560px] overflow-hidden rounded-3xl bg-[#1f1f1f]">
                  <img
                    className="h-full w-full object-cover opacity-85"
                    src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200"
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

        <section id="services" className="landing-section border-y border-warm bg-[#fdfbf9] py-16 md:py-24">
          <div className="landing-shell">
            <div className="mb-10 md:mb-14">
              <p className="text-sm font-semibold tracking-[0.14em] text-theme-accent">SERVICE FEATURES</p>
              <h2 className="mt-3 text-3xl text-theme-brand md:text-5xl">핵심 서비스 특징</h2>
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
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-theme-accent">TEMPLATE GALLERY</p>
                <h2 className="mt-3 text-3xl text-theme-brand md:text-5xl">템플릿 갤러리</h2>
              </div>
              <button className="btn-cta-secondary" type="button" onClick={goToEditorWithGuard}>
                전체 템플릿 보기
              </button>
            </div>

            <div className="hide-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {templateItems.map((template) => (
                <article key={template.id} className="wedding-template-card min-w-[250px] md:min-w-0">
                  <div className="h-72 overflow-hidden rounded-2xl md:h-80">
                    <img className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" src={template.imageUrl} alt={template.title} />
                  </div>
                  <div className="mt-5 space-y-2">
                    <h3 className="text-lg font-semibold text-theme-brand">{template.title}</h3>
                    <p className="text-sm leading-6 text-theme-secondary">{template.concept}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="landing-section bg-[#fdfaf7] py-16 md:py-24">
          <div className="landing-shell">
            <div className="mb-9 md:mb-12">
              <p className="text-sm font-semibold tracking-[0.14em] text-theme-accent">CUSTOMER REVIEW</p>
              <h2 className="mt-3 text-3xl text-theme-brand md:text-5xl">고객 후기</h2>
              <p className="mt-4 max-w-2xl text-theme-secondary">실제 사용자 피드백을 카드 슬라이더 형태로 노출해 신뢰도를 확보합니다.</p>
            </div>

            <div className="wedding-surface overflow-hidden p-6 md:p-8">
              <div className="min-h-[170px] transition-opacity duration-400">
                <p className="text-lg leading-8 text-theme-primary md:text-2xl md:leading-10">“{activeReview.quote}”</p>
                <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-theme-brand">{activeReview.couple}</span>
                  <span className="text-theme-secondary">{activeReview.meta}</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ece2dc]">
                  <div className="h-full rounded-full bg-theme-brand transition-all duration-500" style={{ width: `${reviewProgress}%` }} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="review-control-button"
                    type="button"
                    onClick={() =>
                      setActiveReviewIndex((previous) => (previous - 1 + reviewItems.length) % reviewItems.length)
                    }
                    aria-label="이전 후기"
                  >
                    ←
                  </button>
                  <button
                    className="review-control-button"
                    type="button"
                    onClick={() => setActiveReviewIndex((previous) => (previous + 1) % reviewItems.length)}
                    aria-label="다음 후기"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {reviewItems.map((review, index) => (
                <button
                  key={review.id}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    index === activeReviewIndex ? "bg-theme-brand text-white" : "border border-warm bg-white text-theme-secondary hover:text-theme-brand"
                  }`}
                  type="button"
                  onClick={() => setActiveReviewIndex(index)}
                >
                  {review.couple}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section border-t border-warm bg-white py-16 text-center md:py-20">
          <div className="landing-shell">
            <h2 className="text-3xl text-theme-brand md:text-5xl">지금, 우리만의 청첩장을 시작하세요</h2>
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

        <footer className="border-t border-warm bg-[#fcf9f6] py-12">
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
              <div className="space-y-2">
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
                <p>support@wedding-letter.kr</p>
                <p>© 2026 바우리. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
