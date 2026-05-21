// 단일 구독 정기 차회 결제 — 테스트 가능 단위
//
// 흐름 (가드레일 #4 멱등 / #5 try-catch / #6 PII 마스킹):
//   1. idempotency_key = "${sub.id}:${YYYYMMDD(KST)}"
//   2. payments upsert(ignoreDuplicates) → 이미 있으면 오늘 처리됨 → skip
//   3. 카카오페이 subscribe() 호출
//   4a. 성공: payments approved + subscriptions next_charge_at 전진 + retry_count=0
//             + 알림톡 영수증 큐
//   4b. 실패: payments failed + decideRetry → retry_later / inactive(+유예)
//
// DB 상태는 카카오 응답 확정 후에만 갱신 (#5).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  subscribe,
  getCid,
  KakaoPayError,
  type ApproveResponse,
  type SubscribeParams,
} from "@/lib/kakaopay";
import { nextChargeAt, PRICING, type BillingCycle } from "@/lib/pricing";
import {
  decideRetry,
  countsTowardMax,
  MAX_RETRIES,
} from "@/lib/subscription-retry";
import { queueAlimtalk } from "@/lib/alimtalk";
import { randomUUID } from "crypto";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  cid: string;
  sid: string;
  plan: string;
  amount_per_cycle: number;
  billing_cycle: "monthly" | "yearly";
  status: string;
  retry_count: number;
  next_charge_at: string | null;
}

export type ChargeOutcome =
  | "charged"
  | "skipped_duplicate"
  | "retry_later"
  | "inactivated"
  | "error";

export interface ChargeResult {
  subscriptionId: string;
  outcome: ChargeOutcome;
  detail?: string;
}

// KST 기준 YYYYMMDD
export function kstDateKey(d: Date = new Date()): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, "");
}

const ALIMTALK_TEMPLATE_RECEIPT = "PRO_RECEIPT"; // 승인 후 실 템플릿 ID 로 교체

// ── 테스트 전용 mock (프로덕션에서는 절대 작동 안 함) ──
//   KAKAOPAY_MOCK 환경변수로 실제 청구 없이 흐름 검증:
//     "success"        → 가짜 승인 응답 (실결제 X) → charged
//     "error:<CODE>"   → 해당 코드로 KakaoPayError throw (예: error:INSUFFICIENT_BALANCE)
//   NODE_ENV='production' 이면 mock 무시 → 실제 subscribe() 만 호출.
//   (Vercel 빌드는 프리뷰·프로덕션 모두 NODE_ENV=production → mock 영구 비활성.
//    로컬 next dev / tsx 스크립트에서만 동작.)
//   ※ 테스트 종료 후 이 블록은 제거 가능 (기능 영향 없음).
async function doSubscribe(params: SubscribeParams): Promise<ApproveResponse> {
  const mock = process.env.KAKAOPAY_MOCK;
  const isProd = process.env.NODE_ENV === "production";
  if (mock && !isProd) {
    if (mock.startsWith("error:")) {
      const code = mock.slice("error:".length) || "MOCK_ERROR";
      throw new KakaoPayError(`[MOCK] ${code}`, code, 400);
    }
    if (mock === "success") {
      const iso = new Date().toISOString();
      return {
        aid: `MOCK_AID_${Date.now()}`,
        tid: `MOCK_TID_${Date.now()}`,
        cid: getCid("subscription"),
        sid: params.sid,
        partner_order_id: params.partnerOrderId,
        partner_user_id: params.partnerUserId,
        payment_method_type: "MONEY",
        item_name: params.itemName,
        quantity: params.quantity ?? 1,
        amount: {
          total: params.totalAmount,
          tax_free: params.taxFreeAmount ?? 0,
          vat: Math.round(params.totalAmount / 11),
          point: 0,
          discount: 0,
        },
        created_at: iso,
        approved_at: iso,
      };
    }
  }
  return subscribe(params);
}

