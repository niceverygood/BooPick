"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnMapping } from "@/components/column-mapping";
import type { StandardColumn } from "@/lib/column-mappings";

type Stage = "idle" | "analyzing" | "review" | "saving" | "done";

interface AnalyzeResponse {
  ok: boolean;
  filename: string;
  headers: string[];
  mapping: Record<string, StandardColumn | null>;
  row_count: number;
  sample: Array<Record<string, unknown>>;
  rows: Array<Record<string, unknown>>;
}

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzeResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, StandardColumn | null>>(
    {}
  );
  const [datasetName, setDatasetName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("xlsx, xls 또는 csv 파일만 업로드 가능합니다");
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

  async function analyze() {
    if (!file || stage === "analyzing") return;
    setStage("analyzing");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: AnalyzeResponse = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as unknown as { error?: string }).error ?? "분석 실패"
        );
      }
      setAnalyzed(data);
      setMapping(data.mapping);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
      setStage("idle");
    }
  }

  async function confirm() {
    if (!analyzed || stage === "saving") return;
    setStage("saving");
    setError(null);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: analyzed.filename,
          name: datasetName,
          rows: analyzed.rows,
          mapping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");

      setStage("done");
      setTimeout(() => {
        router.push(`/dashboard/search?dataset=${data.dataset_id}`);
        router.refresh();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setStage("review");
    }
  }

  function reset() {
    setStage("idle");
    setFile(null);
    setAnalyzed(null);
    setMapping({});
    setDatasetName("");
    setError(null);
  }

  // STAGE: idle / analyzing — 드롭존
  if (stage === "idle" || stage === "analyzing") {
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
            disabled={!file || stage === "analyzing"}
            className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
          >
            {stage === "analyzing"
              ? "분석 중… (헤더·매핑 추출)"
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

  // STAGE: review — 매핑 검토 + 사용자 수정
  if (stage === "review" || stage === "saving" || stage === "done") {
    const a = analyzed!;
    const usable = Object.values(mapping).filter((v) => v !== null).length;

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
                  📄 {a.filename}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  헤더 {a.headers.length}개 · 매물{" "}
                  <strong className="text-boopick-navy">
                    {a.row_count.toLocaleString()}
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
          headers={a.headers}
          mapping={mapping}
          onChange={(h, std) => setMapping((m) => ({ ...m, [h]: std }))}
          disabled={stage !== "review"}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {stage === "done" && (
          <p className="text-sm text-boopick-green bg-emerald-50 px-3 py-2 rounded-md">
            ✅ {a.row_count.toLocaleString()}건 저장 완료. 검색 페이지로 이동
            중…
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
              ? "저장 중… (수만 건은 30초 정도)"
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
