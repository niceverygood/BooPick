"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  STANDARD_COLUMNS,
  type StandardColumn,
} from "@/lib/column-mappings";

interface Props {
  headers: string[];
  mapping: Record<string, StandardColumn | null>;
  onChange: (header: string, std: StandardColumn | null) => void;
  disabled?: boolean;
}

export function ColumnMapping({
  headers,
  mapping,
  onChange,
  disabled,
}: Props) {
  // 이미 매핑된 표준 컬럼 (중복 방지 표시용)
  const usedStdCols = new Set(
    Object.values(mapping).filter((v): v is StandardColumn => v !== null)
  );

  const totalMapped = headers.filter((h) => mapping[h]).length;
  const matchRate =
    headers.length > 0 ? (totalMapped / headers.length) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-boopick-navy">
              컬럼 매핑 검토
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              잘못 매핑된 컬럼은 드롭다운으로 수정해주세요.
            </p>
          </div>
          <Badge
            className={
              matchRate >= 80
                ? "bg-boopick-green text-white border-none hover:bg-boopick-green"
                : matchRate >= 50
                  ? "bg-amber-500 text-white border-none hover:bg-amber-500"
                  : "bg-red-500 text-white border-none hover:bg-red-500"
            }
          >
            {totalMapped}/{headers.length} ({matchRate.toFixed(0)}%)
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-3">엑셀 헤더</th>
                <th className="text-left py-2 px-3">부픽 표준 컬럼</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h, i) => {
                if (!h) return null;
                const current = mapping[h] ?? null;
                return (
                  <tr
                    key={`${h}-${i}`}
                    className="border-b border-slate-100 last:border-none"
                  >
                    <td className="py-2 px-3 font-semibold text-boopick-navy">
                      {h}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={current ?? ""}
                        onChange={(e) =>
                          onChange(
                            h,
                            (e.target.value as StandardColumn) || null
                          )
                        }
                        disabled={disabled}
                        className={
                          "h-8 px-2 rounded-md border text-sm bg-white " +
                          (current
                            ? "border-slate-200 text-boopick-navy"
                            : "border-amber-300 text-amber-700")
                        }
                      >
                        <option value="">— 매핑 안 함 —</option>
                        {STANDARD_COLUMNS.map((std) => {
                          const usedElsewhere =
                            usedStdCols.has(std) && current !== std;
                          return (
                            <option
                              key={std}
                              value={std}
                              disabled={usedElsewhere}
                            >
                              {std}
                              {usedElsewhere ? " (이미 매핑됨)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {matchRate < 50 && (
          <p className="mt-4 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
            ⚠️ 매핑된 컬럼이 50% 미만입니다. 엑셀 헤더가 표준과 많이 다르면
            수동 매핑을 권장합니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
