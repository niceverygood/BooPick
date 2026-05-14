"use client";

// V3 산업군 선택 UI
//
// 정렬: 임대 의뢰 빈도순 (단일 줄)
//   사무실(35%) → 음식점(25%) → 카페(10%) → 학원(8%) → 미용실(5%)
//   → 병원(5%) → 헬스(4%) → 술집(4%) → 법무(2%) → 결정사(1%)
//
// 작동 상태:
//   - available=true: 클릭 가능 (사무실, 결혼정보회사)
//   - available=false: V2 준비중 (나머지 8종)
//
// Pro 전용 여부는 PRO 배지로 표시 — 결정사만 해당.
// 그룹 분리 X — 결정사도 다른 V2 후보와 동일 라인.

import { useState } from "react";

export interface IndustryOption {
  id: string;
  label: string;
  available: boolean;
  pro_only: boolean;
}

// 임대 의뢰 빈도순 (강남·판교 상업 임대 시장 추정)
export const INDUSTRIES: IndustryOption[] = [
  { id: "사무실", label: "🏢 일반 사무실", available: true, pro_only: false },
  { id: "음식점", label: "🍽️ 음식점", available: false, pro_only: false },
  { id: "카페", label: "☕ 카페", available: false, pro_only: false },
  { id: "학원", label: "📚 학원", available: false, pro_only: false },
  { id: "미용실", label: "💇 미용실", available: false, pro_only: false },
  { id: "병원", label: "🏥 병원", available: false, pro_only: false },
  { id: "헬스/필라테스", label: "🧘 헬스/필라테스", available: false, pro_only: false },
  { id: "술집", label: "🍻 술집", available: false, pro_only: false },
  { id: "법무법인", label: "⚖️ 법무법인", available: false, pro_only: false },
  { id: "결혼정보회사", label: "💍 결혼정보회사", available: true, pro_only: true },
];

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
  isPro?: boolean;
}

export function IndustrySelector({ value, onChange, isPro = false }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleClick(opt: IndustryOption) {
    if (!opt.available) {
      showToast(
        `${opt.id}은(는) V2에 추가 예정입니다 — 우선은 "일반 사무실"로 분석할 수 있어요.`
      );
      return;
    }
    if (opt.pro_only && !isPro) {
      showToast(
        `⓵ ${opt.id} 산업 관점 분석은 Pro 티어부터 이용 가능합니다. 일반 사무실로는 가능합니다.`
      );
      return;
    }
    onChange(opt.id);
  }

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
        {INDUSTRIES.map((opt) => {
          const locked = !opt.available || (opt.pro_only && !isPro);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt)}
              title={
                !opt.available
                  ? "V2 추가 예정 — 클릭해서 안내 보기"
                  : opt.pro_only && !isPro
                  ? "Pro 티어 전용 — 클릭해서 안내 보기"
                  : ""
              }
              className={
                btnClass(value === opt.id) +
                (locked ? " opacity-50" : "")
              }
            >
              {opt.label}
              {opt.pro_only && (
                <span className="ml-1 text-[10px] font-bold text-boopick-orange">
                  PRO
                </span>
              )}
              {!opt.available && (
                <span className="ml-1 text-[10px] text-slate-400">
                  (준비중)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 인라인 안내 (Pro전용 + basic 유저인 경우) */}
      {value &&
        INDUSTRIES.find((i) => i.id === value)?.pro_only &&
        !isPro && (
          <p className="text-xs text-amber-600">
            ⚠ 산업 관점 분석은 Pro 티어부터 이용 가능합니다.
          </p>
        )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-boopick-navy text-white text-xs px-4 py-3 rounded-md shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
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
