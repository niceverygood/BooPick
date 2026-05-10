"use client";

// Pro 베타 신청 모달
//
// 사용 흐름:
//   1. 베이직 사용자가 [Pro 업그레이드] 버튼 클릭
//   2. 모달 열림 → 소속/업력/현재 사용 도구/사용 케이스 입력
//   3. /api/pro-beta-request POST → 한대표가 24시간 내 수동 승격
//   4. 성공 메시지 + 닫기

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase = "form" | "submitting" | "done" | "error";

export function ProBetaModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [company, setCompany] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [currentTools, setCurrentTools] = useState("");
  const [useCase, setUseCase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/pro-beta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim() || null,
          experience_years: experienceYears.trim()
            ? Number(experienceYears.trim())
            : null,
          current_tools: currentTools.trim() || null,
          use_case: useCase.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "신청 실패");
        setPhase("error");
        return;
      }
      setSuccessMsg(
        data.message ?? "신청이 접수되었습니다. 24시간 내 안내드립니다."
      );
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청 실패");
      setPhase("error");
    }
  }

  function handleClose() {
    onClose();
    // 모달 닫힌 후 리셋 — 다시 열면 깨끗한 폼
    setTimeout(() => {
      setPhase("form");
      setError(null);
      setSuccessMsg(null);
    }, 300);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-boopick-navy">
                Pro 베타 신청
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                정식 가격은 49,000원/월. 베타 기간은 무료.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-700 text-xl"
              aria-label="닫기"
            >
              ×
            </button>
          </div>

          {phase === "done" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-md">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-boopick-navy">
                    신청 완료
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{successMsg}</p>
                </div>
              </div>
              <Button onClick={handleClose} className="w-full">
                닫기
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="company" className="text-sm">
                  소속
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="예: (주)부픽 부동산"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="experience" className="text-sm">
                  업력 (년)
                </Label>
                <Input
                  id="experience"
                  type="number"
                  min={0}
                  max={60}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="예: 10"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tools" className="text-sm">
                  현재 사용 도구
                </Label>
                <Input
                  id="tools"
                  value={currentTools}
                  onChange={(e) => setCurrentTools(e.target.value)}
                  placeholder="예: 엑셀, 네이버부동산, 디스코"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="useCase" className="text-sm">
                  주로 다루시는 매물 / 의뢰 유형
                </Label>
                <textarea
                  id="useCase"
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  rows={3}
                  placeholder="예: 강남권 사옥 매물 위주. 결혼정보회사·법무법인 의뢰 잦음"
                  className="mt-1 w-full p-2.5 rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange text-sm resize-y"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={phase === "submitting"}
                className="w-full bg-boopick-orange hover:bg-boopick-orange/90 text-white h-11"
              >
                {phase === "submitting" ? "신청 중…" : "Pro 베타 신청하기"}
              </Button>

              <p className="text-xs text-center text-slate-500">
                한대표가 24시간 내 검토 후 이메일로 안내드립니다.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
