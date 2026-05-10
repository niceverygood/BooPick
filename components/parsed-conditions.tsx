import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  parsed: unknown;
}

export function ParsedConditions({ parsed }: Props) {
  const p = parsed as Record<string, unknown>;
  const items: Array<{ label: string; value: string }> = [];
  if (p.지역) items.push({ label: "지역", value: String(p.지역) });
  if (p.industry) items.push({ label: "업종", value: String(p.industry) });
  if (p.공급_평_min)
    items.push({ label: "최소 면적", value: `${p.공급_평_min}평` });
  if (p.공급_평_max)
    items.push({ label: "최대 면적", value: `${p.공급_평_max}평` });
  if (p.보증금_max)
    items.push({
      label: "보증금 ≤",
      value: formatKRW(Number(p.보증금_max)),
    });
  if (p.월세_max)
    items.push({ label: "월세 ≤", value: formatKRW(Number(p.월세_max)) });
  if (Array.isArray(p.조건) && p.조건.length > 0) {
    items.push({ label: "조건", value: p.조건.join(", ") });
  }

  if (items.length === 0) return null;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          AI 파싱 결과
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map((it, i) => (
            <Badge key={i} variant="outline" className="gap-1">
              <span className="text-slate-500">{it.label}:</span>
              <strong className="text-boopick-navy">{it.value}</strong>
            </Badge>
          ))}
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
