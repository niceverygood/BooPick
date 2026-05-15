import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIER_LIMITS } from "@/lib/tier-check";

interface Plan {
  id: "basic" | "pro";
  name: string;
  price: string;
  suffix: string;
  hint?: string;
  bullets: { ok: boolean; text: string }[];
  cta: string;
  href: string;
  recommended?: boolean;
}

const BASIC_LIMIT = TIER_LIMITS.basic.monthly_reports;
const PRO_LIMIT = TIER_LIMITS.pro.monthly_reports;

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "베이직",
    price: "0",
    suffix: "원/월",
    hint: "카드 등록 불필요",
    bullets: [
      { ok: true, text: "매물 데이터셋 업로드 (xlsx)" },
      { ok: true, text: "자연어 의뢰 → AI 정형 파싱" },
      { ok: true, text: "매물 검색 + 적합도 점수" },
      { ok: true, text: `월 ${BASIC_LIMIT}건 PDF 리포트` },
      { ok: true, text: "일반 사무실 가중치 분석" },
      { ok: false, text: "산업 관점 분석 (결혼정보회사 등)" },
      { ok: false, text: "QR 코드 + 네이버부동산 링크" },
    ],
    cta: "무료 시작",
    href: "/signup",
  },
  {
    id: "pro",
    name: "Pro",
    price: "49,000",
    suffix: "원/월 (VAT 포함)",
    hint: "월 정기 결제 · 언제든 해지 가능",
    bullets: [
      { ok: true, text: "베이직 모든 기능" },
      { ok: true, text: `월 ${PRO_LIMIT}건 PDF 리포트` },
      { ok: true, text: "결혼정보회사 산업 관점 분석" },
      { ok: true, text: "매물별 4가지 강·약점 자동 분석" },
      { ok: true, text: "QR 코드 (모바일 즉시 매물 확인)" },
      { ok: true, text: "네이버부동산 클릭 가능 링크" },
      { ok: true, text: "추가 산업 (음식점·병원·학원 등) 우선 액세스" },
      { ok: true, text: "세금계산서 발행" },
    ],
    cta: "Pro 구독하기",
    href: "/checkout",
    recommended: true,
  },
];

export default function PricingPage() {
  return (
    <main className="px-5 py-12 sm:py-20 max-w-5xl mx-auto">
      <div className="text-center">
        <p className="text-xs font-semibold text-boopick-orange tracking-wider uppercase">
          PRICING
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-boopick-navy">
          부픽 가격 안내
        </h1>
        <p className="mt-3 text-slate-600">
          무료로 시작하고, 필요할 때 Pro 베타 신청.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <Card
            key={p.id}
            className={
              p.recommended
                ? "ring-2 ring-boopick-orange shadow-lg relative"
                : ""
            }
          >
            {p.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
                  추천
                </Badge>
              </div>
            )}
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-boopick-navy">{p.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-boopick-navy">
                  {p.price}
                </span>
                <span className="text-sm text-slate-500">{p.suffix}</span>
              </div>
              {p.hint && (
                <p className="mt-1.5 text-xs text-slate-500">{p.hint}</p>
              )}

              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {b.ok ? (
                      <span className="text-boopick-green mt-0.5 shrink-0">✓</span>
                    ) : (
                      <span className="text-slate-300 mt-0.5 shrink-0">✕</span>
                    )}
                    <span className={b.ok ? "" : "text-slate-400"}>
                      {b.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "w-full mt-7 h-11 " +
                  (p.recommended
                    ? "bg-boopick-orange hover:bg-boopick-orange/90 text-white"
                    : "bg-boopick-navy hover:bg-boopick-navy/90 text-white")
                }
              >
                <Link href={p.href}>{p.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 max-w-2xl mx-auto space-y-4 text-sm">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="font-semibold text-boopick-navy mb-2">구독 안내</p>
          <ul className="space-y-1.5 text-slate-600 text-xs leading-relaxed">
            <li>· Pro 는 월 자동 정기결제이며, 결제일 24시간 전까지 해지하면 다음 달부터 과금되지 않습니다.</li>
            <li>· 결제 7일 내 미사용 시 100% 환불 가능합니다. 자세한 내용은 <Link href="/refund" className="text-boopick-orange underline">환불 정책</Link> 참고.</li>
            <li>· 결제 수단: 카카오페이, 신용/체크카드, 가상계좌. 세금계산서 발행 가능.</li>
            <li>· 분석 결과는 참고용 정보이며, 의사결정 책임은 사용자에게 있습니다 (<Link href="/terms" className="text-boopick-orange underline">이용약관</Link>).</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
