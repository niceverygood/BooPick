import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { extractTags } from "@/lib/tagging/extract-tags";
import { createEmbedding } from "@/lib/openai";
import { DEMO_LISTINGS } from "@/lib/seed/demo-listings";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: hobby 60초, pro 300초

const DEMO_AGENCY_NAME = "부픽 데모 사무소";

export async function POST(req: NextRequest) {
  // 시크릿 헤더 검증 (env에 설정된 경우만 — 미설정이면 누구나 호출 가능)
  const expectedSecret = process.env.ADMIN_SEED_SECRET;
  if (expectedSecret) {
    const provided = req.headers.get("x-seed-secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "Supabase admin 클라이언트 생성 실패 — 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 확인 필요",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  // 1. 데모 agency upsert
  const { data: existingAgency } = await admin
    .from("agencies")
    .select("id, name")
    .eq("name", DEMO_AGENCY_NAME)
    .maybeSingle();

  let agencyId: string;
  if (existingAgency?.id) {
    agencyId = existingAgency.id;
  } else {
    const { data: created, error: agencyErr } = await admin
      .from("agencies")
      .insert({
        name: DEMO_AGENCY_NAME,
        plan: "pro",
        share_pool_opted_in: true,
      })
      .select("id")
      .single();
    if (agencyErr || !created) {
      return NextResponse.json(
        { error: "agency 생성 실패", detail: agencyErr?.message },
        { status: 500 }
      );
    }
    agencyId = created.id;
  }

  // 2. 매물 idempotent 처리 — 같은 address면 skip
  const results: Array<{
    address: string;
    status: "exists" | "created" | "error";
    error?: string;
  }> = [];

  for (const listing of DEMO_LISTINGS) {
    try {
      // 중복 체크
      const { data: existing } = await admin
        .from("listings")
        .select("id")
        .eq("address", listing.address)
        .maybeSingle();

      if (existing?.id) {
        results.push({ address: listing.address, status: "exists" });
        continue;
      }

      // AI 태깅
      const tagging = await extractTags({
        description: listing.description,
        shortDescription: listing.short_description,
      });

      // 임베딩 — 검색 매칭의 의미적 토대가 되는 텍스트
      const embedText = [
        listing.dong,
        listing.short_description,
        listing.description,
      ].join("\n");
      const embedding = await createEmbedding(embedText);

      // INSERT
      const { error: insertErr } = await admin.from("listings").insert({
        agency_id: agencyId,
        address: listing.address,
        dong: listing.dong,
        building_name: listing.building_name ?? null,
        area_pyeong: listing.area_pyeong,
        area_sqm: listing.area_sqm,
        floor: listing.floor,
        total_floors: listing.total_floors ?? null,
        building_type: listing.building_type,
        transaction_type: listing.transaction_type,
        deposit: listing.deposit,
        monthly_rent: listing.monthly_rent,
        premium: listing.premium ?? null,
        description: listing.description,
        short_description: listing.short_description,
        photo_urls: [],
        is_shared: true,
        status: "active",
        source: "manual",
        ai_tags: tagging.tags,
        ai_embedding: embedding,
        ai_processed_at: new Date().toISOString(),
      });

      if (insertErr) {
        results.push({
          address: listing.address,
          status: "error",
          error: insertErr.message,
        });
      } else {
        results.push({ address: listing.address, status: "created" });
      }
    } catch (e) {
      results.push({
        address: listing.address,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const exists = results.filter((r) => r.status === "exists").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    agency_id: agencyId,
    summary: { created, exists, errors, total: DEMO_LISTINGS.length },
    results,
  });
}
