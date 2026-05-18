// 카카오페이 결제 READY
//
// POST /api/payment/kakao/ready
//   Body: { type: 'onetime' | 'subscription', amount?, item_name? }
//   1. user 인증
//   2. partner_order_id 생성 (uuid)
//   3. 카카오페이 ready API 호출 → tid + redirect URL
//   4. payments 테이블에 status='ready' 로 INSERT
//   5. redirect URL (PC/mobile) 반환
//
// 클라이언트는 모바일 환경이면 next_redirect_mobile_url 로, PC면 next_redirect_pc_url 로 이동.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ready, getCid, KakaoPayError } from "@/lib/kakaopay";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const PRO_PRICE = 49_000;
const PRO_ITEM_NAME = "부픽 Pro 구독 (월)";
const ONETIME_ITEM_NAME = "부픽 단건 리포트 결제";

interface Body {
  type: "onetime" | "subscription";
  amount?: number;
  item_name?: string;
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

  if (body.type !== "onetime" && body.type !== "subscription") {
    return NextResponse.json(
      { error: "type 은 'onetime' 또는 'subscription' 이어야 합니다" },
      { status: 400 }
    );
  }

  // 가격은 서버 결정 (클라이언트 변조 방지)
  let amount = body.type === "subscription" ? PRO_PRICE : body.amount ?? 0;
  const itemName =
    body.type === "subscription" ? PRO_ITEM_NAME : body.item_name ?? ONETIME_ITEM_NAME;

  if (body.type === "onetime") {
    // 단건은 금액 검증 (1,000 ~ 1,000,000원)
    if (!Number.isFinite(amount) || amount < 1_000 || amount > 1_000_000) {
      return NextResponse.json(
        { error: "단건 결제 금액은 1,000원 ~ 1,000,000원 범위여야 합니다" },
        { status: 400 }
      );
    }
    amount = Math.floor(amount);
  }

  const partnerOrderId = randomUUID();
  const partnerUserId = user.id;

  try {
    const r = await ready({
      type: body.type,
      partnerOrderId,
      partnerUserId,
      itemName,
      totalAmount: amount,
      taxFreeAmount: 0,
    });

    // payments INSERT (service_role)
    const admin = createAdminClient();
    const { error: insErr } = await admin.from("payments").insert({
      user_id: user.id,
      type: body.type === "subscription" ? "subscription_first" : "onetime",
      cid: getCid(body.type),
      tid: r.tid,
      partner_order_id: partnerOrderId,
      partner_user_id: partnerUserId,
      item_name: itemName,
      total_amount: amount,
      tax_free_amount: 0,
      status: "ready",
      raw_ready_response: r as unknown as Record<string, unknown>,
    });
    if (insErr) {
      console.error("[payment/ready] payments insert fail:", insErr.message);
      // 카카오는 이미 tid 발급 — 진행은 가능하므로 응답은 줌
    }

    return NextResponse.json({
      ok: true,
      tid: r.tid,
      partner_order_id: partnerOrderId,
      next_redirect_pc_url: r.next_redirect_pc_url,
      next_redirect_mobile_url: r.next_redirect_mobile_url,
    });
  } catch (err) {
    if (err instanceof KakaoPayError) {
      console.error(`[payment/ready] KakaoPay error: ${err.code} ${err.message}`);
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status ?? 500 }
      );
    }
    const msg = err instanceof Error ? err.message : "결제 준비 실패";
    console.error("[payment/ready] unexpected:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
