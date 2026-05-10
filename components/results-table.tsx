"use client";

// V3 Phase 3 — 매물 비교표 + 적합도 점수 breakdown
//
// 기능:
//   1. 압축 비교표 (top 5 한 눈에)
//   2. 매물별 점수 + 6차원 breakdown accordion
//   3. Pro 티어: 매물 카드 클릭 → 네이버부동산 새 탭
//      Basic 티어: 클릭 비활성 + "Pro 업그레이드" 툴팁

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScoreBreakdownItem {
  score: number;
  max: number;
  reason: string;
  level: "⭐" | "✅" | "△" | "✕";
}
interface Breakdown {
  면적: ScoreBreakdownItem;
  임대료: ScoreBreakdownItem;
  연식: ScoreBreakdownItem;
  주차: ScoreBreakdownItem;
  업종: ScoreBreakdownItem;
  기타: ScoreBreakdownItem;
}

export interface ResultRow {
  id: number;
  article_no?: string | null;
  지역: string | null;
  공급_평: number | null;
  해당층: string | null;
  보증금: number | null;
  월세: number | null;
  관리비: number | null;
  추천업종: string | null;
  간략설명: string | null;
  사용승인일: string | null;
  parking_count: number | null;
  score: number;          // 0-100
  breakdown: Breakdown;
  reasons?: string[];
}

interface Props {
  results: ResultRow[];
  totalFiltered: number;
  datasetTotal: number;
  isPro: boolean;
}

