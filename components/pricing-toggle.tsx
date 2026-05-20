"use client";

// 가격 페이지 월/연 토글 + Pro 카드 — client component
//
// Basic 카드는 정적이라 서버에서 렌더. Pro 만 토글에 따라 가격 표시 변경.

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRICING,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_SAVINGS_WON,
} from "@/lib/pricing";

interface Props {
  proLimit: number;
}

export function PricingToggle({ proLimit }: Props) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const pro = PRICING[cycle];
  const annualEquivalent =
    cycle === "yearly"
      ? `월 ${pro.perMonth.toLocaleString()}원 환산`
      : `연 ${(pro.amount * 12).toLocaleString()}원`;

  return (
    <>
      {/* 월/연 토글 */}
      <div className="mt-10 flex items-center justify-center">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-5 sm:px-6 py-2 rounded-full text-sm font-semibold transition ${
              cycle === "monthly"
                ? "bg-boopick-navy text-white shadow"
                : "text-slate-500 hover:text-boopick-navy"
            }`}
          >
            월간 결제
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`px-5 sm:px-6 py-2 rounded-full text-sm font-semibold transition relative ${
              cycle === "yearly"
                ? "bg-boopick-navy text-white shadow"
                : "text-slate-500 hover:text-boopick-navy"
            }`}
          >
            연간 결제
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                cycle === "yearly"
                  ? "bg-boopick-orange text-white"
                  : "bg-amber-100 text-boopick-orange"
              }`}
            >
              −{YEARLY_DISCOUNT_PERCENT}%
            </span>
          </button>
        </div>
      </div>

      {/* Pro 카드 — 토글에 따라 가격 갱신 */}
      <Card className="mt-6 ring-2 ring-boopick-orange shadow-lg relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
            {cycle === "yearly" ? "BEST VALUE" : "추천"}
          </Badge>
        </div>
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-boopick-navy">Pro</h2>

          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-boopick-navy tabular-nums">
              {pro.amount.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500">
              원/{cycle === "yearly" ? "년" : "월"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {annualEquivalent} · VAT 포함
          </p>

          {cycle === "yearly" && (
            <div className="mt-3 p-2 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
              💰 월간 대비{" "}
              <strong>{YEARLY_SAVINGS_WON.toLocaleString()}원</strong> 절약 (약
              2.4개월 무료)
            </div>
          )}

          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            <BulletOk>베이직 모든 기능</BulletOk>
            <BulletOk>월 {proLimit}건 PDF 리포트</BulletOk>
            <BulletOk>데이터셋 무제한 + 영구 보관</BulletOk>
            <BulletOk>결혼정보회사 산업 관점 분석</BulletOk>
            <BulletOk>매물별 4가지 강·약점 자동 분석</BulletOk>
            <BulletOk>QR 코드 (모바일 즉시 매물 확인)</BulletOk>
            <BulletOk>네이버부동산 클릭 가능 링크</BulletOk>
            <BulletOk>추가 산업 (음식점·병원·학원 등) 우선 액세스</BulletOk>
            <BulletOk>세금계산서 발행</BulletOk>
            <BulletOk>워터마크 제거</BulletOk>
          </ul>

          <Button
            asChild
            className="w-full mt-7 h-11 bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            <Link href={`/checkout?cycle=${cycle}`}>
              {cycle === "yearly" ? "연간 구독 시작" : "월간 구독 시작"}
            </Link>
          </Button>
          <p className="mt-3 text-[11px] text-center text-slate-500">
            결제 7일 내 미사용 시 100% 환불 · 언제든 해지
          </p>
        </CardContent>
      </Card>
    </>
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
