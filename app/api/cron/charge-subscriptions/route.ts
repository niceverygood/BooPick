// 정기 차회 자동 결제 cron — 매일 00:30 KST (vercel.json)
//
// GET /api/cron/charge-subscriptions
//   - 인증: Authorization: Bearer ${CRON_SECRET} (Vercel Cron 자동 주입)
//   - 대상: status='active' AND next_charge_at <= now
//           AND (last_charge_attempt_at IS NULL OR < now - 20h)  ← 같은 날 중복 방지
//   - 각 구독을 chargeSubscription() 으로 멱등 처리
//   - 결과 통계 반환
//
// service_role(admin) 클라이언트 사용 (가드레일 #3 — 전체 사용자 구독 조회).

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  chargeSubscription,
  type SubscriptionRow,
  type ChargeOutcome,
} from "./charge";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/charge] CRON_SECRET 미설정 — 거부");
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const ATTEMPT_GATE_HOURS = 20;

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - ATTEMPT_GATE_HOURS * 60 * 60 * 1000);
  const admin = createAdminClient();

  // 대상 구독 조회
  const { data, error } = await admin
    .from("subscriptions")
    .select(
      "id, user_id, cid, sid, plan, amount_per_cycle, billing_cycle, status, retry_count, next_charge_at"
    )
    .eq("status", "active")
    .lte("next_charge_at", now.toISOString())
    .or(
      `last_charge_attempt_at.is.null,last_charge_attempt_at.lt.${cutoff.toISOString()}`
    );

  if (error) {
    console.error("[cron/charge] 구독 조회 실패:", error.message);
    return NextResponse.json(
      { error: "구독 조회 실패", detail: error.message },
      { status: 500 }
    );
  }

  const subs = (data as SubscriptionRow[] | null) ?? [];
  const stats: Record<ChargeOutcome, number> = {
    charged: 0,
    skipped_duplicate: 0,
    retry_later: 0,
    inactivated: 0,
    error: 0,
  };
  const details: { id: string; outcome: ChargeOutcome; detail?: string }[] = [];

  // 순차 처리 (카카오 API·DB 경합 방지)
  for (const sub of subs) {
    const result = await chargeSubscription(admin, sub, now);
    stats[result.outcome] += 1;
    details.push({
      id: result.subscriptionId,
      outcome: result.outcome,
      detail: result.detail,
    });
  }

  console.log(
    `[cron/charge] 대상 ${subs.length}건 → 성공 ${stats.charged} / 재시도 ${stats.retry_later} / 강등 ${stats.inactivated} / 중복스킵 ${stats.skipped_duplicate} / 에러 ${stats.error}`
  );

  return NextResponse.json({
    ok: true,
    processed: subs.length,
    stats,
    details,
    ran_at: now.toISOString(),
  });
}