export function ResultsTable({
  results,
  totalFiltered,
  datasetTotal,
  isPro,
}: Props) {
  return (
    <div className="space-y-4">
      {/* 헤더 — 매칭 통계 */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-boopick-navy">
                검색 결과: {results.length}건
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {datasetTotal > 0 ? `${datasetTotal.toLocaleString()}건 중 ` : ""}
                조건 부합 {totalFiltered.toLocaleString()}건 → 상위{" "}
                {results.length}건
              </p>
            </div>
            {!isPro && results.length > 0 && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]"
              >
                💡 Pro 업그레이드 시 매물 직접 확인 가능
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 압축 비교표 */}
      {results.length > 0 && <ComparisonTable rows={results} />}

      {/* 매물별 카드 + breakdown */}
      <div className="space-y-3">
        {results.map((r, i) => (
          <ListingCard key={r.id} rank={i + 1} row={r} isPro={isPro} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Compact comparison table

function ComparisonTable({ rows }: { rows: ResultRow[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-3 w-10">#</th>
                <th className="text-right py-2 px-3">면적</th>
                <th className="text-center py-2 px-3">층</th>
                <th className="text-right py-2 px-3">월관 합</th>
                <th className="text-center py-2 px-3">주차</th>
                <th className="text-center py-2 px-3">준공</th>
                <th className="text-right py-2 px-3">점수</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                >
                  <td className="py-2 px-3 text-slate-400">#{i + 1}</td>
                  <td className="py-2 px-3 text-right font-semibold text-boopick-navy">
                    {r.공급_평?.toFixed(0) ?? "—"}평
                  </td>
                  <td className="py-2 px-3 text-center">{r.해당층 ?? "—"}층</td>
                  <td className="py-2 px-3 text-right">
                    {formatMonthly(r)}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {r.parking_count != null
                      ? `자주${r.parking_count}`
                      : "—"}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600">
                    {formatYearMonth(r.사용승인일)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <ScoreBadge score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Listing card with score breakdown accordion

function ListingCard({
  rank,
  row,
  isPro,
}: {
  rank: number;
  row: ResultRow;
  isPro: boolean;
}) {
  const [open, setOpen] = useState(rank <= 2); // 1·2위 기본 펼침
  const naverUrl = row.article_no
    ? `https://m.land.naver.com/article/info/${row.article_no}`
    : null;

  function handleCardClick(e: React.MouseEvent) {
    if (!isPro || !naverUrl) {
      e.preventDefault();
      return;
    }
    window.open(naverUrl, "_blank", "noopener");
  }

  return (
    <Card
      className={
        "overflow-hidden transition-shadow " +
        (isPro && naverUrl ? "hover:shadow-md cursor-pointer" : "")
      }
    >
      <CardContent className="p-0">
        {/* 헤더 */}
        <div
          className="p-4 sm:p-5 flex items-start justify-between gap-3 flex-wrap border-b border-slate-100"
          onClick={handleCardClick}
          title={
            isPro
              ? naverUrl
                ? "클릭 시 네이버부동산 새 탭"
                : "매물번호 없음"
              : "Pro 업그레이드 시 매물 직접 확인 가능"
          }
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-400">
                #{rank}
              </span>
              <p className="text-sm font-bold text-boopick-navy line-clamp-1">
                {row.지역 ?? "—"} · {row.공급_평?.toFixed(1) ?? "—"}평 ·{" "}
                {row.해당층 ?? "—"}층
              </p>
              {row.article_no && (
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-normal"
                >
                  #{row.article_no}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {row.간략설명 ?? "—"}
            </p>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 mt-2">
              <span>월관 {formatMonthly(row)}</span>
              <span className="text-slate-300">·</span>
              <span>
                보증{" "}
                {row.보증금 ? formatKRW(row.보증금) : "—"}
              </span>
              <span className="text-slate-300">·</span>
              <span>준공 {formatYearMonth(row.사용승인일)}</span>
              {row.추천업종 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{row.추천업종}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <ScoreBadge score={row.score} large />
            <p className="text-[10px] text-slate-400 mt-1">/ 100점</p>
          </div>
        </div>

        {/* Breakdown toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="w-full py-2 text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-100 transition-colors"
        >
          {open ? "▴ 점수 근거 접기" : "▾ 점수 근거 보기"}
        </button>

        {open && (
          <div className="p-4 sm:p-5 bg-slate-50 space-y-1.5">
            <BreakdownRow
              label="면적"
              dim={row.breakdown.면적}
              first
            />
            <BreakdownRow label="임대료" dim={row.breakdown.임대료} />
            <BreakdownRow label="연식" dim={row.breakdown.연식} />
            <BreakdownRow label="주차" dim={row.breakdown.주차} />
            <BreakdownRow label="업종" dim={row.breakdown.업종} />
            <BreakdownRow label="기타" dim={row.breakdown.기타} last />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  dim,
  first,
  last,
}: {
  label: string;
  dim: ScoreBreakdownItem;
  first?: boolean;
  last?: boolean;
}) {
  const treeChar = first ? "├─" : last ? "└─" : "├─";
  return (
    <div className="flex items-start gap-2 text-xs font-mono text-slate-700">
      <span className="text-slate-300 shrink-0">{treeChar}</span>
      <span className="font-semibold text-boopick-navy w-12 shrink-0">
        {label}
      </span>
      <span className="text-slate-500 w-14 shrink-0 tabular-nums">
        ({dim.score}/{dim.max})
      </span>
      <span className="shrink-0">{dim.level}</span>
      <span className="text-slate-600 flex-1 break-keep">{dim.reason}</span>
    </div>
  );
}

// ============================================================
// Score badge

function ScoreBadge({
  score,
  large = false,
}: {
  score: number;
  large?: boolean;
}) {
  const tone =
    score >= 90
      ? "bg-boopick-green/10 text-boopick-green border-boopick-green/30"
      : score >= 70
      ? "bg-boopick-orange/10 text-boopick-orange border-boopick-orange/30"
      : score >= 50
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-500 border-slate-200";
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-md font-bold tabular-nums border " +
        tone +
        " " +
        (large ? "text-2xl px-3 py-1.5 min-w-16" : "text-sm px-2 py-0.5")
      }
    >
      {score}
    </span>
  );
}

// ============================================================
// Format helpers

function formatMonthly(r: ResultRow): string {
  const total = (r.월세 ?? 0) + (r.관리비 ?? 0);
  if (total === 0) return "—";
  return `${Math.round(total / 10_000).toLocaleString()}만`;
}

function formatKRW(n: number): string {
  if (n >= 100_000_000)
    return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000)
    return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

function formatYearMonth(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 7);
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}.${mm}`;
}
