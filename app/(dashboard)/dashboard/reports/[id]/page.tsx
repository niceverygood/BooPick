import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Report {
  id: string;
  query_raw: string;
  query_parsed: Record<string, unknown>;
  industry: string | null;
  selected_listings: number[] | null;
  pdf_url: string | null;
  tier_used: string;
  dataset_id: string | null;
  created_at: string;
}

async function fetchReport(id: string): Promise<Report | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("reports")
      .select(
        "id, query_raw, query_parsed, industry, selected_listings, pdf_url, tier_used, dataset_id, created_at"
      )
      .eq("id", id)
      .maybeSingle();
    return (data as Report | null) ?? null;
  } catch {
    return null;
  }
}

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const report = await fetchReport(params.id);
  if (!report) notFound();

  const count = report.selected_listings?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard/reports"
        className="text-sm text-slate-500 hover:text-boopick-navy"
      >
        ← 리포트 목록
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {report.industry && (
            <Badge variant="outline">{report.industry}</Badge>
          )}
          <Badge
            className={
              report.tier_used === "pro"
                ? "bg-boopick-orange text-white border-none hover:bg-boopick-orange"
                : "bg-slate-200 text-slate-700 border-none hover:bg-slate-200"
            }
          >
            {report.tier_used.toUpperCase()}
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          {report.query_raw}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date(report.created_at).toLocaleString("ko-KR")} · 매칭 매물{" "}
          {count}건
        </p>
      </div>

      {report.pdf_url ? (
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-boopick-navy">
                📄 PDF 리포트 준비됨
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                다운로드 또는 새 탭에서 열기
              </p>
            </div>
            <Button asChild className="bg-boopick-navy hover:bg-boopick-navy/90 text-white">
              <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                PDF 열기 →
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5 text-center text-sm text-slate-500">
            PDF가 아직 생성되지 않았습니다.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-boopick-navy mb-3">
            파싱된 조건
          </h2>
          <pre className="text-xs bg-slate-50 px-3 py-2 rounded-md overflow-x-auto">
            {JSON.stringify(report.query_parsed, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
