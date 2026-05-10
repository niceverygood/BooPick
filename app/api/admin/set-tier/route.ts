import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, getCurrentProfile } from "@/lib/tier-check";

export const runtime = "nodejs";

// POST /api/admin/set-tier
//   body: { user_id, tier: 'basic' | 'pro', beta_request_id? }
//   - 호출자가 어드민(ADMIN_EMAILS) 인지 검증
//   - service_role로 profiles.tier 변경 (RLS 우회)
//   - 선택: beta_request_id 있으면 status='approved' 업데이트
export async function POST(req: NextRequest) {
  // 1. 인증 + 어드민 체크
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // 2. body 파싱
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const targetUserId = typeof body.user_id === "string" ? body.user_id : null;
  const tier = body.tier === "pro" ? "pro" : body.tier === "basic" ? "basic" : null;
  const betaRequestId =
    typeof body.beta_request_id === "string" ? body.beta_request_id : null;

  if (!targetUserId || !tier) {
    return NextResponse.json(
      { error: "user_id와 tier(basic|pro) 필수" },
      { status: 400 }
    );
  }

  // 3. service_role로 변경
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ tier })
    .eq("id", targetUserId);

  if (error) {
    return NextResponse.json(
      { error: "티어 변경 실패", detail: error.message },
      { status: 500 }
    );
  }

  // 4. beta_request 연결되어 있으면 approved 처리
  if (betaRequestId && tier === "pro") {
    await admin
      .from("beta_requests")
      .update({
        status: "approved",
        approved_by: profile.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", betaRequestId);
  }

  console.log(
    `[admin] ${profile.email} set ${targetUserId} → ${tier}${
      betaRequestId ? ` (beta_request ${betaRequestId} approved)` : ""
    }`
  );

  return NextResponse.json({ ok: true, user_id: targetUserId, tier });
}

// 어드민 사용량 리셋 — service_role 직접 update
export async function PUT(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const targetUserId = typeof body.user_id === "string" ? body.user_id : null;
  if (!targetUserId) {
    return NextResponse.json({ error: "user_id 필수" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      reports_used_month: 0,
      reports_reset_at: new Date().toISOString().slice(0, 10),
    })
    .eq("id", targetUserId);

  if (error) {
    return NextResponse.json(
      { error: "리셋 실패", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, user_id: targetUserId });
}
