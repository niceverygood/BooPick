import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "결제 실패 — 부픽",
};

interface Props {
  searchParams: { reason?: string };
}

export default function CheckoutFailPage({ searchParams }: Props) {
  const reason = searchParams.reason;

  return (
    <main className="px-5 py-16 max-w-2xl mx-auto">
      <Card className="border-red-200">
        <CardContent className="p-8 sm:p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-3xl text-red-500">
            !
          </div>
          <h1 className="mt-4 text-2xl font-bold text-boopick-navy">
            결제에 실패했습니다
          </h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            결제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>

          {reason && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-left text-xs text-red-700">
              <strong>실패 사유:</strong> {reason}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              asChild
              className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              <Link href="/checkout">다시 결제하기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">가격 보기</Link>
            </Button>
          </div>

          <p className="mt-6 text-[11px] text-slate-400">
            계속 실패하면 카드사·잔액·한도를 확인하시거나 다른 결제 수단을
            이용해주세요.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
