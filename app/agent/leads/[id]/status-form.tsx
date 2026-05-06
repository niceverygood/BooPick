"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInquiryStatus } from "./actions";

interface Props {
  inquiry: {
    id: string;
    status: string;
    contract_amount: number | null;
    contract_type: string | null;
    closed_reason: string | null;
  };
}

const STATUS_OPTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: "pending", label: "신규", emoji: "🆕" },
  { value: "contacted", label: "연락 시작", emoji: "📞" },
  { value: "met", label: "현장 미팅", emoji: "🤝" },
  { value: "contracted", label: "거래 완료", emoji: "✅" },
  { value: "closed", label: "종료", emoji: "📁" },
  { value: "cancelled", label: "취소", emoji: "❌" },
];

export function StatusForm({ inquiry }: Props) {
  const [status, setStatus] = useState(inquiry.status);
  const [contractAmount, setContractAmount] = useState(
    inquiry.contract_amount ? String(inquiry.contract_amount) : ""
  );
  const [contractType, setContractType] = useState(
    inquiry.contract_type ?? "월세"
  );
  const [closedReason, setClosedReason] = useState(inquiry.closed_reason ?? "");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showContractFields = status === "contracted";
  const showClosedReason = status === "closed" || status === "cancelled";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateInquiryStatus(fd);
      if (res.ok) setDone(true);
      else setError(res.error ?? "업데이트 실패");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="inquiry_id" value={inquiry.id} />

      <div>
        <Label className="text-sm font-semibold text-boopick-navy">
          처리 상태
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors " +
                (status === opt.value
                  ? "bg-boopick-navy text-white border-boopick-navy"
                  : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
              }
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="status" value={status} />
      </div>

      {showContractFields && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-boopick-green uppercase tracking-wider">
            거래 완료 정보
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="contract_type" className="text-xs">
                거래 유형
              </Label>
              <select
                id="contract_type"
                name="contract_type"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="mt-1 w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm"
              >
                <option value="매매">매매</option>
                <option value="전세">전세</option>
                <option value="월세">월세</option>
              </select>
            </div>
            <div>
              <Label htmlFor="contract_amount" className="text-xs">
                거래 금액 (원)
              </Label>
              <Input
                id="contract_amount"
                name="contract_amount"
                inputMode="numeric"
                placeholder="80000000"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
                className="mt-1 h-9 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                보증금 또는 매매대금 (성공보수형 정산용)
              </p>
            </div>
          </div>
        </div>
      )}

      {showClosedReason && (
        <div>
          <Label htmlFor="closed_reason" className="text-sm">
            종료 사유 <span className="text-slate-400">(선택)</span>
          </Label>
          <textarea
            id="closed_reason"
            name="closed_reason"
            rows={2}
            value={closedReason}
            onChange={(e) => setClosedReason(e.target.value.slice(0, 500))}
            placeholder="예: 임차인 조건 변경 / 매물 빠짐 / 협의 무산"
            className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange resize-none"
          />
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
        >
          {pending ? "저장 중…" : "상태 저장"}
        </Button>
        {done && (
          <span className="text-xs text-boopick-green font-semibold">
            ✅ 저장됨
          </span>
        )}
        {error && (
          <span className="text-xs text-red-600">에러: {error}</span>
        )}
      </div>
    </form>
  );
}
