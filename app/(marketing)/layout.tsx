import Link from "next/link";
import Image from "next/image";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-boopick-cream">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy">부픽</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-boopick-navy font-medium"
            >
              가격
            </Link>
            <Link
              href="/login"
              className="text-slate-600 hover:text-boopick-navy font-medium"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-md bg-boopick-navy hover:bg-boopick-navy/90 text-white font-semibold text-sm"
            >
              무료 시작
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-boopick-navy">
              Bottle Inc. (주식회사 바틀)
            </p>
            <p className="mt-0.5">판교 테크노밸리 · 대표 한승수</p>
          </div>
          <p className="text-boopick-orange font-semibold">
            🏠 부픽 — 매물 데이터 분석 SaaS
          </p>
        </div>
      </footer>
    </div>
  );
}
