// Basic 티어 데이터셋 자동 정리 (30일 경과 시 삭제)
//
// 트리거: Vercel Cron (매일 KST 00:30, UTC 15:30)
//   → vercel.json crons 설정 참조
//
// 보안:
//   - Vercel Cron은 Authorization: Bearer ${CRON_SECRET} 헤더로 호출
//   - CRON_SECRET env 검증 (Vercel 환경에서 자동 주입)
//
// 동작:
//   1. profiles WHERE tier='basic' 사용자 목록
//   2. 그 사용자들의 datasets WHERE uploaded_at < now() - 30 days
//   3. CASCADE 삭제 (listings도 같이 제거됨)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LIMITS } from "@/lib/tier-check";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron 인증 — Authorization 헤더 확인
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET) {
    console.warn("[cron] CRON_SECRET 미설정 — 인증 건너뜀 (dev 환경)");
  } else if (auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const retentionDays = TIER_LIMITS.basic.retention_days;
  if (retentionDays == null) {
    return NextResponse.json({
      ok: true,
      message: "Basic 티어가 영구 보관으로 설정됨 — 정리 작업 스킵",
    });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffIso = cutoff.toISOString();

  const admin = createAdminClient();

  // 1. Basic 사용자 ID 목록
  const { data: basicUsers, error: usersErr } = await admin
    .from("profiles")
    .select("id")
    .eq("tier", "basic");

  if (usersErr) {
    console.error("[cron] basic users fetch fail:", usersErr.message);
    return NextResponse.json(
      { error: "users fetch fail", detail: usersErr.message },
      { status: 500 }
    );
  }

  const basicUserIds = ((basicUsers as { id: string }[] | null) ?? []).map(
    (u) => u.id
  );

  if (basicUserIds.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      message: "Basic 사용자 없음",
    });
  }

  // 2. 만료 데이터셋 조회 (로깅용)
  const { data: expired } = await admin
    .from("datasets")
    .select("id, user_id, name, uploaded_at")
    .in("user_id", basicUserIds)
    .lt("uploaded_at", cutoffIso);

  const expiredList = (expired as Array<{
    id: string;
    user_id: string;
    name: string;
    uploaded_at: string;
  }> | null) ?? [];

  if (expiredList.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      message: "정리 대상 없음",
      cutoff: cutoffIso,
    });
  }

  // 3. 삭제 (listings는 CASCADE)
  const idsToDelete = expiredList.map((d) => d.id);
  const { error: delErr } = await admin
    .from("datasets")
    .delete()
    .in("id", idsToDelete);

  if (delErr) {
    console.error("[cron] delete fail:", delErr.message);
    return NextResponse.json(
      { error: "delete fail", detail: delErr.message },
      { status: 500 }
    );
  }

  console.log(
    `[cron] cleanup: ${expiredList.length}개 데이터셋 삭제 (cutoff: ${cutoffIso})`
  );

  return NextResponse.json({
    ok: true,
    deleted: expiredList.length,
    cutoff: cutoffIso,
    retention_days: retentionDays,
    sample: expiredList.slice(0, 5).map((d) => ({
      id: d.id,
      name: d.name,
      uploaded_at: d.uploaded_at,
    })),
  });
}
