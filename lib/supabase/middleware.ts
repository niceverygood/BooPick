import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env 미설정 시 silent skip — 사이트 자체는 정상 응답
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  let user = null;
  try {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    );

    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error("[middleware] session refresh fail:", e);
  }

  // /agent/* 라우트 보호 (login, onboarding, callback 제외)
  const path = request.nextUrl.pathname;
  const PUBLIC_AGENT_PATHS = [
    "/agent/login",
    "/agent/onboarding", // 로그인 후만 접근 가능하지만 자체 가드
  ];

  if (
    path.startsWith("/agent") &&
    !PUBLIC_AGENT_PATHS.some((p) => path === p || path.startsWith(p + "/"))
  ) {
    if (!user) {
      const loginUrl = new URL("/agent/login", request.url);
      loginUrl.searchParams.set("next", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}
