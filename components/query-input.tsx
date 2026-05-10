"use client";

// V3 QueryInput — 멀티스텝 의뢰 분석 플로우
//
// Step 1: 데이터셋 선택
// Step 2: 의뢰 메시지 자유 텍스트 입력 → "AI로 분석하기"
// Step 3: 파싱 결과 검토 + 수정 + 업종 선택
// Step 4: "매물 검색하기" → 결과 표시 + PDF 생성

import { useState, FormEvent, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedConditions } from "./parsed-conditions";
import { ResultsTable } from "./results-table";
import { IndustrySelector } from "./industry-selector";
import { EMPTY_PARSED, type ParsedQuery } from "@/lib/parsed-query-types";

const EXAMPLES = [
  "결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) / 사무실 140-200평 연층도 / 월관 최대 3천 / 직원 50명 / 구축X 20년 이내 / 입주 6-7월",
  "강남에 카페 25평쯤 보증금 5천 월세 300 즉시입주",
  "역삼동 학원 30평 1층 보증금 1억 이하",
];

interface DatasetOption {
  id: string;
  name: string;
  row_count: number;
}

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

interface Props {
  datasets: DatasetOption[];
  isPro: boolean;
}

type Step = 1 | 2 | 3 | 4;

export function QueryInput(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}

