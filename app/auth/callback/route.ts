// OAuth (카카오) 콜백 핸들러
//
// 흐름:
//   1. 프론트에서 supabase.auth.signInWithOAuth({ provider: 'kakao' }) 호출
//   2. Kakao 동의 후 Supabase auth (https://*.supabase.co/auth/v1/callback)로 리다이렉트
//   3. Supabase가 우리 앱 redirectTo URL로 다시 리다이렉트 (code 포함)
//   4. 이 라우트가 code를 session으로 교환 → 쿠키 세팅 → /dashboard
//
// PKCE 플로우 — @supabase/ssr 표준 패턴.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // Kakao 또는 Supabase 측 에러
  if (errorParam) {
    const msg = errorDesc ?? errorParam;
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(msg)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange fail:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "로그인 세션 교환 실패: " + error.message
      )}`
    );
  }

  // 세션 쿠키 세팅 완료 — 원하는 곳으로
  // next는 /dashboard, /admin/users 등 안전한 내부 경로만 허용
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
