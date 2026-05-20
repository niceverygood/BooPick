import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import type { ParsedQuery } from "@/lib/parsed-query-types";

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

// ParsedQuery → 읽기 쉬운 조건 행 (pdf-generator buildCondMetaRows 와 동일 규칙)
function buildConditionRows(
  q: Partial<ParsedQuery>
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (q.regions?.length || q.exclude_regions?.length) {
    let v = (q.regions ?? []).join(" / ");
    if (q.exclude_regions?.length) {
      v += ` (${q.exclude_regions.map((r) => `${r} 제외`).join(", ")})`;
    }
    rows.push({ label: "지역", value: v });
  }
  if (q.industry) rows.push({ label: "업종", value: q.industry });
  if (q.area_min_평 != null || q.area_max_평 != null) {
    const min = q.area_min_평 ?? "?";
    const max = q.area_max_평 ?? "?";
    const yeon = q.area_연층_허용 ? " (연층 검토 가능)" : "";
    rows.push({ label: "면적", value: `${min} ~ ${max}평${yeon}` });
  }
  if (q.rent_max_total_만원 != null) {
    rows.push({
      label: "임대료",
      value: `월세+관리비 최대 ${q.rent_max_total_만원.toLocaleString()}만`,
    });
  } else if (q.rent_max_월세_만원 != null) {
    rows.push({
      label: "월세",
      value: `최대 ${q.rent_max_월세_만원.toLocaleString()}만`,
    });
  }
  if (q.deposit_max_억 != null) {
    rows.push({ label: "보증금", value: `최대 ${q.deposit_max_억}억` });
  }
  if (q.employee_count != null) {
    rows.push({ label: "인원", value: `${q.employee_count}명` });
  }
  if (q.max_age_year != null) {
    rows.push({ label: "건물", value: `준공 ${q.max_age_year}년 이내` });
  } else if (q.min_year != null) {
    rows.push({ label: "건물", value: `${q.min_year}년 이후 준공` });
  }
  if (q.parking_required) {
    rows.push({ label: "주차", value: "방문주차 양호 필요" });
  }
  if (q.move_in_month) {
    rows.push({ label: "입주", value: q.move_in_month });
  }
  return rows;
}

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const report = await fetchReport(params.id);
  if (!report) notFound();

  const count = report.selected_listings?.length ?? 0;
  const q = report.query_parsed as Partial<ParsedQuery>;
  const rows = buildConditionRows(q);
  const notes = Array.isArray(q.additional_notes) ? q.additional_notes : [];
  const isPro = report.tier_used === "pro";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-800"
      >
        ← 리포트 목록
      </Link>

      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          {report.industry && <Chip tone="navy">{report.industry}</Chip>}
          <Chip tone={isPro ? "orange" : "neutral"}>
            {report.tier_used.toUpperCase()}
          </Chip>
          <Chip tone="safe">매칭 {count}건</Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-800 text-balance">
          {report.query_raw}
        </h1>
        <p className="num text-sm text-slate-500 mt-1.5">
          {new Date(report.created_at).toLocaleString("ko-KR")}
        </p>
      </div>

      {/* PDF 섹션 */}
      {report.pdf_url ? (
        <div className="bp-card p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cream-100 text-navy-700 flex items-center justify-center shrink-0">
              <DocIcon />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-800">
                PDF 리포트 준비됨
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                다운로드하거나 새 탭에서 열어보세요
              </p>
            </div>
          </div>
          <Button asChild className="bp-btn bp-btn-primary bp-btn-md">
            <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
              PDF 열기 →
            </a>
          </Button>
        </div>
      ) : (
        <div className="bp-card p-6 flex flex-col items-center text-center gap-3 border-dashed">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <DocIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-800">
              PDF가 아직 생성되지 않았습니다
            </p>
            <p className="text-xs text-slate-500 mt-1">
              검색 화면에서 이 조건으로 매물을 선택한 뒤 PDF를 생성할 수
              있습니다.
            </p>
          </div>
          <Button asChild className="bp-btn bp-btn-secondary bp-btn-md mt-1">
            <Link href="/dashboard/search">검색에서 리포트 생성</Link>
          </Button>
        </div>
      )}

      {/* 의뢰 조건 요약 */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-navy-800 mb-4">의뢰 조건</h2>

          {rows.length > 0 ? (
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-3.5"
                >
                  <dt className="text-sm text-slate-500 shrink-0">{r.label}</dt>
                  <dd className="text-sm font-semibold text-navy-800 text-right">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">파싱된 조건이 없습니다.</p>
          )}

          {notes.length > 0 && (
            <div className="mt-5 pt-1">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                추가 조건
              </p>
              <div className="flex flex-wrap gap-1.5">
                {notes.map((n, i) => (
                  <Chip key={i} tone="neutral">
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* 원본 JSON — 개발/디버그용 접이식 */}
          <details className="mt-5 group">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
              원본 파싱 데이터 (JSON)
            </summary>
            <pre className="num text-xs bg-slate-50 px-3 py-2 rounded-md overflow-x-auto mt-2 text-slate-600">
              {JSON.stringify(report.query_parsed, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}

function DocIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3h8l4 4v14H4V3h4Z" />
      <path d="M8 13h8M8 17h6M8 9h4" />
    </svg>
  );
}
