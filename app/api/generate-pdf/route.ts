import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EMPTY_PARSED,
  type ParsedQuery,
} from "@/lib/parsed-query-types";
import {
  buildSearchFilter,
  postFilter,
  rankListings,
  type ListingRow,
  type ScoredListing,
} from "@/lib/scoring";
import { generatePDF, type Tier } from "@/lib/pdf-generator";
import { parseQuery } from "@/lib/query-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/generate-pdf
//   Phase 4 표준: { report_id }
//     → reports row의 query_parsed/selected_listings 사용
//     → PDF 생성 → reports/{user_id}/{report_id}.pdf 업로드
//     → signed URL (7일) 발급 후 반환
//
//   호환: { dataset_id, query|parsed, industry?, query_raw? }
//     → 처음부터 분석 + reports 신규 row 생성
//
// 응답: { ok, report_id, pdf_url, file_name, count, tier_used }
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

  // tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, reports_used_month, name")
    .eq("id", user.id)
    .maybeSingle();
  const tier: Tier =
    ((profile as { tier?: string } | null)?.tier as Tier) ?? "basic";
  const used = (profile as { reports_used_month?: number } | null)
    ?.reports_used_month ?? 0;
  const agentName =
    (profile as { name?: string } | null)?.name ?? user.email?.split("@")[0] ?? "공인중개사";

  // ───────── 분기 1: report_id 채우기
  const reportIdInput =
    typeof body.report_id === "string" ? body.report_id : null;

  if (reportIdInput) {
    const { data: report } = await supabase
      .from("reports")
      .select(
        "id, user_id, dataset_id, query_raw, query_parsed, industry, selected_listings, pdf_url, tier_used"
      )
      .eq("id", reportIdInput)
      .maybeSingle();

    if (!report)
      return NextResponse.json({ error: "리포트가 없습니다" }, { status: 404 });
    if ((report as { user_id: string }).user_id !== user.id)
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const r = report as {
      id: string;
      query_raw: string;
      query_parsed: Partial<ParsedQuery> | null;
      industry: string | null;
      selected_listings: number[] | null;
      pdf_url: string | null;
    };

    // 캐시: 이미 PDF 있으면 signed URL 재발급해서 반환 (한도 차감 X)
    if (r.pdf_url) {
      // 기존 path 추출
      const path = extractStoragePath(r.pdf_url, user.id);
      if (path) {
        const signed = await createSignedUrl(supabase, path);
        if (signed) {
          return NextResponse.json({
            ok: true,
            report_id: r.id,
            pdf_url: signed,
            file_name: buildFileName(r.industry, new Date()),
            cached: true,
          });
        }
      }
    }

    // 한도 체크 (basic만)
    if (tier === "basic" && used >= 3) {
      return NextResponse.json(
        {
          error:
            "베이직 플랜 월 3건 한도 초과. Pro로 업그레이드하면 무제한 사용 가능합니다.",
        },
        { status: 402 }
      );
    }

    if (!r.selected_listings || r.selected_listings.length === 0) {
      return NextResponse.json(
        { error: "선택된 매물이 없습니다" },
        { status: 400 }
      );
    }

    // listings fetch (selected_listings 순서 보존)
    const { data: rows } = await supabase
      .from("listings")
      .select(
        "id, article_no, dataset_id, 지역, 공급_m2, 전용_m2, 공급_평, 전용_평, 해당층, 전체층, 보증금, 월세, 관리비, 현재업종, 추천업종, 간략설명, 설명, 주소, 사용승인일, 중개사무소명"
      )
      .in("id", r.selected_listings);

    const parsed = mergeWithEmpty(r.query_parsed ?? {});
    const ordered = orderByIds(
      (rows ?? []) as unknown as ListingRow[],
      r.selected_listings
    );
    const ranked = rankListings(ordered, parsed, r.industry, 5);

    const result = await renderUploadAndSign({
      supabase,
      userId: user.id,
      reportId: r.id,
      tier,
      industry: r.industry,
      query: parsed,
      queryRaw: r.query_raw,
      listings: ranked,
      agentName,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, detail: result.detail },
        { status: 500 }
      );
    }

    // reports update + 사용량 증가 (basic만)
    await supabase
      .from("reports")
      .update({ pdf_url: result.publicPath, tier_used: tier })
      .eq("id", r.id);

    if (tier === "basic") {
      await supabase
        .from("profiles")
        .update({ reports_used_month: used + 1 })
        .eq("id", user.id);
    }

    return NextResponse.json({
      ok: true,
      report_id: r.id,
      pdf_url: result.signedUrl,
      file_name: buildFileName(r.industry, new Date()),
      tier_used: tier,
      count: ranked.length,
    });
  }

  // ───────── 분기 2: 새 분석 + PDF (호환)
  const datasetId =
    typeof body.dataset_id === "string" ? body.dataset_id : null;
  const industry =
    typeof body.industry === "string" ? body.industry : null;
  const queryRaw =
    typeof body.query_raw === "string"
      ? body.query_raw.trim()
      : "";

  if (!datasetId)
    return NextResponse.json({ error: "데이터셋 필요" }, { status: 400 });

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
      { error: "조건이 필요합니다" },
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

  // reports row 먼저 (id 확보)
  const { data: report, error: rErr } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      dataset_id: datasetId,
      query_raw: queryRaw || "",
      query_parsed: parsed,
      industry: industry ?? parsed.industry,
      selected_listings: ranked.map((r) => r.id),
      pdf_url: null,
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

  const result = await renderUploadAndSign({
    supabase,
    userId: user.id,
    reportId: report.id,
    tier,
    industry: industry ?? parsed.industry,
    query: parsed,
    queryRaw,
    listings: ranked,
    agentName,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status: 500 }
    );
  }

  await supabase
    .from("reports")
    .update({ pdf_url: result.publicPath })
    .eq("id", report.id);

  if (tier === "basic") {
    await supabase
      .from("profiles")
      .update({ reports_used_month: used + 1 })
      .eq("id", user.id);
  }

  return NextResponse.json({
    ok: true,
    report_id: report.id,
    pdf_url: result.signedUrl,
    file_name: buildFileName(industry, new Date()),
    tier_used: tier,
    count: ranked.length,
  });
}

