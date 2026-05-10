"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setError("xlsx 또는 xls 파일만 업로드 가능합니다");
      return;
    }
    setFile(f);
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

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setProgress("파일 업로드 중...");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "업로드 실패");

      setProgress(`✅ ${data.row_count}건 임포트 완료`);
      setTimeout(() => {
        router.push(`/dashboard/search?dataset=${data.dataset_id}`);
        router.refresh();
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
      setUploading(false);
      setProgress(null);
    }
  }

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
          accept=".xlsx,.xls"
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

      {progress && (
        <p className="mt-3 text-sm text-boopick-navy">{progress}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={upload}
          disabled={!file || uploading}
          className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
        >
          {uploading ? "업로드 중…" : "업로드 및 분석"}
        </Button>
        {file && !uploading && (
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
