"use client";

// V3+ 매물 업로드 — 브라우저 파싱 + 3-stage JSON batch
//
// 이전: multipart로 전체 xlsx 업로드 → Vercel 4.5MB body 제한 → 413 에러
// 이번: 브라우저에서 xlsx 파싱 → 작은 JSON 페이로드 + 배치 INSERT
//
// 흐름:
//   1. 사용자 파일 픽
//   2. [다음 단계] → 브라우저 XLSX.read → headers/sample 추출
//      → POST /api/upload {stage:"analyze"} → mapping
//   3. ColumnMapping UI 표시 → 사용자 검토
//   4. [저장하고 검색하기]
//      → POST /api/upload {stage:"create"} → dataset_id
//      → 행을 2000개씩 묶어서 POST /api/upload {stage:"batch"} 반복
//      → 진행률 표시
//      → 완료 후 /dashboard/search?dataset=... 리다이렉트

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnMapping } from "@/components/column-mapping";
import { parseExcel } from "@/lib/excel-parser";
import type { StandardColumn } from "@/lib/column-mappings";

type Stage = "idle" | "parsing" | "analyzing" | "review" | "saving" | "done";

const BATCH_SIZE = 2000;

interface ParsedState {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
}

interface AnalyzeResponse {
  ok: boolean;
  headers: string[];
  mapping: Record<string, StandardColumn | null>;
  sample: Array<Record<string, unknown>>;
}

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [mapping, setMapping] = useState<Record<string, StandardColumn | null>>(
    {}
  );
  const [datasetName, setDatasetName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 진행률 (배치 인서트)
  const [progress, setProgress] = useState({ inserted: 0, total: 0 });

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("xlsx, xls 또는 csv 파일만 업로드 가능합니다");
      return;
    }
    // macOS AppleDouble 메타데이터 파일 차단 (._foo.xlsx / _$foo.xlsx)
    if (/^[._$]|^_\$/.test(f.name)) {
      setError(
        "이 파일은 macOS 시스템 메타데이터입니다 (실제 파일 아님). " +
          "Finder에서 Cmd+Shift+. 로 숨김 파일을 끄고 원본을 다시 선택해주세요."
      );
      return;
    }
    // 0바이트 또는 매우 작은 파일도 의심
    if (f.size < 1024) {
      setError(
        `파일 크기가 ${f.size}B로 너무 작습니다. 손상된 파일이거나 메타데이터일 수 있어요.`
      );
      return;
    }
    setFile(f);
    setDatasetName(f.name.replace(/\.(xlsx|xls|csv)$/i, ""));
    setError(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files[0]);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    pick(e.target.files?.[0]);
  }

  // STAGE: 브라우저에서 xlsx 파싱 → 작은 JSON으로 분석 요청
  async function analyze() {
    if (!file || stage !== "idle") return;
    setStage("parsing");
    setError(null);

    try {
      // 1. 브라우저에서 xlsx 파싱
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellFormula: true, cellHTML: false });
      const result = parseExcel(workbook);

      if (result.headers.length === 0) {
        throw new Error(
          "헤더를 찾을 수 없습니다. 첫 행이 헤더인지 확인해주세요."
        );
      }
      if (result.totalRows === 0) {
        throw new Error("데이터 행이 없습니다");
      }

      setParsed({
        filename: file.name,
        headers: result.headers,
        rows: result.rows,
        totalRows: result.totalRows,
      });

      // 2. 매핑 추론 — sample 5개만 보냄 (~5KB payload)
      setStage("analyzing");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "analyze",
          headers: result.headers,
          sample: result.rows.slice(0, 5),
        }),
      });
      const data: AnalyzeResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "분석 실패"
        );
      }
      setMapping(data.mapping ?? {});
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "파싱 실패");
      setStage("idle");
    }
  }

  // STAGE: dataset 생성 + 배치 인서트
  async function confirm() {
    if (!parsed || stage !== "review") return;
    setStage("saving");
    setError(null);
    setProgress({ inserted: 0, total: parsed.totalRows });

    try {
      // 1. 데이터셋 생성
      const createRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "create",
          name: datasetName.trim() || parsed.filename,
          original_filename: parsed.filename,
          total_rows: parsed.totalRows,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.dataset_id) {
        const baseMsg = createData.error ?? "데이터셋 생성 실패";
        const detail = createData.detail
          ? ` — ${createData.detail}`
          : "";
        throw new Error(baseMsg + detail);
      }
      const datasetId: string = createData.dataset_id;

      // 2. 배치 인서트 (sequential — 동시성 시 race condition 위험)
      const total = parsed.totalRows;
      let inserted = 0;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = parsed.rows.slice(i, i + BATCH_SIZE);
        const isLast = i + BATCH_SIZE >= total;
        const batchRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "batch",
            dataset_id: datasetId,
            mapping,
            rows: chunk,
            last: isLast,
          }),
        });
        const batchData = await batchRes.json();
        if (!batchRes.ok) {
          throw new Error(
            (batchData.error ?? "배치 인서트 실패") +
              (batchData.detail ? ` — ${batchData.detail}` : "")
          );
        }
        inserted += chunk.length;
        setProgress({ inserted, total });
      }

      setStage("done");
      setTimeout(() => {
        router.push(`/dashboard/search?dataset=${datasetId}`);
        router.refresh();
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setStage("review");
    }
  }

  function reset() {
    setStage("idle");
    setFile(null);
    setParsed(null);
    setMapping({});
    setDatasetName("");
    setError(null);
    setProgress({ inserted: 0, total: 0 });
  }

  // ──────────────────────────────────────────────
  // STAGE: idle / parsing / analyzing — 드롭존
  if (stage === "idle" || stage === "parsing" || stage === "analyzing") {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={
            "rounded-lg border-2 border-dashed p-10 sm:p-16 text-center cursor-pointer transition-colors " +
            (dragOver
              ? "border-boopick-orange bg-orange-50/30"
              : "border-slate-300 bg-white hover:border-boopick-orange")
          }
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onChange}
            className="hidden"
          />
          <div className="text-4xl mb-3">📊</div>
          {file ? (
            <>
              <p className="text-base font-semibold text-boopick-navy">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-boopick-navy">
                xlsx 파일을 끌어놓거나 클릭하세요
              </p>
              <p className="text-xs text-slate-500 mt-1">
                매물번호, 지역, 면적, 보증금/월세 등이 포함된 엑셀 파일
                <br />
                <span className="text-[10px] text-slate-400">
                  브라우저에서 파싱 → 서버 전송 (사이즈 제한 없음)
                </span>
              </p>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={analyze}
            disabled={!file || stage !== "idle"}
            className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
          >
            {stage === "parsing"
              ? "브라우저 파싱 중…"
              : stage === "analyzing"
              ? "AI 매핑 추론 중…"
              : "다음 단계"}
          </Button>
          {file && stage === "idle" && (
            <button
              type="button"
              onClick={reset}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // STAGE: review / saving / done — 매핑 검토 + 배치 인서트
  if (parsed) {
    const usable = Object.values(mapping).filter((v) => v !== null).length;
    const pct = progress.total > 0
      ? Math.round((progress.inserted / progress.total) * 100)
      : 0;

    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  분석 완료
                </p>
                <p className="text-base font-semibold text-boopick-navy mt-1">
                  📄 {parsed.filename}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  헤더 {parsed.headers.length}개 · 매물{" "}
                  <strong className="text-boopick-navy">
                    {parsed.totalRows.toLocaleString()}
                  </strong>
                  건 · 매핑된 컬럼 {usable}개
                </p>
              </div>
              <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
                Step 2/2
              </Badge>
            </div>
            <div className="mt-4">
              <label className="text-xs text-slate-500">
                데이터셋 이름
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  disabled={stage !== "review"}
                  className="mt-1 w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-sm"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <ColumnMapping
          headers={parsed.headers}
          mapping={mapping}
          onChange={(h, std) => setMapping((m) => ({ ...m, [h]: std }))}
          disabled={stage !== "review"}
        />

        {/* 진행률 */}
        {(stage === "saving" || stage === "done") && progress.total > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-boopick-navy">
                  {stage === "done" ? "✅ 저장 완료" : "💾 저장 중…"}
                </p>
                <p className="text-xs text-slate-600 tabular-nums">
                  {progress.inserted.toLocaleString()} /{" "}
                  {progress.total.toLocaleString()}건 ({pct}%)
                </p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={
                    "h-full transition-all " +
                    (stage === "done"
                      ? "bg-boopick-green"
                      : "bg-boopick-orange")
                  }
                  style={{ width: `${pct}%` }}
                />
              </div>
              {stage === "saving" && (
                <p className="text-xs text-slate-500 mt-2">
                  배치 {BATCH_SIZE.toLocaleString()}건씩 전송 — 4만 건 기준 약
                  20초 소요
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 sticky bottom-0 bg-slate-50 py-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:static border-t border-slate-200 sm:border-none">
          <Button
            onClick={confirm}
            disabled={stage !== "review" || usable === 0}
            size="lg"
            className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            {stage === "saving"
              ? `저장 중… (${pct}%)`
              : stage === "done"
              ? "이동 중…"
              : "💾 저장하고 검색하기"}
          </Button>
          {stage === "review" && (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              취소
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