// ============================================================
// Helpers

type AnySupabase = ReturnType<typeof createClient>;

interface RenderArgs {
  supabase: AnySupabase;
  userId: string;
  reportId: string;
  tier: Tier;
  industry: string | null;
  query: ParsedQuery;
  queryRaw: string;
  listings: ScoredListing[];
  agentName: string;
}

interface RenderResult {
  ok: boolean;
  signedUrl?: string;
  publicPath?: string;
  error?: string;
  detail?: string;
}

async function renderUploadAndSign(a: RenderArgs): Promise<RenderResult> {
  try {
    const buf = await generatePDF({
      title: buildPDFTitle(a.industry),
      date: new Date(),
      industry: a.industry,
      tier: a.tier,
      query: a.query,
      query_raw: a.queryRaw,
      listings: a.listings,
      agent_name: a.agentName,
    });

    const path = `${a.userId}/${a.reportId}.pdf`;
    const { error: upErr } = await a.supabase.storage
      .from("reports")
      .upload(path, buf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) {
      return { ok: false, error: "Storage 업로드 실패", detail: upErr.message };
    }

    const signed = await createSignedUrl(a.supabase, path);
    if (!signed) {
      return { ok: false, error: "Signed URL 생성 실패" };
    }

    return { ok: true, signedUrl: signed, publicPath: path };
  } catch (e) {
    console.error("[pdf] generate error:", e);
    return {
      ok: false,
      error: "PDF 생성 실패",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function createSignedUrl(
  supabase: AnySupabase,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days
  if (error || !data) {
    console.error("[pdf] signed url error:", error?.message);
    return null;
  }
  return data.signedUrl;
}

// pdf_url 컬럼에 저장된 path/URL에서 실제 storage path 추출
function extractStoragePath(stored: string, userId: string): string | null {
  // 신규: "user_id/uuid.pdf"
  if (stored.startsWith(`${userId}/`)) return stored;

  // 레거시: signed URL or public URL — userId/...pdf 부분 추출
  const m = stored.match(/reports\/([^?#]+\.pdf)/);
  if (m && m[1].startsWith(`${userId}/`)) return m[1];
  return null;
}

function mergeWithEmpty(p: Partial<ParsedQuery>): ParsedQuery {
  return {
    ...EMPTY_PARSED,
    ...p,
    regions: Array.isArray(p.regions) ? p.regions : [],
    exclude_regions: Array.isArray(p.exclude_regions)
      ? p.exclude_regions
      : [],
    additional_notes: Array.isArray(p.additional_notes)
      ? p.additional_notes
      : [],
    area_연층_허용: p.area_연층_허용 === true,
    parking_required: p.parking_required === true,
  };
}

function orderByIds(rows: ListingRow[], ids: number[]): ListingRow[] {
  const map = new Map<number, ListingRow>();
  for (const r of rows) map.set(r.id, r);
  return ids.map((id) => map.get(id)).filter((x): x is ListingRow => !!x);
}

function buildPDFTitle(industry: string | null): string {
  if (industry) return `${industry} 사옥 매물 제안서`;
  return "사무실 임대 매물 제안서";
}

function buildFileName(industry: string | null, d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const prefix = industry ?? "매물";
  return `${prefix}_제안서_${yyyy}-${mm}-${dd}.pdf`;
}
