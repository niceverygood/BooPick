import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Report {
  id: string;
  query_raw: string;
  industry: string | null;
  pdf_url: string | null;
  tier_used: string;
  created_at: string;
}

async function fetchReports(): Promise<Report[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("reports")
      .select("id, query_raw, industry, pdf_url, tier_used, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return (data as Report[]) ?? [];
  } catch {
    return [];
  }
}

export default async function ReportsPage() {
  const reports = await fetchReports();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          내 리포트
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          생성한 분석 리포트 — {reports.length}건
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            <p>아직 만든 리포트가 없습니다.</p>
            <Link
              href="/dashboard/search"
              className="inline-block mt-3 text-boopick-orange font-semibold hover:underline"
            >
              + 첫 리포트 만들기
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link key={r.id} href={`/dashboard/reports/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {r.industry && (
                        <Badge variant="outline" className="text-xs">
                          {r.industry}
                        </Badge>
                      )}
                      <Badge
                        className={
                          r.tier_used === "pro"
                            ? "bg-boopick-orange text-white border-none hover:bg-boopick-orange text-xs"
                            : "bg-slate-200 text-slate-700 border-none hover:bg-slate-200 text-xs"
                        }
                      >
                        {r.tier_used.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-boopick-navy line-clamp-2">
                      {r.query_raw}
                    </p>
                  </div>
                  {r.pdf_url && (
                    <span className="text-xs text-boopick-green font-semibold shrink-0">
                      PDF ✓
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
