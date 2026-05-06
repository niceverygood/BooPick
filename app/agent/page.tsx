import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgency } from "@/lib/agent/demo-agency";

export const dynamic = "force-dynamic";

interface DashboardStats {
  todayInquiries: number;
  pendingInquiries: number;
  totalInquiries: number;
  activeListings: number;
  views30d: number;
  clicks30d: number;
}

async function fetchStats(agencyId: string): Promise<DashboardStats> {
  const admin = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    todayInq,
    pendingInq,
    totalInq,
    activeListings,
    listingMetrics,
  ] = await Promise.all([
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .gte("created_at", today.toISOString()),
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "pending"),
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "active"),
    admin
      .from("listings")
      .select("tenant_views, tenant_clicks")
      .eq("agency_id", agencyId),
  ]);

  const views = (listingMetrics.data ?? []).reduce(
    (a, l) => a + ((l as { tenant_views?: number }).tenant_views ?? 0),
    0
  );
  const clicks = (listingMetrics.data ?? []).reduce(
    (a, l) => a + ((l as { tenant_clicks?: number }).tenant_clicks ?? 0),
    0
  );

  return {
    todayInquiries: todayInq.count ?? 0,
    pendingInquiries: pendingInq.count ?? 0,
    totalInquiries: totalInq.count ?? 0,
    activeListings: activeListings.count ?? 0,
    views30d: views,
    clicks30d: clicks,
  };
}

export default async function AgentDashboard() {
  const agency = await getCurrentAgency();
  if (!agency) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-boopick-navy mb-2">
          중개사 정보를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-slate-500">
          데모 agency가 DB에 없습니다. /api/admin/seed를 호출해 데모 매물을 시드해보세요.
        </p>
      </div>
    );
  }

  const stats = await fetchStats(agency.id);

  const isTrialActive =
    agency.trial_plan_id &&
    agency.trial_ends_at &&
    new Date(agency.trial_ends_at) > new Date();
  const planLabel = isTrialActive
    ? `${agency.trial_plan_id?.toUpperCase()} (트라이얼)`
    : (agency.plan_id ?? "BASIC").toUpperCase();
  const isPro =
    isTrialActive
      ? agency.trial_plan_id !== "basic"
      : agency.plan_id !== "basic";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
            안녕하세요, {agency.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            오늘 임차인 활동을 한눈에 확인하세요.
          </p>
        </div>
        <Badge
          className={
            isPro
              ? "bg-boopick-orange text-white border-none hover:bg-boopick-orange"
              : "bg-slate-200 text-slate-700 border-none hover:bg-slate-200"
          }
        >
          {planLabel} 플랜
        </Badge>
      </div>

      {/* 오늘 들어온 임차인 강조 */}
      <Card className="bg-gradient-to-br from-boopick-navy to-slate-700 border-none text-white shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <p className="text-xs uppercase tracking-wider text-white/60 mb-2">
            오늘 들어온 임차인
          </p>
          <div className="flex items-end gap-3">
            <div className="text-5xl sm:text-6xl font-bold">
              {stats.todayInquiries}
            </div>
            <div className="text-sm text-white/80 mb-2">명</div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/agent/leads"
              className="text-sm font-semibold text-boopick-orange hover:text-boopick-orange/80"
            >
              임차인 inbox 보기 →
            </Link>
            {stats.pendingInquiries > 0 && (
              <Badge className="bg-boopick-orange text-white border-none">
                미처리 {stats.pendingInquiries}건
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 매물 노출 OFF 상태면 큰 배너 */}
      {!isPro && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  베이직 플랜 — 임차인 풀 노출 OFF
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  현재 본인 매물이 임차인 검색 결과에 노출되지 않습니다.
                  Pro로 업그레이드하면 강남권 임차인 트래픽에 매물이 즉시 노출되고, 컨택이 카톡으로 분배됩니다.
                </p>
                <Link
                  href="/agent/billing"
                  className="inline-block mt-3 text-xs font-semibold text-white bg-boopick-orange hover:bg-boopick-orange/90 px-3 py-1.5 rounded-md"
                >
                  Pro 플랜 둘러보기 →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="활성 매물"
          value={stats.activeListings}
          href="/agent/listings"
        />
        <StatCard label="총 임차인 컨택" value={stats.totalInquiries} />
        <StatCard label="누적 노출" value={stats.views30d} />
        <StatCard label="누적 클릭" value={stats.clicks30d} />
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold text-boopick-navy mb-3">빠른 액션</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/agent/listings"
              emoji="🏠"
              label="매물 등록"
            />
            <QuickAction
              href="/agent/leads"
              emoji="💬"
              label="임차인 inbox"
            />
            <QuickAction
              href="/agent/auto-content"
              emoji="✍️"
              label="광고문구 자동 생성"
            />
            <QuickAction
              href="/agent/search"
              emoji="🔎"
              label="매물 자연어 검색"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <Card className={href ? "hover:shadow-md transition-shadow" : ""}>
      <CardContent className="p-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-3xl font-bold text-boopick-navy mt-2">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickAction({
  href,
  emoji,
  label,
}: {
  href: string;
  emoji: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-boopick-orange hover:bg-boopick-cream transition-colors"
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </Link>
  );
}
