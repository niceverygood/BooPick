import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { getCurrentProfile } from "@/lib/tier-check";
import type { BillingCycle } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "부픽 Pro 결제",
  description: "부픽 Pro 구독 결제 페이지 (월간 / 연간 / 단건)",
};

interface Props {
  searchParams: { cycle?: string };
}

export default async function CheckoutPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  // 미로그인은 로그인 후 자동 복귀
  if (!profile) redirect("/login?next=/checkout");

  // URL ?cycle= 으로 기본값 결정. 정기 우선.
  const raw = searchParams.cycle;
  const initialCycle: BillingCycle =
    raw === "monthly" || raw === "yearly" || raw === "onetime" ? raw : "yearly";

  return (
    <main className="px-5 py-10 sm:py-14 max-w-6xl mx-auto">
      <div className="mb-7">
        <p className="text-xs font-semibold text-boopick-orange tracking-wider uppercase">
          CHECKOUT
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-boopick-navy">
          부픽 Pro 결제
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          공인중개사 매물 데이터 분석 SaaS · 정기 구독 (월간 / 연간) 또는 단건
          결제
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
        initialCycle={initialCycle}
      />
    </main>
  );
}
