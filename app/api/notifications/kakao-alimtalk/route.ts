// 카카오 알림톡 발송 — 스텁 인터페이스 (외부 호출용)
//
// POST /api/notifications/kakao-alimtalk
//   Body: { template_id, recipient?, variables?, user_id? }
//   - 실제 발송은 카카오 비즈메시지 템플릿 승인 후 활성화
//   - 현재: queueAlimtalk() 으로 notification_logs 기록 + 콘솔 로그
//   - 인증: CRON_SECRET 또는 어드민. (cron/내부에서 직접 lib 호출이 기본,
//     이 라우트는 외부/수동 트리거용)

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueAlimtalk } from "@/lib/alimtalk";

export const runtime = "nodejs";

interface Body {
  template_id: string;
  recipient?: string | null;
  variables?: Record<string, unknown>;
  user_id?: string | null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (!body.template_id) {
    return NextResponse.json({ error: "template_id 필수" }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await queueAlimtalk(admin, {
    templateId: body.template_id,
    recipient: body.recipient ?? null,
    variables: body.variables ?? {},
    userId: body.user_id ?? null,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
