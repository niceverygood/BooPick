import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/query-parser";
import { rankListings, type ListingRow } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/search
//   body: { query: string, dataset_id?: string, industry?: string }
//   returns: { parsed, results, count }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const query = body.query;
  const datasetId =
    typeof body.dataset_id === "string" ? body.dataset_id : null;
  const industry =
    typeof body.industry === "string" ? body.industry : null;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "조건을 한 줄로 입력해주세요" },
      { status: 400 }
    );
  }

  // 1. 자연어 → 구조화
  const { parsed } = await parseQuery(query.trim());

  // 2. listings 조회 (정형 필터)
  let q = supabase
    .from("listings")
    .select(
      "id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 보증금, 월세, 현재업종, 추천업종, 설명, 사용승인일"
    )
    .limit(500);

  if (datasetId) q = q.eq("dataset_id", datasetId);
  if (parsed.지역) q = q.ilike("지역", `%${parsed.지역}%`);
  if (parsed.공급_m2_min != null) q = q.gte("공급_m2", parsed.공급_m2_min);
  if (parsed.공급_m2_max != null) q = q.lte("공급_m2", parsed.공급_m2_max);
  if (parsed.공급_평_min != null)
    q = q.gte("공급_m2", parsed.공급_평_min * 3.3058);
  if (parsed.공급_평_max != null)
    q = q.lte("공급_m2", parsed.공급_평_max * 3.3058);
  if (parsed.보증금_max != null) q = q.lte("보증금", parsed.보증금_max);
  if (parsed.월세_max != null) q = q.lte("월세", parsed.월세_max);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "검색 실패", detail: error.message },
      { status: 500 }
    );
  }

  // 3. 스코어링 + 랭킹
  const ranked = rankListings(
    (rows ?? []) as unknown as ListingRow[],
    parsed,
    industry,
    20
  );

  return NextResponse.json({
    parsed,
    industry,
    results: ranked,
    count: ranked.length,
  });
}
