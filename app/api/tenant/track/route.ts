import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/tenant/track
//   body: { listing_id, event: 'view' | 'click', anon_token? }
//   - listings.tenant_views/clicks 증가
//   - last_tenant_view_at 갱신 (view일 때)
//   - 가벼운 fire-and-forget API
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const listingId = body.listing_id;
  const event = body.event;
  if (typeof listingId !== "string") {
    return NextResponse.json({ error: "listing_id 필요" }, { status: 400 });
  }
  if (event !== "view" && event !== "click") {
    return NextResponse.json({ error: "event=view|click" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // 현재 카운터를 읽고 +1 (race condition 무시 — 통계 용도)
  const column = event === "view" ? "tenant_views" : "tenant_clicks";
  const { data: cur } = await admin
    .from("listings")
    .select(`id, ${column}`)
    .eq("id", listingId)
    .maybeSingle();

  if (!cur) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    [column]: (((cur as Record<string, unknown>)[column] as number) ?? 0) + 1,
  };
  if (event === "view") {
    updates.last_tenant_view_at = new Date().toISOString();
  }

  await admin.from("listings").update(updates).eq("id", listingId);

  return NextResponse.json({ ok: true });
}
