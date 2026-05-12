"use client";

// V3 산업군 선택 UI
//
// 정렬 정책 (사장님 의뢰 빈도순):
//   V1 작동: 일반 사무실(누구나) → 결혼정보회사(Pro)
//   V2 준비중: 음식점 → 카페 → 학원 → 미용실 → 병원 → 헬스 → 술집 → 법무법인
//
// 결정사는 검증 케이스라 V1에 살아있지만 첫 자리 X — 사장님 실제 의뢰는
// 사무실·음식점이 압도적으로 많음.

import { useState } from "react";

export interface IndustryOption {
  id: string;
  label: string;
  available: boolean;
  pro_only: boolean;
}

// V1 작동 (현재 분석 가능) — 자주 쓰는 순
export const V1_INDUSTRIES: IndustryOption[] = [
  { id: "사무실", label: "🏢 일반 사무실", available: true, pro_only: false },
  { id: "결혼정보회사", label: "💍 결혼정보회사", available: true, pro_only: true },
];

// V2 준비중 — 임대 의뢰 빈도순
export const V2_INDUSTRIES: IndustryOption[] = [
  { id: "음식점", label: "🍽️ 음식점", available: false, pro_only: false },
  { id: "카페", label: "☕ 카페", available: false, pro_only: false },
  { id: "학원", label: "📚 학원", available: false, pro_only: false },
  { id: "미용실", label: "💇 미용실", available: false, pro_only: false },
  { id: "병원", label: "🏥 병원", available: false, pro_only: false },
  { id: "헬스/필라테스", label: "🧘 헬스/필라테스", available: false, pro_only: false },
  { id: "술집", label: "🍻 술집", available: false, pro_only: false },
  { id: "법무법인", label: "⚖️ 법무법인", available: false, pro_only: false },
];

// 전체 (lib 다른 곳에서 import해서 사용 — 검증·매핑용)
export const INDUSTRIES: IndustryOption[] = [...V1_INDUSTRIES, ...V2_INDUSTRIES];

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
    <div className="space-y-4">
      {/* ──────── V1 — 작동 가능 ──────── */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          지금 분석 가능
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(null)}
            className={btnClass(value == null)}
          >
            선택 안 함
          </button>
          {V1_INDUSTRIES.map((opt) => {
            const locked = opt.pro_only && !isPro;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleClick(opt)}
                title={
                  locked ? "Pro 티어 전용 — 클릭해서 안내 보기" : ""
                }
                className={
                  btnClass(value === opt.id) + (locked ? " opacity-60" : "")
                }
              >
                {opt.label}
                {opt.pro_only && (
                  <span className="ml-1 text-[10px] font-bold text-boopick-orange">
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ──────── V2 — 준비중 (의뢰 빈도순) ──────── */}
      <div>
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          V2 추가 예정 · 의뢰 빈도순
        </div>
        <div className="flex flex-wrap gap-2">
          {V2_INDUSTRIES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt)}
              title="V2에 추가 예정 — 클릭해서 안내 보기"
              className={btnClass(false) + " opacity-50"}
            >
              {opt.label}
              <span className="ml-1 text-[10px] text-slate-400">(준비중)</span>
            </button>
          ))}
        </div>
      </div>

      {/* 인라인 안내 (Pro전용+basic유저) */}
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
