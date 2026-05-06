import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyAgentOfInquiry } from "@/lib/notify";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET/POST /api/cron/retry-notifications
//   header: x-cron-secret (env ADMIN_CRON_SECRET 일치 필요)
//
//   1. notify_status='failed' 또는 ('pending' AND created_at > 5분 전) inquiry 조회
//   2. 각각 notifyAgentOfInquiry 재시도
//   3. 3회 실패 시 closed_reason='notify_failed_3x'로 마킹
//
//   Vercel Cron 또는 외부 cron으로 5분 간격 호출 권장.
async function handle(req: NextRequest) {
  const expected = process.env.ADMIN_CRON_SECRET;
  if (expected) {
    const provided = req.headers.get("x-cron-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: "DB 연결 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 재시도 대상
  const { data: pending, error } = await admin
    .from("tenant_inquiries")
    .select("id, notify_status, created_at, closed_reason")
    .or(`notify_status.eq.failed,and(notify_status.eq.pending,created_at.lt.${fiveMinAgo})`)
    .neq("closed_reason", "notify_failed_3x")
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "쿼리 실패", detail: error.message },
      { status: 500 }
    );
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, retried: 0, message: "재시도 대상 없음" });
  }

  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const inq of pending) {
    try {
      const r = await notifyAgentOfInquiry({ inquiry_id: inq.id });
      results.push({
        id: inq.id,
        success: r.success,
        error: r.success ? undefined : (r as { error: string }).error,
      });
    } catch (e) {
      results.push({
        id: inq.id,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // 3회 이상 실패한 inquiry 마킹 (notify_status를 단순 카운트로는 못 보지만,
  // 일정 시간 이상 failed 상태인 것 차단)
  const oldFailures = pending.filter(
    (p) =>
      p.notify_status === "failed" &&
      new Date(p.created_at).getTime() < Date.now() - 2 * 60 * 60 * 1000
  );
  for (const f of oldFailures) {
    await admin
      .from("tenant_inquiries")
      .update({ closed_reason: "notify_failed_3x" })
      .eq("id", f.id);
  }

  return NextResponse.json({
    ok: true,
    retried: results.length,
    success: results.filter((r) => r.success).length,
    failures: results.filter((r) => !r.success).length,
    results,
  });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
