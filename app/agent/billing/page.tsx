import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgency } from "@/lib/agent/demo-agency";

export const dynamic = "force-dynamic";

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  features: Record<string, unknown>;
  display_order: number;
}

async function fetchPlans(): Promise<Plan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_plans")
    .select("id, name, monthly_price, features, display_order")
    .eq("active", true)
    .order("display_order");
  return (data ?? []) as Plan[];
}

const FEATURE_BULLETS: Record<string, string[]> = {
  basic: [
    "매물 무제한 등록·관리",
    "광고문구 자동 생성 일 5건",
    "본인 매물 검색만 가능",
    "❌ 임차인 풀 노출 OFF",
  ],
  pro: [
    "베이직 전체",
    "✨ 임차인 풀 노출 ON",
    "임차인 컨택 카톡 알림",
    "광고문구 무제한 (네이버/인스타/블로그/카톡)",
    "노출/클릭/컨택 분석",
  ],
  enterprise: [
    "프로 전체",
    "임차인 우선 분배",
    "빌딩별 공실 모니터링",
    "API 액세스",
    "전담 매니저",
  ],
  success_fee: [
    "임차인 풀 노출 ON",
    "구독료 0원",
    "성사 거래 수수료 7% 부픽 지급",
    "추적 가능한 매물만",
  ],
};

export default async function BillingPage() {
  const agency = await getCurrentAgency();
  const plans = await fetchPlans();

  if (!agency) {
    return <p className="text-sm text-slate-500">agency 정보가 없습니다.</p>;
  }

  const currentPlanId = agency.plan_id ?? "basic";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          구독 관리
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          현재 플랜 + 부픽이 제공하는 4가지 플랜.
        </p>
      </div>

      {/* 현재 플랜 */}
      <Card className="bg-boopick-navy text-white border-none shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <p className="text-xs uppercase text-white/60 tracking-wider">
            현재 플랜
          </p>
          <div className="mt-2 flex items-end gap-3 flex-wrap">
            <div className="text-3xl sm:text-4xl font-bold">
              {currentPlanId.toUpperCase()}
            </div>
            <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
              활성
            </Badge>
          </div>
          <p className="text-sm text-white/80 mt-3">
            플랜 시작:{" "}
            {agency.plan_started_at
              ? new Date(agency.plan_started_at).toLocaleDateString("ko-KR")
              : "—"}
          </p>
          <p className="text-xs text-white/60 mt-2">
            ⚠️ 결제 연동은 Phase 2 — 카카오페이 정기결제 / 토스페이먼츠 둘 중 하나 구현 예정
          </p>
        </CardContent>
      </Card>

      {/* 플랜 비교 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const isRecommended = p.id === "pro";
          return (
            <Card
              key={p.id}
              className={
                isCurrent
                  ? "ring-2 ring-boopick-navy"
                  : isRecommended
                    ? "shadow-lg ring-2 ring-boopick-orange relative"
                    : ""
              }
            >
              {isRecommended && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
                    추천
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-boopick-navy text-white border-none hover:bg-boopick-navy">
                    현재 플랜
                  </Badge>
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="font-bold text-lg text-boopick-navy">
                  {p.name}
                </h3>
                <p className="mt-2 text-2xl font-bold text-boopick-navy">
                  {p.monthly_price === 0
                    ? "무료"
                    : `${p.monthly_price.toLocaleString()}`}
                  {p.monthly_price > 0 && (
                    <span className="text-xs font-normal text-slate-500">
                      원/월
                    </span>
                  )}
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-600 min-h-[140px]">
                  {(FEATURE_BULLETS[p.id] ?? []).map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <span className="shrink-0">·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={isCurrent}
                  className={
                    isRecommended && !isCurrent
                      ? "w-full mt-4 bg-boopick-orange hover:bg-boopick-orange/90 text-white"
                      : "w-full mt-4"
                  }
                  variant={isRecommended && !isCurrent ? "default" : "outline"}
                >
                  {isCurrent ? "사용 중" : "변경하기"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-amber-900 mb-1">
            💡 결제 연동 안내
          </p>
          <p className="text-xs text-amber-800">
            현재는 플랜 비교 + DB 시드 단계입니다. 실제 결제(카카오페이 정기결제 / 토스페이먼츠)는 Phase 2에서 연결 예정. 베타 기간 중 플랜 변경은 운영팀에 직접 문의 부탁드립니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
