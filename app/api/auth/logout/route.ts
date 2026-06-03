// 로그아웃 — 세션 쿠키 삭제 후 홈으로
//
// POST /api/auth/logout
//   1. supabase.auth.signOut() → 세션 쿠키 제거
//   2. / 로 303 redirect (POST → GET 변환)

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("[auth/logout] signOut fail:", e);
    // 실패해도 redirect 는 진행 — 쿠키 만료 자체는 보통 안 깨짐
  }
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
