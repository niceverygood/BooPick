import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery, EMPTY_PARSED, type ParsedQuery } from "@/lib/query-parser";
import { rankListings, type ListingRow } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/search
//   body: {
//     dataset_id: string,
//     industry?: string,
//     parsed?: ParsedQuery,    // 이미 검토 끝난 조건
//     query?: string,          // 또는 자유 텍스트(서버에서 파싱)
//   }
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

  const datasetId =
    typeof body.dataset_id === "string" ? body.dataset_id : null;
  const industry =
    typeof body.industry === "string" ? body.industry : null;

  if (!datasetId) {
    return NextResponse.json(
      { error: "데이터셋을 선택하세요" },
      { status: 400 }
    );
  }

  // parsed 또는 query 둘 중 하나는 있어야
  let parsed: ParsedQuery;
  if (body.parsed && typeof body.parsed === "object") {
    parsed = mergeWithEmpty(body.parsed as Partial<ParsedQuery>);
  } else if (typeof body.query === "string" && body.query.trim().length > 0) {
    const result = await parseQuery(body.query.trim());
    parsed = result.parsed;
  } else {
    return NextResponse.json(
      { error: "조건(parsed) 또는 쿼리(query)가 필요합니다" },
      { status: 400 }
    );
  }

  // listings 조회 — DB에서 거를 수 있는 건 확실한 범위만 (오탐 줄이려고 conservative)
  let q = supabase
    .from("listings")
    .select(
      "id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 전체층, 보증금, 월세, 관리비, 현재업종, 추천업종, 간략설명, 설명, 주소, 사용승인일"
    )
    .eq("dataset_id", datasetId)
    .limit(1000);

  // 면적은 DB에서 거를 수 있음 — generated 컬럼 공급_평 사용
  if (parsed.area_min_평 != null) q = q.gte("공급_평", parsed.area_min_평 * 0.85);
  if (parsed.area_max_평 != null) q = q.lte("공급_평", parsed.area_max_평 * 1.15);
  // 보증금: 억 → 원
  if (parsed.deposit_max_억 != null)
    q = q.lte("보증금", parsed.deposit_max_억 * 100_000_000);
  // 월세 단독 max만 있을 때 (월관 합은 JS에서 처리)
  if (
    parsed.rent_max_월세_만원 != null &&
    parsed.rent_max_total_만원 == null
  ) {
    q = q.lte("월세", parsed.rent_max_월세_만원 * 10_000);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "검색 실패", detail: error.message },
      { status: 500 }
    );
  }

  let listings = (rows ?? []) as unknown as ListingRow[];

  // JS-side 필터 (SQL로 풀기 어려운 것들)
  // 1. 지역 (regions/exclude_regions: 부분 매칭, 한글)
  if (parsed.regions.length > 0) {
    listings = listings.filter((l) =>
      l.지역
        ? parsed.regions.some((r) => l.지역!.includes(r))
        : false
    );
  }
  if (parsed.exclude_regions.length > 0) {
    listings = listings.filter((l) =>
      l.지역
        ? !parsed.exclude_regions.some((r) => l.지역!.includes(r))
        : true
    );
  }

  // 2. 월관 합 (월세 + 관리비)
  if (parsed.rent_max_total_만원 != null) {
    const maxKrw = parsed.rent_max_total_만원 * 10_000;
    listings = listings.filter((l) => {
      const total = (l.월세 ?? 0) + (l.관리비 ?? 0);
      return total === 0 || total <= maxKrw;
    });
  }

  // 3. 연식 (max_age_year, min_year)
  if (parsed.max_age_year != null || parsed.min_year != null) {
    const now = new Date().getFullYear();
    listings = listings.filter((l) => {
      if (!l.사용승인일) return true; // unknown 통과
      const y = new Date(l.사용승인일).getFullYear();
      if (parsed.max_age_year != null && now - y > parsed.max_age_year)
        return false;
      if (parsed.min_year != null && y < parsed.min_year) return false;
      return true;
    });
  }

  // 4. 스코어링 + 랭킹
  const ranked = rankListings(listings, parsed, industry, 30);

  return NextResponse.json({
    parsed,
    industry,
    results: ranked,
    count: ranked.length,
    candidates_total: listings.length,
  });
}

function mergeWithEmpty(p: Partial<ParsedQuery>): ParsedQuery {
  return {
    ...EMPTY_PARSED,
    ...p,
    regions: Array.isArray(p.regions) ? p.regions : [],
    exclude_regions: Array.isArray(p.exclude_regions) ? p.exclude_regions : [],
    additional_notes: Array.isArray(p.additional_notes) ? p.additional_notes : [],
    area_연층_허용: p.area_연층_허용 === true,
    parking_required: p.parking_required === true,
  };
}
