import { Card, CardContent } from "@/components/ui/card";
import { QueryInput } from "@/components/query-input";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          매물 분석
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          조건을 한 줄로 입력하면 매칭 매물 + 점수를 분석합니다.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <QueryInput />
        </CardContent>
      </Card>
    </div>
  );
}
