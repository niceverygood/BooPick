"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  id: string;
  name: string;
  rowCount: number;
  uploadedAt: string;
  /** Basic 사용자만 표시 — null이면 Pro (영구 보관) */
  daysUntilExpiry?: number | null;
}

export function DatasetRow({
  id,
  name,
  rowCount,
  uploadedAt,
  daysUntilExpiry,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `"${name}" 데이터셋을 삭제하시겠습니까?\n포함된 매물 ${rowCount.toLocaleString()}건도 함께 삭제됩니다.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(`삭제 실패: ${data.error ?? ""}`);
        setDeleting(false);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      alert(`삭제 실패: ${e instanceof Error ? e.message : ""}`);
      setDeleting(false);
    }
  }

  if (deleting && !pending) return null;

  // 만료 경고 색상 (Basic만)
  const expiryBadge = (() => {
    if (daysUntilExpiry == null) return null;
    if (daysUntilExpiry <= 0) {
      return (
        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
          만료
        </span>
      );
    }
    if (daysUntilExpiry <= 7) {
      return (
        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
          {daysUntilExpiry}일 후 삭제
        </span>
      );
    }
    if (daysUntilExpiry <= 14) {
      return (
        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
          {daysUntilExpiry}일 후 삭제
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400">
        {daysUntilExpiry}일 후 자동 삭제
      </span>
    );
  })();

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-slate-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-boopick-navy line-clamp-1">
          {name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-slate-500">
            {rowCount.toLocaleString()}건 ·{" "}
            {new Date(uploadedAt).toLocaleDateString("ko-KR")}
          </p>
          {expiryBadge}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/dashboard/search?dataset=${id}`}
          className="text-xs px-2.5 py-1 rounded-md bg-boopick-navy text-white font-semibold hover:bg-boopick-navy/90"
        >
          검색
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || pending}
          className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    </li>
  );
}
