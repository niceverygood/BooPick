// 카카오페이 결제 READY
//
// POST /api/payment/kakao/ready
//   Body: { cycle: 'monthly' | 'yearly' | 'onetime', amount? }
//   1. user 인증
//   2. cycle 에 따라 가격·item_name 결정 (서버 결정 — 변조 방지)
//   3. partner_order_id 생성 (uuid)
//   4. 카카오페이 ready API 호출 → tid + redirect URL
//   5. payments 테이블에 status='ready' INSERT (cycle 도 함께 메타로 저장)
//   6. redirect URL (PC/mobile) 반환

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ready, getCid, KakaoPayError } from "@/lib/kakaopay";
import {
  PRICING,
  ONETIME_MIN,
  ONETIME_MAX,
  toKakaoType,
  type BillingCycle,
} from "@/lib/pricing";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

interface Body {
  cycle: BillingCycle;
  /** 단건 결제 시에만 사용 (정기는 무시) */
  amount?: number;
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

  // cycle 검증
  if (
    body.cycle !== "monthly" &&
    body.cycle !== "yearly" &&
    body.cycle !== "onetime"
  ) {
    return NextResponse.json(
      {
        error:
          "cycle 은 'monthly' / 'yearly' / 'onetime' 중 하나여야 합니다",
      },
      { status: 400 }
    );
  }

  // 가격·item_name — 서버 결정
  let amount: number;
  let itemName: string;
  if (body.cycle === "onetime") {
    amount = Math.floor(body.amount ?? PRICING.onetime.amount);
    if (!Number.isFinite(amount) || amount < ONETIME_MIN || amount > ONETIME_MAX) {
      return NextResponse.json(
        {
          error: `단건 결제 금액은 ${ONETIME_MIN.toLocaleString()}원 ~ ${ONETIME_MAX.toLocaleString()}원 범위여야 합니다`,
        },
        { status: 400 }
      );
    }
    itemName = PRICING.onetime.itemName;
  } else {
    amount = PRICING[body.cycle].amount;
    itemName = PRICING[body.cycle].itemName;
  }

  const kakaoType = toKakaoType(body.cycle);
  const partnerOrderId = randomUUID();
  const partnerUserId = user.id;

  try {
    const r = await ready({
      type: kakaoType,
      partnerOrderId,
      partnerUserId,
      itemName,
      totalAmount: amount,
      taxFreeAmount: 0,
      // approve 라우트에서 cycle 별 next_charge_at 계산하려고 query 로 전달
      extraApprovalParams: { cycle: body.cycle },
    });

    // payments INSERT (service_role) — cycle 은 raw_ready_response 에 함께 보관
    const admin = createAdminClient();
    const { error: insErr } = await admin.from("payments").insert({
      user_id: user.id,
      type:
        body.cycle === "onetime"
          ? "onetime"
          : "subscription_first",
      cid: getCid(kakaoType),
      tid: r.tid,
      partner_order_id: partnerOrderId,
      partner_user_id: partnerUserId,
      item_name: itemName,
      total_amount: amount,
      tax_free_amount: 0,
      status: "ready",
      raw_ready_response: { ...r, _cycle: body.cycle } as unknown as Record<
        string,
        unknown
      >,
    });
    if (insErr) {
      console.error("[payment/ready] payments insert fail:", insErr.message);
    }

    return NextResponse.json({
      ok: true,
      tid: r.tid,
      partner_order_id: partnerOrderId,
      cycle: body.cycle,
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
