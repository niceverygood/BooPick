// 어드민 전용 네이버부동산 크롤러 API
//
// 본인(한대표) 확인용 도구 — UI는 /admin/crawler 에만 노출되며 isAdmin 게이트 통과 필수.
//
// Action discriminator:
//   POST { action: "preview", url, maxPages? }
//     → 크롤링 결과를 JSON 으로만 반환 (DB 저장 없음)
//
//   POST { action: "save", url, name, maxPages? }
//     → 크롤링 + datasets/listings 저장 (service_role, admin 본인 user_id)
//     → 티어 제한 우회 (어드민 도구)

import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile, isAdmin } from "@/lib/tier-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlNaver, type CrawlResult } from "@/lib/naver-crawler";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PreviewBody {
  action: "preview";
  url: string;
  maxPages?: number;
  cortarNoOverride?: string;
}
interface SaveBody {
  action: "save";
  url: string;
  name: string;
  maxPages?: number;
  cortarNoOverride?: string;
}

type Body = PreviewBody | SaveBody;

export async function POST(req: NextRequest) {
  // 1. 어드민 인증
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // 2. body 파싱
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url 필수" }, { status: 400 });
  }

  const maxPages =
    typeof body.maxPages === "number" && body.maxPages > 0
      ? Math.min(10, Math.floor(body.maxPages))
      : 5;

  const cortarNoOverride =
    typeof body.cortarNoOverride === "string" &&
    /^\d{8,12}$/.test(body.cortarNoOverride.trim())
      ? body.cortarNoOverride.trim()
      : undefined;

  // 3. 크롤링
  let result: CrawlResult;
  try {
    result = await crawlNaver({ url: body.url, maxPages, cortarNoOverride });
  } catch (err) {
    const message = err instanceof Error ? err.message : "크롤링 실패";
    return NextResponse.json(
      { error: "크롤링 실패", detail: message },
      { status: 500 }
    );
  }

  if (body.action === "preview") {
    return NextResponse.json({
      ok: true,
      summary: result.summary,
      listings: result.listings,
    });
  }

  // 4. save — datasets + listings
  if (body.action !== "save") {
    return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name 필수" }, { status: 400 });
  }
  if (result.listings.length === 0) {
    return NextResponse.json(
      { error: "수집된 매물이 없어 저장하지 않았습니다", summary: result.summary },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: dataset, error: dsErr } = await admin
    .from("datasets")
    .insert({
      user_id: profile.id,
      name: body.name.trim(),
      original_filename: `naver-crawl-${new Date().toISOString().slice(0, 10)}`,
      row_count: 0,
    })
    .select("id")
    .single();

  if (dsErr || !dataset) {
    return NextResponse.json(
      { error: "데이터셋 생성 실패", detail: dsErr?.message },
      { status: 500 }
    );
  }

  const datasetId = (dataset as { id: string }).id;
  const rows = result.listings.map((l) => ({ ...l, dataset_id: datasetId }));

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await admin.from("listings").insert(chunk);
    if (error) {
      return NextResponse.json(
        {
          error: "listings insert 실패",
          detail: error.message,
          inserted_before_error: inserted,
          dataset_id: datasetId,
        },
        { status: 500 }
      );
    }
    inserted += chunk.length;
  }

  await admin
    .from("datasets")
    .update({ row_count: inserted })
    .eq("id", datasetId);

  console.log(
    `[admin-crawler] ${profile.email} saved ${inserted} listings to dataset ${datasetId}`
  );

  return NextResponse.json({
    ok: true,
    summary: result.summary,
    dataset_id: datasetId,
    inserted,
  });
}
