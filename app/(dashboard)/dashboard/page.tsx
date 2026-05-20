import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { DatasetRow } from "@/components/dataset-row";
import { ProUpgradeButton } from "@/components/pro-upgrade-button";
import {
  getCurrentProfile,
  TIER_LIMITS,
  daysUntilExpiry,
  type Profile,
} from "@/lib/tier-check";

export const dynamic = "force-dynamic";

interface Dataset {
  id: string;
  name: string;
  row_count: number;
  uploaded_at: string;
  original_filename: string | null;
}

interface Report {
  id: string;
  query_raw: string;
  industry: string | null;
  created_at: string;
  pdf_url: string | null;
}

async function fetchData(): Promise<{
  profile: Profile | null;
  datasets: Dataset[];
  reports: Report[];
  datasetTotal: number;
  reportTotal: number;
}> {
  try {
    const supabase = createClient();
    const [
      profile,
      { data: datasets },
      { data: reports },
      { count: datasetTotal },
      { count: reportTotal },
    ] = await Promise.all([
      getCurrentProfile(),
      supabase
        .from("datasets")
        .select("id, name, row_count, uploaded_at, original_filename")
        .order("uploaded_at", { ascending: false })
        .limit(20),
      supabase
        .from("reports")
        .select("id, query_raw, industry, created_at, pdf_url")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("datasets").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }),
    ]);
    return {
      profile,
      datasets: (datasets as Dataset[] | null) ?? [],
      reports: (reports as Report[] | null) ?? [],
      datasetTotal: datasetTotal ?? 0,
      reportTotal: reportTotal ?? 0,
    };
  } catch {
    return {
      profile: null,
      datasets: [],
      reports: [],
      datasetTotal: 0,
      reportTotal: 0,
    };
  }
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function DashboardHome() {
  const { profile, datasets, reports, datasetTotal, reportTotal } =
    await fetchData();

  const isPro = profile?.tier === "pro";
  const limit = profile ? TIER_LIMITS[profile.tier].monthly_reports : 5;
  const used = profile?.reports_used_month ?? 0;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const remaining = Math.max(0, limit - used);
  const reachedLimit = used >= limit;

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;
  const firstName = profile?.name?.split(/[\s/]/)[0] ?? "사장";

  return (
    <div className="space-y-7">
      {/* 인사말 + 새 분석 */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-slate-500 mb-1.5 num">{dateStr}</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-800">
            안녕하세요, {firstName}님{" "}
            <span className="font-medium text-slate-500">
              오늘도 꼼꼼하게 픽해볼까요?
            </span>
          </h1>
        </div>
        <Button asChild className="bp-btn bp-btn-primary bp-btn-lg px-5">
          <Link href="/dashboard/upload">+ 새 분석 시작</Link>
        </Button>
      </div>

      {/* KPI 행 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi
          label="이번 달 리포트"
          value={String(used)}
          suffix="건"
          sub={
            isPro ? (
              <Chip tone="orange">Pro 무제한</Chip>
            ) : (
              <span className="text-xs text-slate-500">{remaining}건 남음</span>
            )
          }
        />
        <Kpi label="누적 리포트" value={String(reportTotal)} suffix="건" />
        <Kpi label="데이터셋" value={String(datasetTotal)} suffix="개" />
        <Kpi
          label="플랜"
          value={isPro ? "PRO" : "BASIC"}
          valueClass={isPro ? "text-brand-orange-600" : "text-navy-800"}
          sub={
            !isPro ? (
              <span className="text-xs text-brand-orange-600 font-semibold">
                업그레이드 가능
              </span>
            ) : (
              <span className="text-xs text-slate-500">무제한 분석</span>
            )
          }
        />
      </div>

      {/* 사용량 */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  이번 달 리포트
                </p>
                <Chip tone={isPro ? "orange" : "neutral"}>
                  {isPro ? "PRO" : "BASIC"}
                </Chip>
              </div>
              <p className="num text-2xl sm:text-3xl font-extrabold text-navy-800">
                {used}{" "}
                <span className="text-base text-slate-400 font-bold">
                  / {limit}건
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {reachedLimit
                  ? "한도 도달 (다음 달 1일 자동 리셋)"
                  : `${remaining}건 남음`}
              </p>
              <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden max-w-md">
                <div
                  className={
                    "h-full transition-all " +
                    (pct >= 100
                      ? "bg-risk"
                      : pct >= 80
                      ? "bg-warn"
                      : "bg-brand-orange-500")
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {!isPro && <ProUpgradeButton />}
          </div>
        </CardContent>
      </Card>

      {/* 새 업로드 배너 (navy) */}
      <div className="rounded-2xl bg-navy-800 text-white p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">새 매물 업로드</h2>
          <p className="text-sm text-white/75 mt-1">
            엑셀 한 장만 올리면 AI가 자동 정리·분석합니다.
          </p>
        </div>
        <Button asChild className="bp-btn bp-btn-primary bp-btn-lg">
          <Link href="/dashboard/upload">+ 업로드</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 내 데이터셋 */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-navy-800">내 데이터셋</h2>
              <Link
                href="/dashboard/upload"
                className="text-xs text-brand-orange-600 hover:underline font-semibold"
              >
                + 업로드
              </Link>
            </div>
            {datasets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                업로드된 데이터셋이 없습니다.
              </p>
            ) : (
              <>
                <ul className="space-y-1">
                  {datasets.map((d) => (
                    <DatasetRow
                      key={d.id}
                      id={d.id}
                      name={d.name}
                      rowCount={d.row_count}
                      uploadedAt={d.uploaded_at}
                      daysUntilExpiry={
                        profile ? daysUntilExpiry(profile, d.uploaded_at) : null
                      }
                    />
                  ))}
                </ul>
                {!isPro &&
                  datasets.length >= TIER_LIMITS.basic.monthly_datasets && (
                    <div className="mt-4 p-3 bg-[var(--warn-bg)] border border-[var(--warn-bd)] rounded-md">
                      <p className="text-xs font-semibold text-[var(--warn-strong)]">
                        ⚠️ 베이직 데이터셋 한도 (
                        {TIER_LIMITS.basic.monthly_datasets}개) 도달
                      </p>
                      <p className="text-xs text-[var(--warn-strong)]/80 mt-1">
                        새 데이터셋을 올리려면 기존을 삭제하거나, Pro로
                        업그레이드하면 무제한 + 영구 보관됩니다.
                      </p>
                    </div>
                  )}
                {!isPro && datasets.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-3 text-center">
                    💡 베이직 데이터셋은 30일 후 자동 삭제 ·{" "}
                    <span className="text-brand-orange-600 font-semibold">
                      Pro로 영구 보관
                    </span>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 최근 리포트 — Signal 좌측 액센트 */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-navy-800">최근 리포트</h2>
              <Link
                href="/dashboard/reports"
                className="text-xs text-brand-orange-600 hover:underline font-semibold"
              >
                전체 보기 →
              </Link>
            </div>
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                아직 만든 리포트가 없습니다.
              </p>
            ) : (
              <ul className="space-y-1">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/reports/${r.id}`}
                      className="flex items-stretch gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50"
                    >
                      <span
                        className="w-1 rounded-full shrink-0"
                        style={{
                          background: r.pdf_url
                            ? "var(--safe)"
                            : "var(--slate-300)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy-800 line-clamp-1">
                          {r.query_raw}
                        </p>
                        <p className="text-xs text-slate-500 num mt-0.5">
                          {r.industry ?? "—"} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      {r.pdf_url ? (
                        <Chip tone="safe">PDF</Chip>
                      ) : (
                        <Chip tone="neutral">조건만</Chip>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  sub,
  valueClass = "text-navy-800",
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="bp-card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-baseline gap-1 mt-1.5">
        <span className={`num text-2xl font-extrabold ${valueClass}`}>
          {value}
        </span>
        {suffix && (
          <span className="num text-sm text-slate-400">{suffix}</span>
        )}
      </div>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  );
}
