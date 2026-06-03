import Link from "next/link";
import { Logo } from "@/components/brand";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { getCurrentProfile } from "@/lib/tier-check";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 상태 확인 — 로그인 사용자는 헤더에 사용자 메뉴 노출
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="border-b border-[rgba(10,37,64,0.08)] bg-cream-100/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="부픽 홈">
            <Logo size={22} />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link
              href="/pricing"
              className="px-2.5 py-1.5 text-slate-700 hover:text-navy-800 font-medium"
            >
              가격
            </Link>
            {profile ? (
              <>
                {/* 로그인 상태 — 대시보드 진입 + 사용자 메뉴 */}
                <Link
                  href="/dashboard"
                  className="bp-btn bp-btn-primary bp-btn-md"
                >
                  대시보드 →
                </Link>
                <HeaderUserMenu email={profile.email} name={profile.name} />
              </>
            ) : (
              <>
                {/* 비로그인 — 로그인 / 가입 */}
                <Link
                  href="/checkout"
                  className="hidden sm:inline px-2.5 py-1.5 text-slate-700 hover:text-brand-orange-600 font-medium"
                >
                  Pro 구독
                </Link>
                <Link
                  href="/login"
                  className="bp-btn bp-btn-ghost bp-btn-md hidden sm:inline-flex"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bp-btn bp-btn-secondary bp-btn-md"
                >
                  무료로 시작
                </Link>
              </>
            )}
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
