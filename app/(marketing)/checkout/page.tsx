import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentProfile } from "@/lib/tier-check";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "부픽 Pro 구독 결제",
  description: "부픽 Pro (월 49,000원) 구독 결제 페이지",
};

export default async function CheckoutPage() {
  const profile = await getCurrentProfile();
  // 미로그인은 로그인 후 자동 복귀
  if (!profile) redirect("/login?next=/checkout");

  return (
    <main className="px-5 py-10 sm:py-14 max-w-6xl mx-auto">
      <div className="mb-7">
        <p className="text-xs font-semibold text-boopick-orange tracking-wider uppercase">
          CHECKOUT
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-boopick-navy">
          부픽 Pro 구독 결제
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          공인중개사 매물 데이터 분석 SaaS 도구 · 월 정기 결제 · 언제든 해지
          가능
        </p>
        <p className="mt-2 text-xs text-slate-500">
          이미 Pro 사용 중이라면{" "}
          <Link href="/dashboard" className="text-boopick-orange underline">
            대시보드
          </Link>
          로 이동.
        </p>
      </div>

      <CheckoutForm
        defaultEmail={profile.email}
        defaultName={profile.name}
      />
    </main>
  );
}
