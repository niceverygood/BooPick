// Phase 2 정기 차회 결제 — 시나리오 ①~⑤ 자동 검증 (실결제 X, mock)
//
// 실행: npx tsx scripts/test-charge-subscriptions.ts
//
// 한 프로세스에서 process.env.KAKAOPAY_MOCK 을 시나리오별로 바꿔
// chargeSubscription() 을 직접 호출 → 실제 Supabase 로 상태 검증.
// 테스트 구독(sid='MOCK_SID_TEST')은 끝나면 모두 삭제.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../lib/supabase/admin";
import {
  chargeSubscription,
  type SubscriptionRow,
} from "../app/api/cron/charge-subscriptions/charge";

const TEST_SID_PREFIX = "MOCK_SID_TEST";
let sidCounter = 0;
function nextTestSid(): string {
  return `${TEST_SID_PREFIX}_${Date.now()}_${++sidCounter}`;
}
const SUB_COLS =
  "id, user_id, cid, sid, plan, amount_per_cycle, billing_cycle, status, retry_count, next_charge_at";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}${extra ? ` — ${extra}` : ""}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

async function main() {
  const admin = createAdminClient();

  // 실제 user_id 1개 확보
  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("id, email")
    .limit(1)
    .maybeSingle();
  if (profErr || !prof) {
    console.error("프로필이 없습니다. 먼저 회원가입 1명 필요.", profErr?.message);
    process.exit(1);
  }
  const userId = (prof as { id: string }).id;
  console.log(`[test] user_id=${userId}\n`);

  async function insertSub(
    cycle: "monthly" | "yearly",
    retryCount: number
  ): Promise<SubscriptionRow> {
    const amount = cycle === "yearly" ? 470000 : 49000;
    const past = new Date(Date.now() - 60_000).toISOString(); // 1분 전 (due)
    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        user_id: userId,
        cid: "TCSUBSCRIP",
        sid: nextTestSid(),
        plan: "pro",
        amount_per_cycle: amount,
        billing_cycle: cycle,
        status: "active",
        started_at: new Date().toISOString(),
        next_charge_at: past,
        retry_count: retryCount,
      })
      .select(SUB_COLS)
      .single();
    if (error) throw new Error(`insertSub fail: ${error.message}`);
    return data as SubscriptionRow;
  }

  async function getSub(id: string) {
    const { data } = await admin
      .from("subscriptions")
      .select(
        "id, status, retry_count, next_charge_at, last_charge_error, grace_period_until, inactive_reason"
      )
      .eq("id", id)
      .single();
    return data as {
      status: string;
      retry_count: number;
      next_charge_at: string | null;
      last_charge_error: string | null;
      grace_period_until: string | null;
      inactive_reason: string | null;
    };
  }

  async function countApproved(subId: string) {
    const { count } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", subId)
      .eq("status", "approved");
    return count ?? 0;
  }

  // ── ① 정상 결제 ──
  console.log("① 정상 결제 (mock success)");
  process.env.KAKAOPAY_MOCK = "success";
  {
    const sub = await insertSub("monthly", 0);
    const r = await chargeSubscription(admin, sub);
    check("outcome=charged", r.outcome === "charged", r.outcome);
    const after = await getSub(sub.id);
    const advanced =
      after.next_charge_at != null &&
      new Date(after.next_charge_at).getTime() > Date.now() + 20 * 24 * 3600_000;
    check("next_charge_at +1개월 전진", advanced, after.next_charge_at ?? "null");
    check("retry_count=0", after.retry_count === 0);
    check("approved payment 1건", (await countApproved(sub.id)) === 1);

    // ── ② 멱등성 (같은 날 재호출) ──
    console.log("② 멱등성 (동일 구독 재호출)");
    const r2 = await chargeSubscription(admin, sub);
    check("outcome=skipped_duplicate", r2.outcome === "skipped_duplicate", r2.outcome);
    check("approved payment 여전히 1건", (await countApproved(sub.id)) === 1);
  }

  // ── ③ 잔액 부족 → 재시도 ──
  console.log("③ 잔액 부족 (mock error:INSUFFICIENT_BALANCE)");
  process.env.KAKAOPAY_MOCK = "error:INSUFFICIENT_BALANCE";
  {
    const sub = await insertSub("monthly", 0);
    const r = await chargeSubscription(admin, sub);
    check("outcome=retry_later", r.outcome === "retry_later", r.detail ?? "");
    const after = await getSub(sub.id);
    check("retry_count=1", after.retry_count === 1, `retry=${after.retry_count}`);
    check("status 여전히 active", after.status === "active");
    check("last_charge_error 기록", !!after.last_charge_error);
  }

  // ── ④ 최대 재시도 초과 → 강등 ──
  console.log("④ 최대 재시도 초과 (retry_count=2 에서 또 실패)");
  process.env.KAKAOPAY_MOCK = "error:INSUFFICIENT_BALANCE";
  {
    const sub = await insertSub("monthly", 2);
    const r = await chargeSubscription(admin, sub);
    check("outcome=inactivated", r.outcome === "inactivated", r.detail ?? "");
    const after = await getSub(sub.id);
    check("status=inactive", after.status === "inactive");
    const grace =
      after.grace_period_until != null &&
      new Date(after.grace_period_until).getTime() > Date.now() + 6 * 24 * 3600_000;
    check("grace_period +7일", grace, after.grace_period_until ?? "null");
  }

  // ── ⑤ 카드 만료/SID 무효 → 즉시 강등 ──
  console.log("⑤ SID 무효 (mock error:SID_INVALID) — 즉시 강등");
  process.env.KAKAOPAY_MOCK = "error:SID_INVALID";
  {
    const sub = await insertSub("monthly", 0); // retry 0 이어도 즉시 inactive
    const r = await chargeSubscription(admin, sub);
    check("outcome=inactivated", r.outcome === "inactivated", r.detail ?? "");
    const after = await getSub(sub.id);
    check("status=inactive", after.status === "inactive");
    check(
      "inactive_reason=card_dead*",
      (after.inactive_reason ?? "").startsWith("card_dead"),
      after.inactive_reason ?? "null"
    );
  }

  // ── 정리: 테스트 구독·결제 삭제 ──
  console.log("\n[cleanup] 테스트 구독·결제 삭제");
  const { data: testSubs } = await admin
    .from("subscriptions")
    .select("id")
    .like("sid", `${TEST_SID_PREFIX}%`);
  const ids = ((testSubs as { id: string }[] | null) ?? []).map((s) => s.id);
  if (ids.length) {
    await admin.from("payments").delete().in("subscription_id", ids);
    await admin.from("subscriptions").delete().in("id", ids);
    console.log(`  삭제: 구독 ${ids.length}건 + 연결 결제`);
  }

  console.log(`\n═══ 결과: ✅ ${pass} / ❌ ${fail} ═══`);
  process.env.KAKAOPAY_MOCK = "";
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("테스트 실패:", e);
  process.exit(1);
});
