import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/query-parser";
import { rankListings, type ListingRow } from "@/lib/scoring";
import { generateReportPDF } from "@/lib/pdf-generator";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/generate-pdf
//   body: { query, dataset_id, industry }
//   returns: { report_id, pdf_url? }
//
//   1. 사용자 tier·월 사용량 확인 (basic 월 3건 제한)
//   2. 검색 + 랭킹
//   3. PDF 생성 → Supabase Storage 업로드 (또는 base64 inline 응답)
//   4. reports row 저장
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
    return NextResponse.json({ error: "조건 입력 필요" }, { status: 400 });
  }

  // 사용자 profile (tier + 사용량 체크)
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

  // 검색 + 랭킹
  const { parsed } = await parseQuery(query.trim());

  let q = supabase
    .from("listings")
    .select(
      "id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 보증금, 월세, 현재업종, 추천업종, 설명, 사용승인일"
    )
    .limit(500);
  if (datasetId) q = q.eq("dataset_id", datasetId);
  if (parsed.지역) q = q.ilike("지역", `%${parsed.지역}%`);
  if (parsed.공급_평_min != null)
    q = q.gte("공급_m2", parsed.공급_평_min * 3.3058);
  if (parsed.공급_평_max != null)
    q = q.lte("공급_m2", parsed.공급_평_max * 3.3058);
  if (parsed.보증금_max != null) q = q.lte("보증금", parsed.보증금_max);
  if (parsed.월세_max != null) q = q.lte("월세", parsed.월세_max);

  const { data: rows } = await q;
  const ranked = rankListings(
    (rows ?? []) as unknown as ListingRow[],
    parsed,
    industry,
    20
  );

  // PDF 생성 — 환경에 따라 실패 가능 (Vercel serverless)
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generateReportPDF({
      title: `${industry ?? "매물"} 분석 리포트`,
      query: query.trim(),
      industry,
      listings: ranked,
      generatedAt: new Date(),
    });

    // Supabase Storage 업로드 (bucket: reports — 사용자가 직접 생성 필요)
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
      query_raw: query.trim(),
      query_parsed: parsed,
      industry,
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

  // 사용량 증가
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