export async function chargeSubscription(
  admin: SupabaseClient,
  sub: SubscriptionRow,
  now: Date = new Date()
): Promise<ChargeResult> {
  const cycle: BillingCycle = sub.billing_cycle;
  const itemName =
    cycle === "yearly" ? PRICING.yearly.itemName : PRICING.monthly.itemName;
  const idempotencyKey = `${sub.id}:${kstDateKey(now)}`;
  const partnerOrderId = randomUUID();

  // ── 1. 멱등 INSERT (오늘 이미 처리됐으면 skip) ──
  let inserted: { id: string }[] | null = null;
  try {
    const { data, error } = await admin
      .from("payments")
      .upsert(
        {
          user_id: sub.user_id,
          subscription_id: sub.id,
          type: "subscription_recurring",
          cid: getCid("subscription"),
          tid: null, // 정기 차회는 사전 tid 없음 — 승인 후 채움
          partner_order_id: partnerOrderId,
          partner_user_id: sub.user_id,
          item_name: itemName,
          total_amount: sub.amount_per_cycle,
          tax_free_amount: 0,
          status: "ready", // payments_status_check: ready→approved/failed
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true }
      )
      .select("id");
    if (error) {
      console.error(
        `[charge] payments upsert fail sub=${sub.id}: ${error.message}`
      );
      return { subscriptionId: sub.id, outcome: "error", detail: error.message };
    }
    inserted = data as { id: string }[] | null;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { subscriptionId: sub.id, outcome: "error", detail };
  }

  // ignoreDuplicates → 충돌 시 빈 배열. 오늘 이미 결제 시도됨.
  if (!inserted || inserted.length === 0) {
    return { subscriptionId: sub.id, outcome: "skipped_duplicate" };
  }
  const paymentId = inserted[0].id;

  // ── 2. 카카오페이 정기 차회 결제 ──
  try {
    const resp = await doSubscribe({
      sid: sub.sid,
      partnerOrderId,
      partnerUserId: sub.user_id,
      itemName,
      totalAmount: sub.amount_per_cycle,
      taxFreeAmount: 0,
    });

    // ── 3. 성공: payments approved + subscriptions 전진 ──
    const next = nextChargeAt(cycle, now);
    await admin
      .from("payments")
      .update({
        status: "approved",
        tid: resp.tid,
        aid: resp.aid,
        payment_method_type: resp.payment_method_type,
        vat_amount: resp.amount?.vat ?? null,
        approved_at: resp.approved_at,
        raw_approve_response: { ...resp, _cycle: cycle } as unknown as Record<
          string,
          unknown
        >,
      })
      .eq("id", paymentId);

    await admin
      .from("subscriptions")
      .update({
        last_charged_at: resp.approved_at,
        next_charge_at: next.toISOString(),
        last_charge_attempt_at: now.toISOString(),
        retry_count: 0,
        last_charge_error: null,
        grace_period_until: null,
      })
      .eq("id", sub.id);

    // 알림톡 영수증 큐 (스텁) — 실패해도 결제는 성공이므로 무시
    await queueAlimtalk(admin, {
      templateId: ALIMTALK_TEMPLATE_RECEIPT,
      userId: sub.user_id,
      variables: {
        plan: sub.plan,
        amount: sub.amount_per_cycle,
        cycle,
        next_charge_at: next.toISOString().slice(0, 10),
        tid: resp.tid,
      },
    }).catch(() => {});

    return { subscriptionId: sub.id, outcome: "charged" };
  } catch (err) {
    // ── 4. 실패: 에러 코드 분류 → 재시도/강등 ──
    const code =
      err instanceof KakaoPayError
        ? err.code ?? err.message
        : err instanceof Error
        ? err.message
        : String(err);

    await admin
      .from("payments")
      .update({
        status: "failed",
        failed_at: now.toISOString(),
      })
      .eq("id", paymentId);

    const decision = decideRetry(code, sub.retry_count, now);

    if (decision.action === "inactive") {
      await admin
        .from("subscriptions")
        .update({
          status: "inactive",
          inactive_at: now.toISOString(),
          inactive_reason: decision.reason,
          grace_period_until: decision.gracePeriodUntil.toISOString(),
          last_charge_attempt_at: now.toISOString(),
          last_charge_error: code,
        })
        .eq("id", sub.id);
      return {
        subscriptionId: sub.id,
        outcome: "inactivated",
        detail: decision.reason,
      };
    }

    // retry_later — 일시 에러는 retry_count 미증가
    const nextRetry = countsTowardMax(code)
      ? sub.retry_count + 1
      : sub.retry_count;
    await admin
      .from("subscriptions")
      .update({
        retry_count: nextRetry,
        last_charge_attempt_at: now.toISOString(),
        last_charge_error: code,
      })
      .eq("id", sub.id);

    return {
      subscriptionId: sub.id,
      outcome: "retry_later",
      detail: `${code} (retry ${nextRetry}/${MAX_RETRIES}, next ${decision.nextAttemptAt.toISOString()})`,
    };
  }
}
