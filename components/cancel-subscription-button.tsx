"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  subscriptionId: string;
}

export function CancelSubscriptionButton({ subscriptionId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCancel() {
    if (
      !confirm(
        "정말로 정기결제를 해지하시겠습니까?\n해지하면 다음 결제일부터 청구가 중단됩니다."
      )
    ) {
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payment/subscription/inactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          reason: "user_request",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "해지 실패");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "해지 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancel}
        disabled={busy || pending}
        className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
      >
        {busy ? "해지 중…" : "정기결제 해지"}
      </Button>
      {err && (
        <p className="text-[10px] text-red-600">{err.slice(0, 60)}</p>
      )}
    </div>
  );
}
