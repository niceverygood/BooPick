import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "결제 취소 — 부픽",
};

export default function CheckoutCancelPage() {
  return (
    <main className="px-5 py-16 max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-8 sm:p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-3xl text-slate-400">
            ×
          </div>
          <h1 className="mt-4 text-2xl font-bold text-boopick-navy">
            결제가 취소되었습니다
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            결제 진행을 중단하셨습니다. 청구된 금액은 없습니다.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              asChild
              className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              <Link href="/checkout">다시 결제하기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">대시보드로</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
