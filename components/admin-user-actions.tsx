"use client";

// 어드민 페이지 행 액션 — 티어 토글 + 사용량 리셋
//
// 호출 API:
//   POST /api/admin/set-tier — { user_id, tier, beta_request_id? }
//   PUT  /api/admin/set-tier — { user_id }  (사용량 리셋)

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  currentTier: "basic" | "pro";
  betaRequestId?: string | null;
  compact?: boolean;
}

export function AdminUserActions({
  userId,
  currentTier,
  betaRequestId,
  compact,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"toggle" | "reset" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const targetTier = currentTier === "pro" ? "basic" : "pro";

  async function toggleTier() {
    if (
      !confirm(
        `이 사용자를 ${targetTier.toUpperCase()}로 변경하시겠습니까?${
          targetTier === "pro" && betaRequestId
            ? "\n(연결된 Pro 베타 신청도 approved 처리됩니다)"
            : ""
        }`
      )
    )
      return;

    setBusy("toggle");
    setErr(null);
    try {
      const res = await fetch("/api/admin/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          tier: targetTier,
          beta_request_id: betaRequestId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "실패");
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  async function resetUsage() {
    if (!confirm("이 사용자의 이번 달 사용량을 0으로 리셋하시겠습니까?")) return;
    setBusy("reset");
    setErr(null);
    try {
      const res = await fetch("/api/admin/set-tier", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "실패");
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={compact ? "flex flex-col gap-1.5 shrink-0" : "flex justify-end gap-1.5"}>
      <Button
        size="sm"
        onClick={toggleTier}
        disabled={busy !== null || pending}
        className={
          targetTier === "pro"
            ? "bg-boopick-orange hover:bg-boopick-orange/90 text-white text-xs h-8 px-3"
            : "bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs h-8 px-3"
        }
      >
        {busy === "toggle"
          ? "변경 중…"
          : targetTier === "pro"
          ? "→ PRO 승격"
          : "→ Basic 강등"}
      </Button>
      {!compact && (
        <Button
          size="sm"
          variant="outline"
          onClick={resetUsage}
          disabled={busy !== null || pending}
          className="text-xs h-8 px-3"
        >
          {busy === "reset" ? "…" : "사용량 리셋"}
        </Button>
      )}
      {err && (
        <span className="text-[10px] text-red-600">{err.slice(0, 40)}</span>
      )}
    </div>
  );
}
