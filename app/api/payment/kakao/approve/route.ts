// 카카오페이 결제 APPROVE (redirect callback)
//
// GET /api/payment/kakao/approve?type=<onetime|subscription>&order=<partner_order_id>&pg_token=<...>
//
// 흐름:
//   1. pg_token + payments row(tid) 조회
//   2. 카카오페이 approve API 호출
//   3. payments status='approved' + 응답 저장
//   4. 정기결제 첫 결제 시 subscriptions INSERT (sid)
//   5. profiles.tier = 'pro' 자동 승격
//   6. 사용자를 /checkout/success 로 redirect
//
// 카카오페이가 이 URL 로 직접 redirect 하므로 GET 요청.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approve, KakaoPayError, getSiteUrl } from "@/lib/kakaopay";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "subscription" ? "subscription" : "onetime";
  const partnerOrderId = url.searchParams.get("order") ?? "";
  const pgToken = url.searchParams.get("pg_token") ?? "";

  const site = getSiteUrl();
  const failRedirect = (reason: string) =>
    NextResponse.redirect(
      `${site}/checkout/fail?reason=${encodeURIComponent(reason)}`,
      303
    );

  if (!partnerOrderId || !pgToken) {
    return failRedirect("필수 파라미터 누락");
  }

  const admin = createAdminClient();

  // 1. payments 조회 (tid, user_id 확보)
  const { data: payment, error: selErr } = await admin
    .from("payments")
    .select("id, user_id, tid, partner_user_id, total_amount, type")
    .eq("partner_order_id", partnerOrderId)
    .eq("status", "ready")
    .maybeSingle();

  if (selErr || !payment) {
    console.error("[payment/approve] payment not found:", partnerOrderId);
    return failRedirect("결제 정보를 찾을 수 없습니다");
  }

  // 2. 카카오 APPROVE 호출
  let approveResp;
  try {
    approveResp = await approve({
      type,
      tid: payment.tid,
      partnerOrderId,
      partnerUserId: payment.partner_user_id,
      pgToken,
    });
  } catch (err) {
    if (err instanceof KakaoPayError) {
      console.error(`[payment/approve] KakaoPay error: ${err.code} ${err.message}`);
      await admin
        .from("payments")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      return failRedirect(err.message);
    }
    const msg = err instanceof Error ? err.message : "결제 승인 실패";
    console.error("[payment/approve] unexpected:", msg);
    return failRedirect(msg);
  }

  // 3. payments 업데이트
  const updates: Record<string, unknown> = {
    status: "approved",
    aid: approveResp.aid,
    payment_method_type: approveResp.payment_method_type,
    vat_amount: approveResp.amount?.vat ?? null,
    approved_at: approveResp.approved_at,
    raw_approve_response: approveResp as unknown as Record<string, unknown>,
  };
  if (approveResp.sid) {
    updates.sid = approveResp.sid;
  }
  await admin.from("payments").update(updates).eq("id", payment.id);

  // 4. 정기결제 첫 결제면 subscriptions INSERT + tier=pro 승격
  if (type === "subscription" && approveResp.sid) {
    // 이미 존재하는 active 구독이 있으면 그것을 inactive 처리 (중복 방지)
    await admin
      .from("subscriptions")
      .update({
        status: "inactive",
        inactive_at: new Date().toISOString(),
        inactive_reason: "replaced by new subscription",
      })
      .eq("user_id", payment.user_id)
      .eq("status", "active");

    const next = new Date();
    next.setMonth(next.getMonth() + 1);

    const { error: subErr } = await admin.from("subscriptions").insert({
      user_id: payment.user_id,
      cid: process.env.KAKAOPAY_CID_SUBSCRIPTION ?? "TCSUBSCRIP",
      sid: approveResp.sid,
      plan: "pro",
      amount_per_cycle: payment.total_amount,
      status: "active",
      started_at: new Date().toISOString(),
      last_charged_at: approveResp.approved_at,
      next_charge_at: next.toISOString(),
    });
    if (subErr) {
      console.error("[payment/approve] subscription insert fail:", subErr.message);
    }
  }

  // 5. 결제 완료 시 Pro 활성 (정기든 단건이든 — 단건은 별도 정책 가능)
  //    여기서는 둘 다 Pro 활성. 단건 만료 정책은 추후.
  if (type === "subscription") {
    await admin
      .from("profiles")
      .update({ tier: "pro" })
      .eq("id", payment.user_id);
  }

  // 6. 사용자에게 success 페이지로 redirect
  return NextResponse.redirect(
    `${site}/checkout/success?type=${type}&aid=${encodeURIComponent(approveResp.aid)}`,
    303
  );
}
