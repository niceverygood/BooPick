import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateGuide } from "@/lib/content/generate-guide";

export const runtime = "nodejs";
export const maxDuration = 300; // Pro 플랜에서는 더 길게 가능

// POST /api/admin/content/cron — 매일 N건 SEO 가이드 자동 생성
//   header: x-cron-secret (env ADMIN_CRON_SECRET와 일치 필요)
//   query: ?limit=10&use_haiku=true (테스트용)
//
// 작동:
//   1. 가이드가 아직 없는 active+tenant_pool_enabled 매물 N건 선정
//   2. 각각 Claude로 SEO 가이드 생성
//   3. guides 테이블에 published 상태로 insert
//
// Vercel Cron 또는 외부 cron으로 매일 호출 권장.
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_CRON_SECRET;
  if (expected) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "10"), 1),
    50
  );
  const useHaiku = url.searchParams.get("use_haiku") === "true";

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: "DB 연결 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  // 1. 가이드 없는 매물 선정
  const { data: existingGuideListingIds } = await admin
    .from("guides")
    .select("listing_id")
    .not("listing_id", "is", null);

  const excluded = (existingGuideListingIds ?? [])
    .map((g) => g.listing_id as string)
    .filter(Boolean);

  let q = admin
    .from("listings")
    .select(
      `id, address, dong, area_pyeong, floor, building_type, transaction_type,
       deposit, monthly_rent, description, short_description, ai_tags`
    )
    .eq("status", "active")
    .eq("tenant_pool_enabled", true)
    .not("ai_embedding", "is", null);

  if (excluded.length > 0) {
    q = q.not("id", "in", `(${excluded.map((id) => `"${id}"`).join(",")})`);
  }

  const { data: candidates, error: cErr } = await q
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cErr) {
    return NextResponse.json(
      { error: "후보 조회 실패", detail: cErr.message },
      { status: 500 }
    );
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: { generated: 0, skipped: 0, errors: 0 },
      message: "생성 대상 매물이 없습니다",
    });
  }

  // 2. 각 매물에 대해 가이드 생성 + insert (sequential, rate limit 안전)
  const results: Array<{
    listing_id: string;
    status: "generated" | "skipped" | "error";
    slug?: string;
    error?: string;
  }> = [];

  for (const listing of candidates) {
    try {
      const guide = await generateGuide({
        listing: {
          id: listing.id,
          address: listing.address,
          dong: listing.dong,
          area_pyeong: listing.area_pyeong,
          floor: listing.floor,
          building_type: listing.building_type,
          transaction_type: listing.transaction_type,
          deposit: listing.deposit,
          monthly_rent: listing.monthly_rent,
          description: listing.description,
          short_description: listing.short_description,
          ai_tags: listing.ai_tags,
        },
        useHaiku,
      });

      // slug 충돌 시 -2, -3 추가
      let finalSlug = guide.slug;
      let attempt = 1;
      while (attempt < 5) {
        const { data: clash } = await admin
          .from("guides")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (!clash) break;
        attempt++;
        finalSlug = `${guide.slug}-${attempt}`;
      }

      const { error: insertErr } = await admin.from("guides").insert({
        slug: finalSlug,
        title: guide.title,
        body: guide.body,
        meta_description: guide.meta_description,
        topic: guide.hero_query,
        listing_id: listing.id,
        hero_query: guide.hero_query,
        hashtags: guide.hashtags,
        status: "published",
        published_at: new Date().toISOString(),
        ai_model: useHaiku ? "claude-haiku-4-5" : "claude-sonnet-4-6",
        ai_tokens_in: guide.tokens.input,
        ai_tokens_out: guide.tokens.output,
      });

      if (insertErr) {
        results.push({
          listing_id: listing.id,
          status: "error",
          error: insertErr.message,
        });
      } else {
        results.push({
          listing_id: listing.id,
          status: "generated",
          slug: finalSlug,
        });
      }
    } catch (e) {
      results.push({
        listing_id: listing.id,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const generated = results.filter((r) => r.status === "generated").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    ok: true,
    summary: {
      generated,
      errors,
      total: results.length,
    },
    results,
  });
}
