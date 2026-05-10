import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

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

interface Profile {
  tier: string;
  reports_used_month: number;
}

async function fetchData(): Promise<{
  profile: Profile | null;
  datasets: Dataset[];
  reports: Report[];
}> {
  try {
    const supabase = createClient();
    const [{ data: profile }, { data: datasets }, { data: reports }] =
      await Promise.all([
        supabase.from("profiles").select("tier, reports_used_month").maybeSingle(),
        supabase
          .from("datasets")
          .select("id, name, row_count, uploaded_at, original_filename")
          .order("uploaded_at", { ascending: false })
          .limit(20),
        supabase
          .from("reports")
          .select("id, query_raw, industry, created_at, pdf_url")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
    return {
      profile: (profile as Profile | null) ?? null,
      datasets: (datasets as Dataset[] | null) ?? [],
      reports: (reports as Report[] | null) ?? [],
    };
  } catch {
    return { profile: null, datasets: [], reports: [] };
  }
}

export default async function DashboardHome() {
  const { profile, datasets, reports } = await fetchData();

  const isPro = profile?.tier === "pro";
  const monthlyLimit = isPro ? "무제한" : "월 3건";
  const used = profile?.reports_used_month ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
            대시보드
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            매물 데이터셋을 업로드하고 분석 리포트를 만들어보세요.
          </p>
        </div>
        <Badge
          className={
            isPro
              ? "bg-boopick-orange text-white border-none hover:bg-boopick-orange"
              : "bg-slate-200 text-slate-700 border-none hover:bg-slate-200"
          }
        >
          {isPro ? "PRO" : "BASIC"} · 이번 달 {used}건 / {monthlyLimit}
        </Badge>
      </div>

      {/* 빠른 액션 */}
      <Card className="bg-gradient-to-br from-boopick-navy to-slate-700 text-white border-none shadow-lg">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">새 매물 업로드</h2>
            <p className="text-sm text-white/80 mt-1">
              엑셀 한 장만 올리면 AI가 자동 정리합니다.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            <Link href="/dashboard/upload">+ 업로드</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 내 데이터셋 */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-boopick-navy">
                내 데이터셋
              </h2>
              <Link
                href="/dashboard/upload"
                className="text-xs text-boopick-orange hover:underline"
              >
                + 업로드
              </Link>
            </div>
            {datasets.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                업로드된 데이터셋이 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {datasets.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-boopick-navy line-clamp-1">
                        {d.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.row_count.toLocaleString()}건 ·{" "}
                        {new Date(d.uploaded_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/search?dataset=${d.id}`}
                      className="text-xs text-boopick-orange hover:underline shrink-0"
                    >
                      분석 →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 최근 리포트 */}
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-boopick-navy">
                최근 리포트
              </h2>
              <Link
                href="/dashboard/reports"
                className="text-xs text-boopick-orange hover:underline"
              >
                전체 보기
              </Link>
            </div>
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                아직 만든 리포트가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/dashboard/reports/${r.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-boopick-navy line-clamp-1">
                          {r.query_raw}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.industry ?? "—"} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      {r.pdf_url && (
                        <span className="text-xs text-boopick-green shrink-0">
                          PDF ✓
                        </span>
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
