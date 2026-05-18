// 카카오페이 결제 취소 redirect (사용자가 카카오 결제창에서 X 누름)
//
// GET /api/payment/kakao/cancel?order=<partner_order_id>
//   → payments status='canceled' 업데이트 후 /checkout/cancel 페이지로 redirect

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
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("partner_order_id", order)
      .eq("status", "ready");
  }

  return NextResponse.redirect(`${site}/checkout/cancel`, 303);
}
