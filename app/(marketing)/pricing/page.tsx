// 부픽 가격 페이지 (V3 정기구독 중심)
//
// Server component. 토글 + Pro 카드만 PricingToggle (client) 로 분리.

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TIER_LIMITS } from "@/lib/tier-check";
import { PRICING } from "@/lib/pricing";
import { PricingToggle } from "@/components/pricing-toggle";

const BASIC_LIMIT = TIER_LIMITS.basic.monthly_reports;
const PRO_LIMIT = TIER_LIMITS.pro.monthly_reports;

export const metadata = {
  title: "가격 — 부픽",
  description:
    "공인중개사 매물 분석 SaaS 부픽. 무료부터 Pro 연간(20% 할인)까지.",
};

export default function PricingPage() {
  return (
    <main className="px-5 py-12 sm:py-20 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center">
        <p className="text-xs font-semibold text-boopick-orange tracking-wider uppercase">
          PRICING
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-boopick-navy">
          무료로 시작하고, 필요할 때 Pro
        </h1>
        <p className="mt-3 text-slate-600">
          공인중개사 매물 데이터 분석 SaaS · 월 정기 구독 (연 결제 시 약 20% 절약)
        </p>
      </div>

      {/* 2-카드: Basic vs Pro */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 items-start">
        {/* Basic — 정적 */}
        <Card>
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-boopick-navy">베이직</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-boopick-navy">0</span>
              <span className="text-sm text-slate-500">원/월</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              카드 등록 불필요
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
              <BulletOk>매물 데이터셋 업로드 (xlsx)</BulletOk>
              <BulletOk>자연어 의뢰 → AI 정형 파싱</BulletOk>
              <BulletOk>매물 검색 + 적합도 점수</BulletOk>
              <BulletOk>월 {BASIC_LIMIT}건 PDF 리포트</BulletOk>
              <BulletOk>일반 사무실 가중치 분석</BulletOk>
              <BulletOff>산업 관점 분석 (결혼정보회사 등)</BulletOff>
              <BulletOff>QR 코드 + 네이버부동산 링크</BulletOff>
              <BulletOff>데이터셋 영구 보관 (베이직은 30일)</BulletOff>
            </ul>

            <Button
              asChild
              className="w-full mt-7 h-11 bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              <Link href="/signup">무료 시작</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pro — 토글로 가격 변경 (client) */}
        <PricingToggle proLimit={PRO_LIMIT} />
      </div>

      {/* 단건 결제 (보조) */}
      <div className="mt-12">
        <Card className="bg-slate-50 border-dashed border-slate-300">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  부가 옵션
                </span>
                <Badge className="bg-slate-200 text-slate-700 border-none text-[10px]">
                  자동 갱신 없음
                </Badge>
              </div>
              <h3 className="text-base font-bold text-boopick-navy">
                단건 결제 — 한 번만 써보고 싶을 때
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                정기구독 부담 없이 1회만 결제하고 Pro 기능을 사용해보고 싶다면.
                기본 {PRICING.onetime.amount.toLocaleString()}원부터 시작.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-slate-400 text-slate-700"
            >
              <Link href="/checkout?cycle=onetime">단건 결제로 이동 →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 구독 안내 */}
      <div className="mt-10 max-w-2xl mx-auto space-y-4 text-sm">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="font-semibold text-boopick-navy mb-2">구독 안내</p>
          <ul className="space-y-1.5 text-slate-600 text-xs leading-relaxed">
            <li>
              · Pro 는 카카오페이 정기결제로 자동 갱신됩니다 (월간: 매월 동일자,
              연간: 매년 동일자).
            </li>
            <li>
              · 결제일 24시간 전까지 대시보드에서 해지하면 다음 주기부터 청구되지
              않습니다.
            </li>
            <li>
              · 결제 7일 내 미사용 시 100% 환불. 자세한 내용은{" "}
              <Link href="/refund" className="text-boopick-orange underline">
                환불 정책
              </Link>
              .
            </li>
            <li>
              · 결제 수단: 카카오페이 (간편결제 / 카드 / 가상계좌). 세금계산서
              발행 가능.
            </li>
            <li>
              · 분석 결과는 참고용 정보이며, 의사결정 책임은 사용자에게
              있습니다 (
              <Link href="/terms" className="text-boopick-orange underline">
                이용약관
              </Link>
              ).
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function BulletOk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-boopick-green mt-0.5 shrink-0">✓</span>
      <span>{children}</span>
    </li>
  );
}

function BulletOff({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-slate-300 mt-0.5 shrink-0">✕</span>
      <span className="text-slate-400">{children}</span>
    </li>
  );
}
