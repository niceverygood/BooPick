import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery, EMPTY_PARSED, type ParsedQuery } from "@/lib/query-parser";
import { rankListings, type ListingRow } from "@/lib/scoring";
import { generateReportPDF } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/generate-pdf
//   body: { dataset_id, parsed?, query?, industry? }
//
//   1. tier·월 사용량 체크 (basic 월 3건)
//   2. parsed 우선 사용, 없으면 query를 server에서 파싱
//   3. listings 조회 + 필터 + 랭킹
//   4. PDF 생성 → Storage 업로드 (실패 시 inline 응답)
//   5. reports row 저장 + 사용량 +1
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
    typeof body.query === "string" ? body.query.trim() : "";

  if (!datasetId) {
    return NextResponse.json({ error: "데이터셋 필요" }, { status: 400 });
  }

  // tier 체크
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, reports_used_month")
    .eq("id", user.id)
    .maybeSingle();

  const tier = (profile?.tier as string) ?? "basic";
  const used = (profile?.reports_used_month as number) ?? 0;

  if (tier === "basic" && used >= 3) {
    return NextResponse.json(
      {
        error:
          "베이직 플랜 월 3건 한도 초과. Pro로 업그레이드하면 무제한 사용 가능합니다.",
      },
      { status: 402 }
    );
  }

  // parsed / query 결정
  let parsed: ParsedQuery;
  if (body.parsed && typeof body.parsed === "object") {
    parsed = mergeWithEmpty(body.parsed as Partial<ParsedQuery>);
  } else if (queryRaw.length > 0) {
    const r = await parseQuery(queryRaw);
    parsed = r.parsed;
  } else {
    return NextResponse.json(
      { error: "조건(parsed) 또는 쿼리(query)가 필요합니다" },
      { status: 400 }
    );
  }

  // listings 조회
  let q = supabase
    .from("listings")
    .select(
      "id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 전체층, 보증금, 월세, 관리비, 현재업종, 추천업종, 간략설명, 설명, 주소, 사용승인일"
    )
    .eq("dataset_id", datasetId)
    .limit(1000);

  if (parsed.area_min_평 != null) q = q.gte("공급_평", parsed.area_min_평 * 0.85);
  if (parsed.area_max_평 != null) q = q.lte("공급_평", parsed.area_max_평 * 1.15);
  if (parsed.deposit_max_억 != null)
    q = q.lte("보증금", parsed.deposit_max_억 * 100_000_000);
  if (
    parsed.rent_max_월세_만원 != null &&
    parsed.rent_max_total_만원 == null
  ) {
    q = q.lte("월세", parsed.rent_max_월세_만원 * 10_000);
  }

  const { data: rows } = await q;
  let listings = (rows ?? []) as unknown as ListingRow[];

  if (parsed.regions.length > 0) {
    listings = listings.filter((l) =>
      l.지역 ? parsed.regions.some((r) => l.지역!.includes(r)) : false
    );
  }
  if (parsed.exclude_regions.length > 0) {
    listings = listings.filter((l) =>
      l.지역 ? !parsed.exclude_regions.some((r) => l.지역!.includes(r)) : true
    );
  }
  if (parsed.rent_max_total_만원 != null) {
    const maxKrw = parsed.rent_max_total_만원 * 10_000;
    listings = listings.filter((l) => {
      const total = (l.월세 ?? 0) + (l.관리비 ?? 0);
      return total === 0 || total <= maxKrw;
    });
  }
  if (parsed.max_age_year != null || parsed.min_year != null) {
    const now = new Date().getFullYear();
    listings = listings.filter((l) => {
      if (!l.사용승인일) return true;
      const y = new Date(l.사용승인일).getFullYear();
      if (parsed.max_age_year != null && now - y > parsed.max_age_year)
        return false;
      if (parsed.min_year != null && y < parsed.min_year) return false;
      return true;
    });
  }

  const ranked = rankListings(listings, parsed, industry, 30);

  // PDF 생성
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generateReportPDF({
      title: `${industry ?? parsed.industry ?? "매물"} 분석 리포트`,
      query: queryRaw || formatParsedAsQuery(parsed),
      industry: industry ?? parsed.industry,
      listings: ranked,
      generatedAt: new Date(),
    });

    const path = `${user.id}/${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("reports")
      .upload(path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (!upErr) {
      const { data } = supabase.storage.from("reports").getPublicUrl(path);
      pdfUrl = data.publicUrl;
    } else {
      console.error("[pdf] storage upload error:", upErr.message);
    }
  } catch (e) {
    console.error("[pdf] generation error:", e);
  }

  // reports insert
  const { data: report, error: rErr } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      dataset_id: datasetId,
      query_raw: queryRaw || formatParsedAsQuery(parsed),
      query_parsed: parsed,
      industry: industry ?? parsed.industry,
      selected_listings: ranked.map((r) => r.id),
      pdf_url: pdfUrl,
      tier_used: tier,
    })
    .select("id")
    .single();

  if (rErr || !report) {
    return NextResponse.json(
      { error: "리포트 저장 실패", detail: rErr?.message },
      { status: 500 }
    );
  }

  await supabase
    .from("profiles")
    .update({ reports_used_month: used + 1 })
    .eq("id", user.id);

  return NextResponse.json({
    ok: true,
    report_id: report.id,
    pdf_url: pdfUrl,
    count: ranked.length,
    parsed,
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

// query_raw가 비었을 때 fallback — parsed 조건을 한 줄로 합성
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
