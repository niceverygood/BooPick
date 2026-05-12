"use client";

// PDF 리포트 생성 + 자동 다운로드 버튼.
//
// 동작:
//   1. 클릭 → /api/generate-pdf POST { report_id }
//   2. 응답에서 받은 signed URL을 a 태그 trigger로 다운로드
//   3. 진행 상태 표시 (생성 중 / 완료 / 에러)
//
// 이전 단계(/api/search)에서 만든 reports row의 PDF만 채우는 구조.

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  reportId: string | null;
  industry?: string | null;
  tier?: "basic" | "pro";
  fallbackPdfUrl?: string | null;
}

type Phase = "idle" | "generating" | "done" | "error";

export function GenerateReportButton({
  reportId,
  industry,
  tier = "basic",
  fallbackPdfUrl,
}: Props) {
  const [phase, setPhase] = useState<Phase>(
    fallbackPdfUrl ? "done" : "idle"
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(fallbackPdfUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!reportId) {
      setError("리포트 ID가 없습니다. 먼저 매물 검색을 실행해주세요.");
      setPhase("error");
      return;
    }
    if (phase === "generating") return;

    setPhase("generating");
    setError(null);

    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const baseMsg = data.error ?? "PDF 생성 실패";
        const detail = data.detail ? ` — ${data.detail}` : "";
        throw new Error(baseMsg + detail);
      }

      const url: string | null = data.pdf_url ?? null;
      const name: string | null = data.file_name ?? null;
      if (!url) {
        const detail = data.detail ? ` (${data.detail})` : "";
        throw new Error("PDF URL을 받지 못했습니다" + detail);
      }

      setPdfUrl(url);
      setFileName(name);
      setPhase("done");

      // 자동 다운로드 트리거
      triggerDownload(url, name ?? buildFallbackFileName(industry));
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 실패");
      setPhase("error");
    }
  }

  // 이미 받은 signed URL 다시 다운로드 (signed URL 만료 전 재시도용 X — 그냥 재호출)
  async function reDownload() {
    if (!pdfUrl) return;
    triggerDownload(pdfUrl, fileName ?? buildFallbackFileName(industry));
  }

  return (
    <div className="space-y-3">
      {phase === "idle" && (
        <Button
          size="lg"
          onClick={handleClick}
          disabled={!reportId}
          className="bg-boopick-orange hover:bg-boopick-orange/90 text-white text-base h-12 px-7"
        >
          📄 PDF 리포트 다운로드
        </Button>
      )}

      {phase === "generating" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
          <Spinner />
          <div>
            <p className="text-sm font-semibold text-boopick-navy">
              PDF 생성 중…
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {tier === "pro"
                ? "QR 코드 + 산업 분석 포함 (30~60초)"
                : "비교표 + 매물 5건 정리 (20~40초)"}
            </p>
          </div>
        </div>
      )}

      {phase === "done" && pdfUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-2xl">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-boopick-navy">
                PDF 생성 완료
              </p>
              {fileName && (
                <p className="text-xs text-slate-600 truncate">{fileName}</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={reDownload}
              variant="outline"
              className="shrink-0"
            >
              다시 받기
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            다운로드되지 않으면{" "}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener"
              className="text-boopick-orange font-semibold hover:underline"
            >
              여기를 클릭
            </a>
            하세요. 링크는 7일간 유효합니다.
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-2">
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-xl">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                PDF 생성 실패
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <Button onClick={handleClick} variant="outline" size="sm">
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-boopick-orange border-t-transparent rounded-full animate-spin" />
  );
}

function triggerDownload(url: string, name: string) {
  if (typeof window === "undefined") return;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);
}

function buildFallbackFileName(industry?: string | null): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${industry ?? "매물"}_제안서_${yyyy}-${mm}-${dd}.pdf`;
}
