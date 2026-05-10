"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ParsedConditions } from "./parsed-conditions";
import { ResultsTable } from "./results-table";
import { IndustrySelector } from "./industry-selector";

const EXAMPLES = [
  "강남에 결혼식장으로 50평 이상 보증금 1억 이하",
  "역삼동 카페 자리 25평 즉시입주",
  "신사동 학원 30평 1층",
  "압구정 필라테스 자리 신축",
];

interface SearchResult {
  id: number;
  지역: string | null;
  공급_평: number | null;
  해당층: string | null;
  보증금: number | null;
  월세: number | null;
  추천업종: string | null;
  score: number;
  reasons: string[];
}

export function QueryInput() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const sp = useSearchParams();
  const datasetId = sp.get("dataset") ?? "";
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [parsed, setParsed] = useState<unknown>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setReportId(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          dataset_id: datasetId || undefined,
          industry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setParsed(data.parsed);
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setLoading(false);
    }
  }

  async function generatePDF() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          dataset_id: datasetId || undefined,
          industry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "PDF 생성 실패");
      setReportId(data.report_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-boopick-navy">
            업종 선택
          </label>
          <IndustrySelector value={industry} onChange={setIndustry} />
        </div>

        <div>
          <label className="text-sm font-semibold text-boopick-navy">
            조건 한 줄
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="강남에 결혼식장으로 50평 이상 보증금 1억 이하"
              className="flex-1 h-11 px-3 rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-11 px-5 bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              {loading ? "분석 중…" : "분석"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuery(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-boopick-orange text-slate-600"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      {parsed != null ? <ParsedConditions parsed={parsed} /> : null}

      {results.length > 0 && (
        <>
          <ResultsTable results={results} />
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={generatePDF}
              disabled={generating}
              className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
            >
              {generating ? "PDF 생성 중…" : "📄 PDF 리포트 생성"}
            </Button>
            {reportId && (
              <a
                href={`/dashboard/reports/${reportId}`}
                className="text-sm text-boopick-orange font-semibold hover:underline"
              >
                생성된 리포트 보기 →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
