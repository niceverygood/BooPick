"use client";

// 신규 사장님 온보딩 체크리스트 카드
//
// 부픽 핵심 동선 3단계의 완료 상태를 실제 데이터 기반으로 표시:
//   ① 매물 데이터 업로드   (hasDataset)
//   ② 의뢰 조건으로 검색    (hasReport)
//   ③ PDF 리포트 받기       (hasPdf)
//
// - 진행률 바 + 완료 단계 체크
// - 3단계 전부 완료 → 자동 숨김
// - 수동 "닫기" → localStorage 에 기억 (재노출 안 함)

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  hasDataset: boolean;
  hasReport: boolean;
  hasPdf: boolean;
}

const DISMISS_KEY = "boopick_onboarding_dismissed";

interface Step {
  key: string;
  done: boolean;
  title: string;
  desc: string;
  href: string;
  cta: string;
}

export function OnboardingChecklist({ hasDataset, hasReport, hasPdf }: Props) {
  const [dismissed, setDismissed] = useState(true); // 초기엔 숨김 → mount 후 판단 (깜빡임 방지)

  useEffect(() => {
    const isDismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(isDismissed);
  }, []);

  const steps: Step[] = [
    {
      key: "upload",
      done: hasDataset,
      title: "매물 데이터 업로드",
      desc: "보유한 매물 엑셀(xlsx) 한 장을 올리면 컬럼을 자동 정리합니다.",
      href: "/dashboard/upload",
      cta: "업로드하기",
    },
    {
      key: "search",
      done: hasReport,
      title: "의뢰 조건으로 검색",
      desc: '"강남에 30평 이상, 보증금 1억 이하" 처럼 평소 말투로 입력하세요.',
      href: "/dashboard/search",
      cta: "검색하기",
    },
    {
      key: "report",
      done: hasPdf,
      title: "PDF 리포트 받기",
      desc: "적합도 점수와 분석 사유가 담긴 리포트를 의뢰자 제안에 활용하세요.",
      href: "/dashboard/reports",
      cta: "리포트 보기",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const allDone = doneCount === steps.length;

  // 전부 완료했거나 사용자가 닫았으면 노출 안 함
  if (dismissed || allDone) return null;

  // 다음에 할 단계 (첫 미완료)
  const nextKey = steps.find((s) => !s.done)?.key;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="rounded-2xl border border-brand-orange-200 bg-gradient-to-br from-cream-50 to-brand-orange-50/40 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-orange-600 uppercase tracking-wider">
              시작하기
            </span>
            <span className="num text-xs font-semibold text-slate-500">
              {doneCount} / {steps.length} 완료
            </span>
          </div>
          <h2 className="mt-1 text-lg font-extrabold text-navy-800">
            3단계로 첫 리포트를 만들어보세요
          </h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
          aria-label="온보딩 닫기"
        >
          닫기 ✕
        </button>
      </div>

      {/* 진행률 */}
      <div className="mt-3 h-2 bg-white/70 rounded-full overflow-hidden max-w-md">
        <div
          className="h-full bg-brand-orange-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 단계 */}
      <ol className="mt-5 space-y-2.5">
        {steps.map((s, i) => {
          const isNext = s.key === nextKey;
          return (
            <li
              key={s.key}
              className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition ${
                s.done
                  ? "border-[var(--safe-bd)] bg-[var(--safe-bg)]/50"
                  : isNext
                  ? "border-brand-orange-300 bg-white shadow-[var(--sh-sm)]"
                  : "border-slate-200 bg-white/60"
              }`}
            >
              {/* 번호/체크 */}
              <span
                className={`num w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  s.done
                    ? "bg-safe text-white"
                    : isNext
                    ? "bg-brand-orange-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-bold ${
                    s.done ? "text-slate-500 line-through" : "text-navy-800"
                  }`}
                >
                  {s.title}
                </p>
                {!s.done && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {s.desc}
                  </p>
                )}
              </div>

              {/* CTA / 완료 */}
              {s.done ? (
                <span className="text-xs font-semibold text-[#14532d] shrink-0">
                  완료
                </span>
              ) : (
                <Link
                  href={s.href}
                  className={`shrink-0 inline-flex items-center h-8 px-3 rounded-lg text-xs font-semibold transition ${
                    isNext
                      ? "bg-brand-orange-500 text-white hover:bg-brand-orange-600"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {s.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
