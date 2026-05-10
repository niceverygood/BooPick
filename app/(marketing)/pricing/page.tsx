import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    id: "basic",
    name: "베이직",
    price: "0",
    suffix: "원/월",
    bullets: [
      "월 3건 무료 리포트",
      "데이터셋 1개",
      "업종 4종 (결혼식장·카페·학원·사무실)",
      "PDF 다운로드",
    ],
    cta: "무료 시작",
    href: "/signup",
  },
  {
    id: "pro",
    name: "Pro",
    price: "49,000",
    suffix: "원/월",
    badge: "추천",
    bullets: [
      "리포트 무제한",
      "데이터셋 무제한",
      "업종 20종+",
      "PDF 워터마크 제거",
      "QR 코드 (모바일 즉시 공유)",
      "리포트 이력 무제한",
    ],
    cta: "Pro로 시작",
    href: "/signup?tier=pro",
    recommended: true,
  },
];

export default function PricingPage() {
  return (
    <main className="px-5 py-12 sm:py-20 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-boopick-navy">
          가격
        </h1>
        <p className="mt-3 text-slate-600">
          무료로 시작하고, 필요할 때 Pro로.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {PLANS.map((p) => (
          <Card
            key={p.id}
            className={p.recommended ? "ring-2 ring-boopick-orange shadow-lg relative" : ""}
          >
            {p.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
                  {p.badge}
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
              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="text-boopick-green mt-0.5">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={
                  "w-full mt-6 " +
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

      <p className="mt-8 text-center text-xs text-slate-500">
        결제는 베타 종료 후 시작 — 베타 기간엔 모든 기능 무료.
      </p>
    </main>
  );
}
