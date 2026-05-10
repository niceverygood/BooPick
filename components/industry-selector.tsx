"use client";

// V3 산업군 — 의뢰 분석 가중치 적용 가능한 업종
//
// 정책:
//   - 일반 사무실: 누구나 (basic/pro)
//   - 결혼정보회사: Pro 티어 전용 (산업 특화 가중치 + 인사이트)
//   - 그 외(카페/학원/필라테스/식당/미용실/병원): "준비 중" — 선택 시 일반 사무실 fallback

export interface IndustryOption {
  id: string;          // 내부 식별자 (ParsedQuery.industry 표준화 값과 일치)
  label: string;       // 화면 표시
  available: boolean;  // 분석 가능 여부 (false면 가중치 미적용 + 안내)
  pro_only: boolean;   // Pro 전용 여부
}

export const INDUSTRIES: IndustryOption[] = [
  { id: "사무실", label: "🏢 일반 사무실", available: true, pro_only: false },
  { id: "결혼정보회사", label: "💍 결혼정보회사 (Pro)", available: true, pro_only: true },
  { id: "카페", label: "☕ 카페", available: false, pro_only: false },
  { id: "학원", label: "📚 학원", available: false, pro_only: false },
  { id: "필라테스", label: "🧘 필라테스", available: false, pro_only: false },
  { id: "식당", label: "🍽️ 식당", available: false, pro_only: false },
  { id: "미용실", label: "💇 미용실", available: false, pro_only: false },
  { id: "병원", label: "🏥 병원", available: false, pro_only: false },
];

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  isPro?: boolean;
}

export function IndustrySelector({ value, onChange, isPro = false }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={btnClass(value == null)}
        >
          선택 안 함
        </button>
        {INDUSTRIES.map((i) => {
          const locked = !i.available || (i.pro_only && !isPro);
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => {
                if (locked) return;
                onChange(i.id);
              }}
              disabled={locked}
              title={
                !i.available
                  ? "준비 중 — 일반 사무실 가중치로 분석됩니다"
                  : locked
                  ? "Pro 티어 전용입니다"
                  : ""
              }
              className={
                btnClass(value === i.id) +
                (locked ? " opacity-40 cursor-not-allowed" : "")
              }
            >
              {i.label}
              {!i.available && (
                <span className="ml-1 text-[10px] text-slate-400">(준비중)</span>
              )}
            </button>
          );
        })}
      </div>
      {value && INDUSTRIES.find((i) => i.id === value)?.pro_only && !isPro && (
        <p className="text-xs text-amber-600">
          ⚠ 산업 관점 분석은 Pro 티어부터 이용 가능합니다.
        </p>
      )}
    </div>
  );
}

function btnClass(active: boolean): string {
  return (
    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors " +
    (active
      ? "bg-boopick-navy text-white border-boopick-navy"
      : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
  );
}
