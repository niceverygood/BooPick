import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env 미설정 시 세션 갱신 silent skip — 사이트 자체는 정상 작동
  // (예: Vercel 첫 배포 직후, 환경변수 등록 전)
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  try {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // 세션 갱신 (만료된 토큰 자동 refresh) — 실패해도 사이트는 정상 응답
    await supabase.auth.getUser();
  } catch (e) {
    // 미들웨어 실패가 모든 페이지를 500으로 만들지 않도록 swallow
    console.error("[middleware] Supabase session refresh failed:", e);
  }

  return response;
}
