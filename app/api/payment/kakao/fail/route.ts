// 카카오페이 결제 실패 redirect
//
// GET /api/payment/kakao/fail?order=<partner_order_id>&...
//   → payments status='failed' 업데이트 후 /checkout/fail 페이지로 redirect

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/kakaopay";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const order = url.searchParams.get("order") ?? "";
  const site = getSiteUrl();

  if (order) {
    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
      })
      .eq("partner_order_id", order)
      .eq("status", "ready");
  }

  return NextResponse.redirect(`${site}/checkout/fail`, 303);
}
