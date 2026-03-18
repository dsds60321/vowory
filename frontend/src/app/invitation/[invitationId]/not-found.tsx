import Link from "next/link";

const DEFAULT_SITE_URL = "http://localhost:9000";

export default function InvitationNotFoundPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

  return (
    <main className="min-h-screen bg-theme px-6 py-14">
      <div className="mx-auto w-full max-w-[560px] rounded-3xl border border-warm bg-white p-8 shadow-sm">
        <p className="serif-font text-xs tracking-[0.35em] text-theme-accent uppercase">404</p>
        <h1 className="mt-3 serif-kr text-3xl font-semibold text-theme-brand">페이지를 찾을 수 없습니다.</h1>

        <div className="mt-6 rounded-xl border border-warm bg-[#fdfcfb] p-5 text-sm leading-7 text-theme-secondary">
          <p>아래 사유 중 하나로 요청하신 청첩장을 불러오지 못했습니다.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>URL이 정확하지 않습니다.</li>
            <li>발행되지 않은 청첩장입니다.</li>
            <li>데이터를 찾을 수 없습니다.</li>
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-warm p-4 text-sm text-theme-secondary">
          <p className="font-bold text-theme-brand">기본 랜딩 홈페이지</p>
          <a className="mt-2 block break-all underline underline-offset-2" href={siteUrl}>
            {siteUrl}
          </a>
          <div className="mt-4">
            <Link className="inline-flex rounded-full border border-warm px-4 py-2 text-xs font-bold text-theme-brand hover:bg-theme" href="/">
              홈으로 이동
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-theme-secondary opacity-70">© {new Date().getFullYear()} 바우리. All rights reserved.</p>
    </main>
  );
}