function Inner({ datasets, isPro }: Props) {
  const sp = useSearchParams();
  const presetDatasetId = sp.get("dataset") ?? "";

  const [step, setStep] = useState<Step>(presetDatasetId ? 2 : 1);
  const [datasetId, setDatasetId] = useState(presetDatasetId);
  const [query, setQuery] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery>(EMPTY_PARSED);
  const [industry, setIndustry] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [parsing, setParsing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [parseTokens, setParseTokens] = useState<{ input: number; output: number } | null>(null);

  // 첫 번째 데이터셋 자동 선택 (preset 없을 때)
  useEffect(() => {
    if (!datasetId && datasets.length === 1) {
      setDatasetId(datasets[0].id);
    }
  }, [datasets, datasetId]);

  // sessionStorage로 의뢰 진행 보관 (실수로 새로고침 대비)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = sessionStorage.getItem("boopick.parsed");
    const cachedQuery = sessionStorage.getItem("boopick.query");
    if (cached && cachedQuery) {
      try {
        setParsed(JSON.parse(cached) as ParsedQuery);
        setQuery(cachedQuery);
      } catch {}
    }
  }, []);

  function persist(next: ParsedQuery, q: string) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("boopick.parsed", JSON.stringify(next));
    sessionStorage.setItem("boopick.query", q);
  }

  async function handleParse(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    if (!datasetId) {
      setError("먼저 데이터셋을 선택하세요");
      setStep(1);
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const res = await fetch("/api/parse-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI 분석 실패");
      const p: ParsedQuery = data.parsed ?? EMPTY_PARSED;
      setParsed(p);
      setParseTokens(data.tokens ?? null);
      persist(p, query.trim());
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분석 실패");
    } finally {
      setParsing(false);
    }
  }

  async function handleSearch() {
    if (!datasetId) {
      setError("데이터셋을 선택하세요");
      return;
    }
    setSearching(true);
    setError(null);
    setReportId(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          parsed,
          industry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검색 실패");
      setResults(data.results ?? []);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setSearching(false);
    }
  }

  async function handleGeneratePDF() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset_id: datasetId,
          query,
          parsed,
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

  function reset() {
    setStep(datasetId ? 2 : 1);
    setQuery("");
    setParsed(EMPTY_PARSED);
    setResults([]);
    setReportId(null);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("boopick.parsed");
      sessionStorage.removeItem("boopick.query");
    }
  }

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <Stepper step={step} />

      {/* Step 1: 데이터셋 */}
      {step === 1 && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-boopick-navy">
                1단계 — 데이터셋 선택
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                분석할 매물 풀을 고르세요. 업로드한 엑셀이 여기 나타납니다.
              </p>
            </div>
            {datasets.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-md p-4 text-center">
                업로드된 데이터셋이 없습니다.{" "}
                <a
                  href="/dashboard/upload"
                  className="text-boopick-orange font-semibold hover:underline"
                >
                  + 업로드하기
                </a>
              </p>
            ) : (
              <div className="space-y-2">
                {datasets.map((d) => (
                  <label
                    key={d.id}
                    className={
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors " +
                      (datasetId === d.id
                        ? "border-boopick-orange bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="dataset"
                        checked={datasetId === d.id}
                        onChange={() => setDatasetId(d.id)}
                        className="accent-boopick-orange"
                      />
                      <div>
                        <p className="text-sm font-semibold text-boopick-navy">
                          {d.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {d.row_count.toLocaleString()}건
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!datasetId}
                className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
              >
                다음 →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 의뢰 입력 */}
      {step === 2 && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-boopick-navy">
                  2단계 — 의뢰 메시지 입력
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  카톡으로 받은 의뢰 메시지 그대로 붙여넣으세요. AI가 조건으로 풀어줍니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                ← 데이터셋 변경
              </Button>
            </div>

            <form onSubmit={handleParse} className="space-y-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) / 사무실 140-200평 연층도 / 월관 최대 3천 / 직원 50명 / 구축X 20년 이내 / 입주 6-7월"
                rows={5}
                className="w-full p-3 rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange text-sm resize-y"
              />

              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuery(q)}
                    className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-boopick-orange text-slate-600 max-w-md truncate"
                    title={q}
                  >
                    {q.length > 50 ? q.slice(0, 48) + "…" : q}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={parsing || !query.trim()}
                  className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
                >
                  {parsing ? "AI가 분석 중…" : "🤖 AI로 분석하기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 검토 + 수정 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-boopick-navy">
                    3단계 — 조건 검토
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    AI 결과를 확인하고 필요한 부분을 수정하세요. 모두 맞으면 매물 검색.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(2)}
                >
                  ← 다시 입력
                </Button>
              </div>
              {parseTokens && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline" className="font-normal">
                    Sonnet 4.5 · in {parseTokens.input} / out {parseTokens.output} 토큰
                  </Badge>
                </div>
              )}
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer hover:text-slate-700">
                  📋 원본 의뢰 메시지 보기
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 rounded-md whitespace-pre-wrap font-sans">
                  {query}
                </pre>
              </details>
            </CardContent>
          </Card>

          <ParsedConditions
            parsed={parsed}
            onChange={(p) => {
              setParsed(p);
              persist(p, query);
            }}
          />

          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-boopick-navy mb-2">
                  업종 선택 (선택)
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  업종 선택 시 해당 산업에 특화된 가중치로 매칭합니다.
                </p>
                <IndustrySelector
                  value={industry}
                  onChange={setIndustry}
                  isPro={isPro}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={reset}
                >
                  처음부터
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
                >
                  {searching ? "검색 중…" : "🔍 매물 검색하기"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: 결과 */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-boopick-navy">
                    4단계 — 분석 결과 ({results.length}건)
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    매칭 점수 순. PDF로 출력하면 의뢰자에게 그대로 보낼 수 있습니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(3)}
                  >
                    ← 조건 수정
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={reset}
                  >
                    처음부터
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-slate-500">
                  조건에 맞는 매물이 없습니다. 조건을 완화해보세요.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <ResultsTable results={results} />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleGeneratePDF}
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
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const items = [
    { n: 1, label: "데이터셋" },
    { n: 2, label: "의뢰 입력" },
    { n: 3, label: "조건 검토" },
    { n: 4, label: "결과" },
  ];
  return (
    <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
      {items.map((it, i) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <div key={it.n} className="flex items-center gap-1.5 sm:gap-3">
            <div
              className={
                "flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold border " +
                (active
                  ? "bg-boopick-navy text-white border-boopick-navy"
                  : done
                  ? "bg-boopick-green/10 text-boopick-green border-boopick-green/30"
                  : "bg-white text-slate-400 border-slate-200")
              }
            >
              <span
                className={
                  "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] " +
                  (active
                    ? "bg-white text-boopick-navy"
                    : done
                    ? "bg-boopick-green text-white"
                    : "bg-slate-100 text-slate-400")
                }
              >
                {done ? "✓" : it.n}
              </span>
              {it.label}
            </div>
            {i < items.length - 1 && (
              <span className="text-slate-300 text-xs">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
