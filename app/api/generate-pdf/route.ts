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
import { generateReportPDF } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/generate-pdf
//   body 1: { report_id }                     // 기존 리포트의 PDF 채우기 (권장)
//   body 2: { dataset_id, query | parsed, industry?, query_raw? }  // 새 분석 + PDF
//
//   1. report_id 있으면 → reports row에서 query_parsed/selected_listings 로드 → PDF만 생성
//   2. 없으면 새로 검색·랭킹 + reports insert + PDF 생성
//   3. tier·월 사용량 체크 (basic 월 3건, report_id 케이스에는 추가 차감 안 함)
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

  // tier 체크
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, reports_used_month")
    .eq("id", user.id)
    .maybeSingle();
  const tier = (profile?.tier as string) ?? "basic";
  const used = (profile?.reports_used_month as number) ?? 0;

  // ───────── 분기 1: 기존 report_id PDF 채우기
  const reportIdInput =
    typeof body.report_id === "string" ? body.report_id : null;

  if (reportIdInput) {
    const { data: report } = await supabase
      .from("reports")
      .select(
        "id, user_id, dataset_id, query_raw, query_parsed, industry, selected_listings, pdf_url"
      )
      .eq("id", reportIdInput)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: "리포트가 없습니다" }, { status: 404 });
    }
    if ((report as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    if ((report as { pdf_url: string | null }).pdf_url) {
      return NextResponse.json({
        ok: true,
        report_id: report.id,
        pdf_url: (report as { pdf_url: string }).pdf_url,
        cached: true,
      });
    }

    // basic 월 3건 한도 (PDF 채우기는 차감 — 한도 신뢰도)
    if (tier === "basic" && used >= 3) {
      return NextResponse.json(
        {
          error:
            "베이직 플랜 월 3건 한도 초과. Pro로 업그레이드하면 무제한 사용 가능합니다.",
        },
        { status: 402 }
      );
    }

    // 매물 다시 fetch (selected_listings 기준)
    const ids = (report as { selected_listings: number[] | null })
      .selected_listings;
    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "선택된 매물이 없습니다" },
        { status: 400 }
      );
    }
    const { data: rows } = await supabase
      .from("listings")
      .select(
        "id, article_no, dataset_id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 전체층, 보증금, 월세, 관리비, 현재업종, 추천업종, 간략설명, 설명, 주소, 사용승인일, 중개사무소명"
      )
      .in("id", ids);

    const parsed = mergeWithEmpty(
      ((report as { query_parsed: Partial<ParsedQuery> | null })
        .query_parsed ?? {}) as Partial<ParsedQuery>
    );
    const industry = (report as { industry: string | null }).industry;
    const ranked = rankListings(
      (rows ?? []) as unknown as ListingRow[],
      parsed,
      industry,
      5
    );

    const pdfUrl = await renderAndUpload(
      supabase,
      user.id,
      ranked,
      parsed,
      industry,
      (report as { query_raw: string }).query_raw
    );

    if (pdfUrl) {
      await supabase
        .from("reports")
        .update({ pdf_url: pdfUrl })
        .eq("id", report.id);
    }

    if (tier === "basic") {
      await supabase
        .from("profiles")
        .update({ reports_used_month: used + 1 })
        .eq("id", user.id);
    }

    return NextResponse.json({
      ok: true,
      report_id: report.id,
      pdf_url: pdfUrl,
      count: ranked.length,
    });
  }

  // ───────── 분기 2: 처음부터 (legacy)
  const datasetId =
    typeof body.dataset_id === "string" ? body.dataset_id : null;
  const industry =
    typeof body.industry === "string" ? body.industry : null;
  const queryRaw =
    typeof body.query_raw === "string"
      ? body.query_raw.trim()
      : typeof body.query === "string"
      ? (body.query as string).trim()
      : "";

  if (!datasetId) {
    return NextResponse.json({ error: "데이터셋 필요" }, { status: 400 });
  }
  if (tier === "basic" && used >= 3) {
    return NextResponse.json(
      {
        error:
          "베이직 플랜 월 3건 한도 초과. Pro로 업그레이드하면 무제한 사용 가능합니다.",
      },
      { status: 402 }
    );
  }

  let parsed: ParsedQuery;
  if (body.query && typeof body.query === "object") {
    parsed = mergeWithEmpty(body.query as Partial<ParsedQuery>);
  } else if (body.parsed && typeof body.parsed === "object") {
    parsed = mergeWithEmpty(body.parsed as Partial<ParsedQuery>);
  } else if (queryRaw.length > 0) {
    const r = await parseQuery(queryRaw);
    parsed = r.parsed;
  } else {
    return NextResponse.json(
      { error: "조건(query: ParsedQuery)이 필요합니다" },
      { status: 400 }
    );
  }

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
  if (f.min_year != null) q = q.gte("사용승인일", `${f.min_year}-01-01`);

  const { data: rows } = await q;
  const candidates = postFilter(
    (rows ?? []) as unknown as ListingRow[],
    parsed
  );
  const ranked = rankListings(candidates, parsed, industry, 5);

  const pdfUrl = await renderAndUpload(
    supabase,
    user.id,
    ranked,
    parsed,
    industry,
    queryRaw
  );

  const { data: report, error: rErr } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      dataset_id: datasetId,
      query_raw: queryRaw || "",
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
  });
}

// ============================================================
// Helpers

type AnySupabase = ReturnType<typeof createClient>;

async function renderAndUpload(
  supabase: AnySupabase,
  userId: string,
  ranked: ReturnType<typeof rankListings>,
  parsed: ParsedQuery,
  industry: string | null,
  queryRaw: string
): Promise<string | null> {
  try {
    const buf = await generateReportPDF({
      title: `${industry ?? parsed.industry ?? "매물"} 분석 리포트`,
      query: queryRaw || "(자동 생성)",
      industry: industry ?? parsed.industry,
      listings: ranked,
      generatedAt: new Date(),
    });

    const path = `${userId}/${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("reports")
      .upload(path, buf, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (upErr) {
      console.error("[pdf] storage upload error:", upErr.message);
      return null;
    }
    const { data } = supabase.storage.from("reports").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("[pdf] generation error:", e);
    return null;
  }
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
