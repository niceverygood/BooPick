"use client";

// V3 ParsedConditions — Claude가 파싱한 의뢰 조건을 사장님이 검토·수정하는 UI.
//
// 디자인 원칙:
//   - "한 줄 자유 텍스트 → 풍부 JSON" 흐름의 마지막 단계
//   - 모든 필드 인라인 수정 가능 (검색 전 마지막 검수)
//   - 빈 값/추가 필요한 값을 사장님이 즉시 보충

import { useState } from "react";
import type { ParsedQuery } from "@/lib/parsed-query-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  parsed: ParsedQuery;
  onChange: (next: ParsedQuery) => void;
}

export function ParsedConditions({ parsed, onChange }: Props) {
  function patch<K extends keyof ParsedQuery>(key: K, value: ParsedQuery[K]) {
    onChange({ ...parsed, [key]: value });
  }

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            AI 파싱 결과 — 검토하고 수정하세요
          </p>
        </div>

        {/* 업종 */}
        <Field label="업종">
          <input
            type="text"
            value={parsed.industry ?? ""}
            onChange={(e) =>
              patch("industry", e.target.value.trim() === "" ? null : e.target.value)
            }
            placeholder="예: 결혼정보회사, 카페, 사무실"
            className={inputClass}
          />
        </Field>

        {/* 지역 */}
        <Field label="지역">
          <TagInput
            value={parsed.regions}
            onChange={(v) => patch("regions", v)}
            placeholder="삼성역, 선릉역, 삼성동"
          />
        </Field>

        {/* 제외 지역 */}
        <Field label="제외 지역">
          <TagInput
            value={parsed.exclude_regions}
            onChange={(v) => patch("exclude_regions", v)}
            placeholder="청담동"
            tone="red"
          />
        </Field>

        {/* 면적 */}
        <Field label="면적 (평)">
          <div className="flex items-center gap-2">
            <NumInput
              value={parsed.area_min_평}
              onChange={(v) => patch("area_min_평", v)}
              placeholder="최소"
              suffix="평"
            />
            <span className="text-slate-400">~</span>
            <NumInput
              value={parsed.area_max_평}
              onChange={(v) => patch("area_max_평", v)}
              placeholder="최대"
              suffix="평"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
              <input
                type="checkbox"
                checked={parsed.area_연층_허용}
                onChange={(e) => patch("area_연층_허용", e.target.checked)}
                className="accent-boopick-orange"
              />
              연층 허용
            </label>
          </div>
        </Field>

        {/* 임대료 */}
        <Field label="임대료">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20">월관 합계</span>
              <NumInput
                value={parsed.rent_max_total_만원}
                onChange={(v) => patch("rent_max_total_만원", v)}
                placeholder="3000"
                suffix="만원/월"
              />
              <span className="text-xs text-slate-400">월세+관리비</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20">월세만</span>
              <NumInput
                value={parsed.rent_max_월세_만원}
                onChange={(v) => patch("rent_max_월세_만원", v)}
                placeholder="2500"
                suffix="만원/월"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-20">보증금</span>
              <NumInput
                value={parsed.deposit_max_억}
                onChange={(v) => patch("deposit_max_억", v)}
                placeholder="5"
                suffix="억"
              />
            </div>
          </div>
        </Field>

        {/* 직원 / 연식 / 입주 */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="직원 수">
            <NumInput
              value={parsed.employee_count}
              onChange={(v) => patch("employee_count", v)}
              placeholder="50"
              suffix="명"
            />
          </Field>
          <Field label="최대 연식">
            <NumInput
              value={parsed.max_age_year}
              onChange={(v) => patch("max_age_year", v)}
              placeholder="20"
              suffix="년 이내"
            />
          </Field>
          <Field label="최소 준공년도">
            <NumInput
              value={parsed.min_year}
              onChange={(v) => patch("min_year", v)}
              placeholder="2020"
              suffix="년 이후"
            />
          </Field>
        </div>

        {/* 입주 시기 / 주차 */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="입주 시기">
            <input
              type="month"
              value={parsed.move_in_month ?? ""}
              onChange={(e) =>
                patch(
                  "move_in_month",
                  e.target.value.trim() === "" ? null : e.target.value
                )
              }
              className={inputClass}
            />
          </Field>
          <Field label="주차">
            <label className="inline-flex items-center gap-2 text-sm h-10">
              <input
                type="checkbox"
                checked={parsed.parking_required}
                onChange={(e) => patch("parking_required", e.target.checked)}
                className="accent-boopick-orange"
              />
              주차 필수
            </label>
          </Field>
        </div>

        {/* 추가 요청 */}
        <Field label="추가 요청">
          <TagInput
            value={parsed.additional_notes}
            onChange={(v) => patch("additional_notes", v)}
            placeholder="상담실 15-20개, OA존 별도"
            tone="orange"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Sub-components

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "h-10 px-3 rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange w-full text-sm";

function NumInput({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        type="number"
        value={value == null ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(null);
          else {
            const n = Number(v);
            onChange(Number.isFinite(n) ? n : null);
          }
        }}
        placeholder={placeholder}
        className={inputClass + " min-w-0"}
      />
      {suffix && (
        <span className="text-xs text-slate-500 shrink-0">{suffix}</span>
      )}
    </div>
  );
}

function TagInput({
  value,
  onChange,
  placeholder,
  tone = "default",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: "default" | "red" | "orange";
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const t = draft.trim();
    if (t === "") return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  const badgeColor =
    tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "orange"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
        {value.length === 0 && (
          <span className="text-xs text-slate-400">없음</span>
        )}
        {value.map((tag, i) => (
          <Badge
            key={`${tag}-${i}`}
            variant="outline"
            className={`${badgeColor} gap-1`}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-1 hover:text-red-600"
              aria-label={`remove ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass + " flex-1"}
        />
        <Button
          type="button"
          onClick={add}
          variant="outline"
          size="sm"
          className="h-10 px-3 text-xs"
        >
          + 추가
        </Button>
      </div>
    </div>
  );
}
