// 정기결제 해지 (사용자 본인 또는 어드민)
//
// POST /api/payment/subscription/inactive
//   Body: { subscription_id }  (본인만 해당)
//   1. user 인증 + subscription 소유 검증
//   2. 카카오페이 inactive API 호출
//   3. subscriptions status='inactive'
//   4. (선택) profiles.tier='basic' 강등은 다음 결제일까지 유지 — 여기선 강등 X
//
// 본인 구독만 해지 가능 (admin 강제 해지는 별도 API).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inactiveSubscription, KakaoPayError } from "@/lib/kakaopay";

export const runtime = "nodejs";

interface Body {
  subscription_id: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (!body.subscription_id) {
    return NextResponse.json(
      { error: "subscription_id 필수" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: sub, error: selErr } = await admin
    .from("subscriptions")
    .select("id, user_id, sid, status")
    .eq("id", body.subscription_id)
    .maybeSingle();

  if (selErr || !sub) {
    return NextResponse.json(
      { error: "구독 정보 없음" },
      { status: 404 }
    );
  }
  if (sub.user_id !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  if (sub.status !== "active") {
    return NextResponse.json(
      { error: "이미 해지된 구독입니다" },
      { status: 400 }
    );
  }

  // 카카오 inactive 호출
  try {
    await inactiveSubscription(sub.sid);
  } catch (err) {
    if (err instanceof KakaoPayError) {
      console.error(`[sub/inactive] kakao error: ${err.code} ${err.message}`);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status ?? 500 }
      );
    }
    const msg = err instanceof Error ? err.message : "해지 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // DB 업데이트
  const { error: upErr } = await admin
    .from("subscriptions")
    .update({
      status: "inactive",
      inactive_at: new Date().toISOString(),
      inactive_reason: body.reason ?? "user_request",
    })
    .eq("id", sub.id);

  if (upErr) {
    console.error("[sub/inactive] db update fail:", upErr.message);
    return NextResponse.json(
      { error: "DB 업데이트 실패 (해지는 처리됨)", detail: upErr.message },
      { status: 500 }
    );
  }

  console.log(`[sub/inactive] ${user.email} canceled subscription ${sub.id}`);

  return NextResponse.json({ ok: true });
}
