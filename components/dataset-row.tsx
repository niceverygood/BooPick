"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  id: string;
  name: string;
  rowCount: number;
  uploadedAt: string;
}

export function DatasetRow({ id, name, rowCount, uploadedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${name}" 데이터셋을 삭제하시겠습니까?\n포함된 매물 ${rowCount.toLocaleString()}건도 함께 삭제됩니다.`)) {
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

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-slate-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-boopick-navy line-clamp-1">
          {name}
        </p>
        <p className="text-xs text-slate-500">
          {rowCount.toLocaleString()}건 ·{" "}
          {new Date(uploadedAt).toLocaleDateString("ko-KR")}
        </p>
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
