import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/query-parser";
import {
  EMPTY_PARSED,
  type ParsedQuery,
} from "@/lib/parsed-query-types";
import {
  buildSearchFilter,
  postFilter,
  rankListings,
  type ListingRow,
} from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/search
//   body: {
//     dataset_id: string,
//     query: ParsedQuery,        // 검토 끝난 정형 조건 (Phase 3)
//     query_raw?: string,        // 원본 메시지 (reports 저장용)
//     industry?: string,
//   }
//   또는 (호환): { dataset_id, parsed: ParsedQuery, ... }
//   또는 (호환): { dataset_id, query: string }  // 자유 텍스트 server-side 파싱
//
//   returns: {
//     parsed,
//     industry,
//     results: ScoredListing[],   // top 5
//     count,                      // results.length
//     total_filtered,             // post-filter 통과 수
//     dataset_total,              // 데이터셋 전체 row 수
//     report_id,                  // reports row (pdf_url null, Phase 4에서 채움)
//   }
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
  const queryRaw =
    typeof body.query_raw === "string" ? body.query_raw : "";

  if (!datasetId) {
    return NextResponse.json(
      { error: "데이터셋을 선택하세요" },
      { status: 400 }
    );
  }

  // 데이터셋 소유권 검증 (RLS이지만 명시적으로)
  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, user_id, row_count")
    .eq("id", datasetId)
    .maybeSingle();

  if (!dataset) {
    return NextResponse.json({ error: "데이터셋이 없습니다" }, { status: 404 });
  }
  if ((dataset as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const datasetTotal = (dataset as { row_count: number }).row_count ?? 0;

  // parsed / query 결정
  let parsed: ParsedQuery;
  if (body.query && typeof body.query === "object") {
    parsed = mergeWithEmpty(body.query as Partial<ParsedQuery>);
  } else if (body.parsed && typeof body.parsed === "object") {
    parsed = mergeWithEmpty(body.parsed as Partial<ParsedQuery>);
  } else if (typeof body.query === "string" && body.query.trim().length > 0) {
    const r = await parseQuery(body.query.trim());
    parsed = r.parsed;
  } else {
    return NextResponse.json(
      { error: "조건(query: ParsedQuery)이 필요합니다" },
      { status: 400 }
    );
  }

  // SQL pre-filter
  const f = buildSearchFilter(parsed);

  let q = supabase
    .from("listings")
    .select(
      "id, article_no, dataset_id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 전체층, 보증금, 월세, 관리비, 현재업종, 추천업종, 간략설명, 설명, 주소, 사용승인일, 중개사무소명"
    )
    .eq("dataset_id", datasetId)
    .limit(500);

  if (f.area_min_m2 != null) q = q.gte("공급_m2", f.area_min_m2);
  if (f.area_max_m2 != null) q = q.lte("공급_m2", f.area_max_m2);
  if (f.deposit_max_krw != null) q = q.lte("보증금", f.deposit_max_krw);
  if (f.rent_max_월세_krw != null) q = q.lte("월세", f.rent_max_월세_krw);
  if (f.min_year != null) {
    q = q.gte("사용승인일", `${f.min_year}-01-01`);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json(
      { error: "검색 실패", detail: error.message },
      { status: 500 }
    );
  }

  // JS-side 후처리 (지역/제외 지역/월관 합)
  const candidates = postFilter(
    (rows ?? []) as unknown as ListingRow[],
    parsed
  );

  const ranked = rankListings(candidates, parsed, industry, 5);

  // tier (reports에 저장용)
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  const tier = (profile as { tier?: string } | null)?.tier ?? "basic";

  // reports row 생성 — pdf_url은 Phase 4에서 채움
  const { data: report, error: rErr } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      dataset_id: datasetId,
      query_raw: queryRaw || formatParsedAsQuery(parsed),
      query_parsed: parsed,
      industry: industry ?? parsed.industry,
      selected_listings: ranked.map((r) => r.id),
      pdf_url: null,
      tier_used: tier,
    })
    .select("id")
    .single();

  if (rErr || !report) {
    // 저장 실패해도 결과는 반환 (UI 동작 우선)
    console.error("[search] reports insert error:", rErr);
  }

  return NextResponse.json({
    parsed,
    industry,
    results: ranked,
    count: ranked.length,
    total_filtered: candidates.length,
    candidates_total: candidates.length, // 호환
    dataset_total: datasetTotal,
    report_id: (report as { id: string } | null)?.id ?? null,
  });
}

function mergeWithEmpty(p: Partial<ParsedQuery>): ParsedQuery {
  return {
    ...EMPTY_PARSED,
    ...p,
    regions: Array.isArray(p.regions) ? p.regions : [],
    exclude_regions: Array.isArray(p.exclude_regions) ? p.exclude_regions : [],
    additional_notes: Array.isArray(p.additional_notes)
      ? p.additional_notes
      : [],
    area_연층_허용: p.area_연층_허용 === true,
    parking_required: p.parking_required === true,
  };
}

function formatParsedAsQuery(p: ParsedQuery): string {
  const parts: string[] = [];
  if (p.industry) parts.push(p.industry);
  if (p.regions.length) parts.push(p.regions.join(" "));
  if (p.exclude_regions.length)
    parts.push(`(${p.exclude_regions.map((r) => `${r}X`).join(" ")})`);
  if (p.area_min_평 != null || p.area_max_평 != null) {
    parts.push(
      `${p.area_min_평 ?? ""}-${p.area_max_평 ?? ""}평${
        p.area_연층_허용 ? " 연층OK" : ""
      }`
    );
  }
  if (p.rent_max_total_만원 != null)
    parts.push(`월관 ${p.rent_max_total_만원}만`);
  else if (p.rent_max_월세_만원 != null)
    parts.push(`월세 ${p.rent_max_월세_만원}만`);
  if (p.deposit_max_억 != null) parts.push(`보증금 ${p.deposit_max_억}억`);
  if (p.employee_count != null) parts.push(`직원 ${p.employee_count}명`);
  if (p.max_age_year != null) parts.push(`${p.max_age_year}년 이내`);
  if (p.move_in_month) parts.push(`입주 ${p.move_in_month}`);
  if (p.parking_required) parts.push("주차 필수");
  if (p.additional_notes.length) parts.push(p.additional_notes.join(", "));
  return parts.join(" / ");
}
