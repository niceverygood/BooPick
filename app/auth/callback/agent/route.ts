import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /auth/callback/agent?code=...&next=/agent
//   카카오 OAuth 후 중개사 흐름:
//   1. session 교환
//   2. users 테이블 upsert (id = auth.users.id)
//   3. agency가 없으면 가벼운 placeholder agency 생성 → onboarding으로 강제 이동
//   4. agency가 있고 onboarded_at != null이면 next로
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/agent";

  if (!code) {
    return NextResponse.redirect(new URL("/agent/login?error=no_code", url));
  }

  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/?error=auth_misconfig", url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {}
      },
    },
  });

  const { data: session, error: authErr } =
    await supabase.auth.exchangeCodeForSession(code);
  if (authErr || !session.user) {
    return NextResponse.redirect(
      new URL("/agent/login?error=auth_failed", url)
    );
  }

  const user = session.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const kakaoId = String(
    meta.provider_id ?? meta.sub ?? user.id ?? ""
  );
  const displayName =
    typeof meta.name === "string"
      ? meta.name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : "사장님";
  const email = user.email ?? null;

  try {
    const admin = createAdminClient();

    // users upsert (auth.users.id와 동일 ID 사용)
    const { data: existingUser } = await admin
      .from("users")
      .select("id, agency_id")
      .eq("id", user.id)
      .maybeSingle();

    let agencyId: string | null = existingUser?.agency_id ?? null;

    if (!existingUser) {
      // 새 사용자 — agency 먼저 placeholder로 생성
      const { data: newAgency, error: aErr } = await admin
        .from("agencies")
        .insert({
          name: `${displayName}의 사무소`,
          plan_id: "basic",
          plan_started_at: new Date().toISOString(),
          // trial_plan_id, trial_ends_at은 onboarding 완료 시 부여
        })
        .select("id")
        .single();

      if (aErr || !newAgency) {
        console.error("[auth/agent] agency 생성 실패:", aErr);
        return NextResponse.redirect(
          new URL("/agent/login?error=agency_create", url)
        );
      }

      agencyId = newAgency.id;

      const { error: uErr } = await admin.from("users").insert({
        id: user.id,
        agency_id: agencyId,
        kakao_id: kakaoId,
        email,
        name: displayName,
        role: "admin",
      });

      if (uErr) {
        console.error("[auth/agent] users 생성 실패:", uErr);
      }
    }

    // agency의 onboarded_at 확인
    if (agencyId) {
      const { data: agency } = await admin
        .from("agencies")
        .select("onboarded_at")
        .eq("id", agencyId)
        .maybeSingle();

      if (!agency?.onboarded_at) {
        // 첫 로그인 또는 onboarding 미완료 → onboarding으로 강제
        return NextResponse.redirect(new URL("/agent/onboarding", url));
      }
    }
  } catch (e) {
    console.error("[auth/agent] 처리 실패:", e);
    return NextResponse.redirect(
      new URL("/agent/login?error=internal", url)
    );
  }

  return NextResponse.redirect(new URL(next, url));
}
