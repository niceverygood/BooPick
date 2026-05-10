import { Card, CardContent } from "@/components/ui/card";
import { QueryInput } from "@/components/query-input";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface DatasetOption {
  id: string;
  name: string;
  row_count: number;
}

async function fetchData(): Promise<{
  datasets: DatasetOption[];
  isPro: boolean;
}> {
  try {
    const supabase = createClient();
    const [{ data: datasets }, { data: profile }] = await Promise.all([
      supabase
        .from("datasets")
        .select("id, name, row_count")
        .order("uploaded_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("tier").maybeSingle(),
    ]);
    return {
      datasets: (datasets as DatasetOption[] | null) ?? [],
      isPro: (profile as { tier?: string } | null)?.tier === "pro",
    };
  } catch {
    return { datasets: [], isPro: false };
  }
}

export default async function SearchPage() {
  const { datasets, isPro } = await fetchData();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          매물 분석
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          카톡으로 받은 의뢰 메시지를 붙여넣으면 AI가 조건으로 풀고, 데이터셋에서 매칭 매물을 찾아드립니다.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <QueryInput datasets={datasets} isPro={isPro} />
        </CardContent>
      </Card>
    </div>
  );
}
