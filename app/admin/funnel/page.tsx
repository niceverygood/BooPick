import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FUNNEL_STEPS: Array<{
  event: string;
  label: string;
}> = [
  { event: "landing_view", label: "랜딩 방문" },
  { event: "search", label: "검색" },
  { event: "listing_view", label: "매물 조회" },
  { event: "inquiry_click", label: "문의 클릭" },
  { event: "inquiry_submit", label: "문의 제출" },
  { event: "agent_contacted", label: "중개사 연락" },
  { event: "meeting", label: "미팅" },
  { event: "contracted", label: "거래 성사" },
];

interface FunnelData {
  counts: Record<string, number>;
  channels: Array<{
    utm_source: string | null;
    utm_campaign: string | null;
    visitors: number;
    inquiries: number;
    contracted: number;
    spend: number;
  }>;
  device: { mobile: number; desktop: number; tablet: number };
}

async function fetchFunnel(days: number): Promise<FunnelData> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. event 카운트
  const counts: Record<string, number> = {};
  for (const step of FUNNEL_STEPS) {
    const { count } = await admin
      .from("funnel_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", step.event)
      .gte("created_at", since);
    counts[step.event] = count ?? 0;
  }

  // 2. 채널별 (UTM 기반)
  const { data: rawEvents } = await admin
    .from("funnel_events")
    .select("event_type, utm_source, utm_campaign, anon_token, tenant_id")
    .gte("created_at", since)
    .limit(50000);

  const channelMap = new Map<
    string,
    { source: string | null; campaign: string | null; visitors: Set<string>; inquiries: number; contracted: number }
  >();
  for (const e of rawEvents ?? []) {
    const key = `${e.utm_source ?? "(direct)"}|${e.utm_campaign ?? ""}`;
    if (!channelMap.has(key)) {
      channelMap.set(key, {
        source: e.utm_source ?? null,
        campaign: e.utm_campaign ?? null,
        visitors: new Set(),
        inquiries: 0,
        contracted: 0,
      });
    }
    const ch = channelMap.get(key)!;
    if (e.event_type === "landing_view" || e.event_type === "listing_view") {
      const visitorKey = (e.tenant_id as string) ?? (e.anon_token as string) ?? "";
      if (visitorKey) ch.visitors.add(visitorKey);
    }
    if (e.event_type === "inquiry_submit") ch.inquiries++;
    if (e.event_type === "contracted") ch.contracted++;
  }

  // 3. 광고비 매핑
  const { data: spends } = await admin
    .from("ad_spends")
    .select("channel, campaign, amount")
    .gte("date", since.slice(0, 10));
  const spendMap = new Map<string, number>();
  for (const s of spends ?? []) {
    const key = `${s.channel}|${s.campaign ?? ""}`;
    spendMap.set(key, (spendMap.get(key) ?? 0) + s.amount);
  }

  const channels = Array.from(channelMap.values())
    .map((ch) => ({
      utm_source: ch.source,
      utm_campaign: ch.campaign,
      visitors: ch.visitors.size,
      inquiries: ch.inquiries,
      contracted: ch.contracted,
      spend: spendMap.get(`${ch.source}|${ch.campaign ?? ""}`) ?? 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  // 4. 디바이스 분포
  const { data: deviceRows } = await admin
    .from("funnel_events")
    .select("device_type")
    .eq("event_type", "landing_view")
    .gte("created_at", since)
    .limit(50000);
  const device = { mobile: 0, desktop: 0, tablet: 0 };
  for (const r of deviceRows ?? []) {
    const d = (r as { device_type?: string }).device_type;
    if (d === "mobile") device.mobile++;
    else if (d === "tablet") device.tablet++;
    else device.desktop++;
  }

  return { counts, channels, device };
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const days = Math.max(
    1,
    Math.min(parseInt(searchParams.days ?? "7"), 90)
  );
  const data = await fetchFunnel(days);

  const top = Math.max(...Object.values(data.counts), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
            Funnel · CAC 대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            최근 {days}일 데이터
          </p>
        </div>
        <div className="flex gap-2">
          {[1, 7, 30, 90].map((d) => (
            <a
              key={d}
              href={`/admin/funnel?days=${d}`}
              className={
                "px-3 py-1.5 rounded-md text-sm font-semibold border " +
                (d === days
                  ? "bg-boopick-navy text-white border-boopick-navy"
                  : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
              }
            >
              {d === 1 ? "오늘" : `${d}일`}
            </a>
          ))}
        </div>
      </div>

      {/* Funnel 시각화 */}
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-2">
          {FUNNEL_STEPS.map((step, i) => {
            const cnt = data.counts[step.event] ?? 0;
            const pct = top > 0 ? (cnt / top) * 100 : 0;
            const prevCnt =
              i > 0 ? data.counts[FUNNEL_STEPS[i - 1].event] ?? 0 : null;
            const stepConv =
              prevCnt && prevCnt > 0
                ? `${((cnt / prevCnt) * 100).toFixed(1)}%`
                : null;
            return (
              <div key={step.event} className="flex items-center gap-3">
                <div className="w-28 sm:w-32 text-sm text-slate-700 shrink-0">
                  {step.label}
                </div>
                <div className="flex-1 relative h-6 bg-slate-100 rounded">
                  <div
                    className="h-full bg-boopick-orange rounded transition-all"
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-slate-700">
                    {cnt.toLocaleString()}
                  </div>
                </div>
                {stepConv && (
                  <div className="w-14 text-xs text-slate-500 text-right shrink-0">
                    {stepConv}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 채널별 CAC */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-boopick-navy mb-3">
            채널별 ROI
          </h2>
          {data.channels.length === 0 ? (
            <p className="text-sm text-slate-500">
              아직 채널 데이터가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                    <th className="text-left py-2 pr-3">채널</th>
                    <th className="text-left py-2 pr-3">캠페인</th>
                    <th className="text-right py-2 pr-3">방문자</th>
                    <th className="text-right py-2 pr-3">문의</th>
                    <th className="text-right py-2 pr-3">거래</th>
                    <th className="text-right py-2 pr-3">광고비</th>
                    <th className="text-right py-2">CAC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.slice(0, 20).map((ch, i) => {
                    const cac =
                      ch.visitors > 0 && ch.spend > 0
                        ? Math.round(ch.spend / ch.visitors)
                        : null;
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-none"
                      >
                        <td className="py-2 pr-3 font-semibold text-boopick-navy">
                          {ch.utm_source ?? "(direct)"}
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {ch.utm_campaign ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {ch.visitors.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {ch.inquiries}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {ch.contracted}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {ch.spend > 0
                            ? `${ch.spend.toLocaleString()}원`
                            : "—"}
                        </td>
                        <td className="py-2 text-right font-bold text-boopick-navy">
                          {cac != null ? `${cac.toLocaleString()}원` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 디바이스 분포 */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-base font-bold text-boopick-navy mb-3">
            디바이스 분포 (랜딩 기준)
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <DeviceTile label="모바일" value={data.device.mobile} primary />
            <DeviceTile label="데스크탑" value={data.device.desktop} />
            <DeviceTile label="태블릿" value={data.device.tablet} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceTile({
  label,
  value,
  primary,
}: {
  label: string;
  value: number;
  primary?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{label}</p>
        {primary && (
          <Badge className="bg-boopick-orange text-white border-none">
            메인
          </Badge>
        )}
      </div>
      <p className="text-2xl font-bold text-boopick-navy mt-1">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
