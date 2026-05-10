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
    name: "Pro (베타)",
    price: "0",
    suffix: "원/월 · 베타",
    hint: "정식 출시 후 49,000원/월",
    bullets: [
      { ok: true, text: "베이직 모든 기능" },
      { ok: true, text: `월 ${PRO_LIMIT}건 PDF 리포트` },
      { ok: true, text: "결혼정보회사 산업 관점 분석" },
      { ok: true, text: "매물별 4가지 강·약점 자동 분석" },
      { ok: true, text: "QR 코드 (모바일 즉시 매물 확인)" },
      { ok: true, text: "네이버부동산 클릭 가능 링크" },
      { ok: true, text: "V2 추가 산업 (음식점·병원·학원 등) 우선 액세스" },
    ],
    cta: "Pro 베타 신청",
    href: "/signup?tier=pro",
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

      <div className="mt-8 max-w-2xl mx-auto text-center space-y-2 text-xs text-slate-500">
        <p>
          베타 기간 동안 Pro 신청자는 한대표가 24시간 내 검토 후 수동 승격 안내드립니다.
        </p>
        <p>
          정식 출시 시점에 Pro 가격(49,000원/월)이 적용되며, 베타 사용자는 별도 안내드립니다.
        </p>
      </div>
    </main>
  );
}
