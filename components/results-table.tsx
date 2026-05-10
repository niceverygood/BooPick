import { Card, CardContent } from "@/components/ui/card";

interface Result {
  id: number;
  지역: string | null;
  공급_평: number | null;
  해당층: string | null;
  보증금: number | null;
  월세: number | null;
  추천업종: string | null;
  score: number;
  reasons: string[];
}

export function ResultsTable({ results }: { results: Result[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-3 w-10">#</th>
                <th className="text-left py-2 px-3">지역</th>
                <th className="text-right py-2 px-3">면적</th>
                <th className="text-right py-2 px-3">층</th>
                <th className="text-right py-2 px-3">보증금</th>
                <th className="text-right py-2 px-3">월세</th>
                <th className="text-left py-2 px-3">추천업종</th>
                <th className="text-right py-2 px-3">점수</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                >
                  <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                  <td className="py-2 px-3 font-semibold text-boopick-navy">
                    {r.지역 ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {r.공급_평?.toFixed(1) ?? "—"}평
                  </td>
                  <td className="py-2 px-3 text-right">{r.해당층 ?? "—"}</td>
                  <td className="py-2 px-3 text-right">
                    {r.보증금 ? formatKRW(r.보증금) : "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {r.월세 ? formatKRW(r.월세) : "—"}
                  </td>
                  <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                    {r.추천업종 ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <strong className="text-boopick-navy">
                      {(r.score * 100).toFixed(0)}
                    </strong>
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

function formatKRW(n: number): string {
  if (n >= 100_000_000)
    return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000)
    return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}
