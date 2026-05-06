import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/search/parse-query";
import { createEmbedding } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/tenant/search
//   body: { query: string, anon_token?: string, utm?: {source, medium, campaign},
//           filters?: { dong, building_type, transaction_type, deposit_max,
//                       monthly_rent_max, area_pyeong_min, area_pyeong_max, industries }
//         }
//   returns: { results, count, parsed, response_time_ms }
//
//   - tenant_search_listings RPC 호출 (tenant_pool_enabled = true 매물만)
//   - tenant_searches 테이블에 로그 (anon_token으로)
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const query = body.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "검색어를 입력해주세요" }, { status: 400 });
  }

  const trimmed = query.trim();
  const anonToken = typeof body.anon_token === "string" ? body.anon_token : null;
  const userFilters = (body.filters ?? {}) as Record<string, unknown>;
  const utm = (body.utm ?? {}) as Record<string, unknown>;
  const t0 = Date.now();

  // 1. 파싱 + 임베딩
  let parsedResult, embedding;
  try {
    [parsedResult, embedding] = await Promise.all([
      parseQuery({ query: trimmed }),
      createEmbedding(trimmed),
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error: "AI 호출 실패",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const parsed = parsedResult.parsed;

  // 2. 필터 병합 (사용자 명시 필터 > AI 파싱 결과)
  const dong = pickStr(userFilters.dong) ?? parsed.region.dong ?? null;
  const buildingType = pickStr(userFilters.building_type) ?? parsed.building_type;
  const transactionType =
    pickStr(userFilters.transaction_type) ?? parsed.transaction_type;
  const depositMax =
    pickNum(userFilters.deposit_max) ?? parsed.deposit.max ?? null;
  const monthlyRentMax =
    pickNum(userFilters.monthly_rent_max) ?? parsed.monthly_rent.max ?? null;
  const areaMin = pickNum(userFilters.area_pyeong_min) ?? parsed.area_pyeong.min;
  const areaMax = pickNum(userFilters.area_pyeong_max) ?? parsed.area_pyeong.max;
  const industries =
    pickStrArr(userFilters.industries) ??
    (parsed.industries.length > 0 ? parsed.industries : null);

  // 3. RPC 호출
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: "DB 연결 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const { data, error } = await admin.rpc("tenant_search_listings", {
    p_query_embedding: embedding,
    p_dong: dong,
    p_building_type: buildingType,
    p_transaction_type: transactionType,
    p_deposit_max: depositMax,
    p_monthly_rent_max: monthlyRentMax,
    p_area_pyeong_min: areaMin,
    p_area_pyeong_max: areaMax,
    p_industries: industries,
    p_limit: 12,
  });

  if (error) {
    return NextResponse.json(
      { error: "DB 검색 실패", detail: error.message },
      { status: 500 }
    );
  }

  const results = data ?? [];
  const responseTime = Date.now() - t0;

  // 4. tenant_searches 로그 (실패해도 응답엔 영향 없음)
  void admin
    .from("tenant_searches")
    .insert({
      anon_token: anonToken,
      query: trimmed,
      parsed_filters: {
        dong,
        building_type: buildingType,
        transaction_type: transactionType,
        deposit_max: depositMax,
        monthly_rent_max: monthlyRentMax,
        area_pyeong_min: areaMin,
        area_pyeong_max: areaMax,
        industries,
      },
      result_count: results.length,
      response_time_ms: responseTime,
      utm_source: pickStr(utm.source),
      utm_medium: pickStr(utm.medium),
      utm_campaign: pickStr(utm.campaign),
    })
    .then(() => {});

  return NextResponse.json({
    query: trimmed,
    parsed,
    results,
    count: results.length,
    response_time_ms: responseTime,
  });
}

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
}

function pickNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickStrArr(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const arr = v.filter((x): x is string => typeof x === "string" && x.length > 0);
  return arr.length > 0 ? arr : null;
}
