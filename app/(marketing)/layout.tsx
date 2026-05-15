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
          <nav className="flex items-center gap-3 sm:gap-5 text-sm">
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-boopick-navy font-medium"
            >
              가격
            </Link>
            <Link
              href="/checkout"
              className="hidden sm:inline text-slate-600 hover:text-boopick-orange font-medium"
            >
              Pro 구독
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
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid gap-6 sm:grid-cols-3 text-xs text-slate-500">
          {/* 회사 정보 — 전자상거래법 표시 의무 */}
          <div className="space-y-1">
            <p className="font-semibold text-boopick-navy text-sm">
              주식회사 바틀 (Bottle Inc.)
            </p>
            <p>대표: 한승수</p>
            <p>사업자등록번호: 376-87-01076</p>
            <p>통신판매업 신고번호: 제2019-성남분당B-0177호</p>
            <p>
              주소: 경기도 성남시 분당구 판교로289번길 20, 판교테크노밸리
              스타트업캠퍼스 2동 8층 4호 (삼평동)
            </p>
          </div>

          {/* 정책 */}
          <div className="space-y-1.5">
            <p className="font-semibold text-boopick-navy text-sm">정책</p>
            <ul className="space-y-1">
              <li>
                <Link href="/terms" className="hover:text-boopick-navy">
                  서비스 이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-boopick-navy">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-boopick-navy">
                  환불 정책
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-boopick-navy">
                  가격 안내
                </Link>
              </li>
            </ul>
          </div>

          {/* 안내 */}
          <div className="space-y-1.5">
            <p className="font-semibold text-boopick-navy text-sm">
              부픽이란?
            </p>
            <p className="leading-relaxed">
              공인중개사 매물 데이터 분석 SaaS 도구. 매물 추천 · 중개 · 자문
              서비스가 아닙니다. 분석 결과의 의사결정 책임은 사용자에게
              있습니다.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 py-4 text-center text-[10px] text-slate-400">
          © 2026 Bottle Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
