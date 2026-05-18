import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "결제 완료 — 부픽",
};

interface Props {
  searchParams: { type?: string; aid?: string };
}

export default function CheckoutSuccessPage({ searchParams }: Props) {
  const isSubscription = searchParams.type === "subscription";
  const aid = searchParams.aid ?? "";

  return (
    <main className="px-5 py-16 max-w-2xl mx-auto">
      <Card className="border-emerald-200">
        <CardContent className="p-8 sm:p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-boopick-navy">
            결제가 완료되었습니다
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {isSubscription
              ? "Pro 구독이 활성화되었습니다. 매월 같은 날짜에 자동 결제됩니다."
              : "결제가 정상 처리되었습니다."}
          </p>

          <div className="mt-6 p-4 rounded-md bg-slate-50 text-left text-xs text-slate-600 space-y-1.5">
            <p>
              <strong className="text-boopick-navy">결제 유형:</strong>{" "}
              {isSubscription ? "월 정기 결제 (Pro 구독)" : "단건 결제"}
            </p>
            {aid && (
              <p>
                <strong className="text-boopick-navy">승인 번호:</strong>{" "}
                <span className="font-mono">{aid}</span>
              </p>
            )}
            <p>
              <strong className="text-boopick-navy">환불:</strong> 결제 7일 내
              미사용 시 100% 환불 가능
            </p>
            {isSubscription && (
              <p>
                <strong className="text-boopick-navy">자동 갱신 해지:</strong>{" "}
                대시보드 &gt; 구독 관리에서 언제든 가능
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              asChild
              className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              <Link href="/dashboard">대시보드로 이동</Link>
            </Button>
            {isSubscription && (
              <Button asChild variant="outline">
                <Link href="/dashboard/billing">구독 관리</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
