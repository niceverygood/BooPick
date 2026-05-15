import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "결제 요청 완료 — 부픽",
};

export default function CheckoutCompletePage() {
  return (
    <main className="px-5 py-16 max-w-2xl mx-auto">
      <Card className="border-emerald-200">
        <CardContent className="p-8 sm:p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-boopick-navy">
            결제 요청이 접수되었습니다
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            영업일 기준 24시간 내 안내드립니다.
            <br />
            결제 후 즉시 Pro 기능이 활성화됩니다.
          </p>

          <div className="mt-6 p-4 rounded-md bg-slate-50 text-left text-xs text-slate-600 space-y-1.5">
            <p>
              <strong className="text-boopick-navy">상품:</strong> 부픽 Pro
              구독 (월 49,000원)
            </p>
            <p>
              <strong className="text-boopick-navy">결제 주기:</strong> 월 정기
              · 언제든 해지 가능
            </p>
            <p>
              <strong className="text-boopick-navy">환불:</strong> 결제 7일
              내 미사용 시 100% 환불
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              asChild
              className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              <Link href="/dashboard">대시보드로 이동</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">홈으로</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
