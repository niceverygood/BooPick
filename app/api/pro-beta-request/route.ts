import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/pro-beta-request
//   body: { company?, experience_years?, current_tools?, use_case? }
//   - 본인 user_id로 beta_requests row 1건 INSERT
//   - 동일 사용자 이미 pending 상태면 409
//   - (선택) 한대표 알림 — V2에서 Slack/이메일 webhook 통합
//
// 응답: { ok, request_id }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  // 이미 pending 신청 있으면 409
  const { data: existing } = await supabase
    .from("beta_requests")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "Already pending",
        message: "이미 신청하신 내역이 있습니다. 24시간 내 한대표가 검토 후 안내드립니다.",
        request_id: (existing as { id: string }).id,
      },
      { status: 409 }
    );
  }

  // 이미 Pro면 409
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  if ((profile as { tier?: string } | null)?.tier === "pro") {
    return NextResponse.json(
      { error: "Already Pro", message: "이미 Pro 티어입니다." },
      { status: 409 }
    );
  }

  const company = strField(body.company);
  const experienceYears = numField(body.experience_years);
  const currentTools = strField(body.current_tools);
  const useCase = strField(body.use_case);

  const { data: row, error } = await supabase
    .from("beta_requests")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      company,
      experience_years: experienceYears,
      current_tools: currentTools,
      use_case: useCase,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: "신청 실패", detail: error?.message },
      { status: 500 }
    );
  }

  // TODO V2: 한대표 알림 — Slack webhook / Resend 이메일
  console.log(
    `[beta] new Pro request: ${user.email} (${company ?? "?"})`
  );

  return NextResponse.json({
    ok: true,
    request_id: row.id,
    message: "신청이 접수되었습니다. 24시간 내 한대표가 검토 후 이메일로 안내드립니다.",
  });
}

function strField(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t.slice(0, 500) : null;
}

function numField(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
