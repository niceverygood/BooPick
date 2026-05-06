import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

export const dynamic = "force-dynamic";

interface Aggregate {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalClicks: number;
  totalInquiries: number;
  contractedInquiries: number;
  conversionRate: number; // inquiries / clicks
}

async function fetchAggregate(agencyId: string): Promise<Aggregate> {
  const admin = createAdminClient();
  const [{ data: listings }, contractedRes, totalInqRes] = await Promise.all([
    admin
      .from("listings")
      .select(
        "id, status, tenant_views, tenant_clicks, tenant_inquiries_count"
      )
      .eq("agency_id", agencyId),
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "contracted"),
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
  ]);

  const ls = listings ?? [];
  const totalViews = ls.reduce(
    (a, l) => a + (((l as { tenant_views?: number }).tenant_views ?? 0) as number),
    0
  );
  const totalClicks = ls.reduce(
    (a, l) =>
      a + (((l as { tenant_clicks?: number }).tenant_clicks ?? 0) as number),
    0
  );

  const totalInquiries = totalInqRes.count ?? 0;

  return {
    totalListings: ls.length,
    activeListings: ls.filter((l) => l.status === "active").length,
    totalViews,
    totalClicks,
    totalInquiries,
    contractedInquiries: contractedRes.count ?? 0,
    conversionRate: totalClicks > 0 ? totalInquiries / totalClicks : 0,
  };
}

export default async function AnalyticsPage() {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId)
    return <p className="text-sm text-slate-500">agency 정보가 없습니다.</p>;

  const agg = await fetchAggregate(agencyId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          매물 통계
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          누적 노출 / 클릭 / 컨택 / 거래 완료
        </p>
      </div>

      {/* 깔때기 */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            임차인 깔때기
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <FunnelTile label="노출" value={agg.totalViews} primary />
            <FunnelTile label="클릭" value={agg.totalClicks} />
            <FunnelTile label="컨택" value={agg.totalInquiries} />
            <FunnelTile label="거래 완료" value={agg.contractedInquiries} />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            클릭 → 컨택 전환율:{" "}
            <strong className="text-boopick-navy">
              {(agg.conversionRate * 100).toFixed(1)}%
            </strong>
          </p>
        </CardContent>
      </Card>

      {/* 매물 현황 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            매물 현황
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">활성 매물</p>
              <p className="text-2xl font-bold text-boopick-navy mt-1">
                {agg.activeListings}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">전체 매물 (보관 포함)</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">
                {agg.totalListings}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-100 border-slate-200">
        <CardContent className="p-5 text-center">
          <p className="text-xs text-slate-500">
            상세 분석 (시간대별 / 매물별 / 동별 ROI)은 Phase 2 추가 예정
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelTile({
  label,
  value,
  primary,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg p-4 " +
        (primary
          ? "bg-boopick-navy text-white"
          : "bg-slate-50 border border-slate-200")
      }
    >
      <p
        className={
          "text-[11px] uppercase tracking-wider " +
          (primary ? "text-white/70" : "text-slate-500")
        }
      >
        {label}
      </p>
      <p
        className={
          "text-2xl font-bold mt-1 " +
          (primary ? "text-white" : "text-boopick-navy")
        }
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
