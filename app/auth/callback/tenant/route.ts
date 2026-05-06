import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /auth/callback/tenant?code=...&next=/find/[id]
//   카카오 OAuth 후 임차인 흐름:
//   1. session 교환
//   2. tenants 테이블에 kakao_id 기준 upsert
//   3. anon_token 쿠키 있으면 기존 검색 이력을 tenant로 병합
//   4. next URL로 리다이렉트
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/find?error=no_code", url));
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
      new URL(`/?error=auth_failed`, url)
    );
  }

  const user = session.user;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const kakaoId = String(
    meta.provider_id ?? meta.sub ?? user.id ?? ""
  );
  const name =
    typeof meta.name === "string"
      ? meta.name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : (meta.user_name as string | undefined) ?? "임차인";
  const email = user.email ?? null;

  // tenants upsert (kakao_id 기준)
  try {
    const admin = createAdminClient();
    const anonToken = req.cookies.get("boopick_anon_token")?.value ?? null;

    const { data: existing } = await admin
      .from("tenants")
      .select("id, anon_token")
      .eq("kakao_id", kakaoId)
      .maybeSingle();

    let tenantId: string;
    if (existing?.id) {
      tenantId = existing.id;
      // 기존 tenant에 누락된 정보 보강
      await admin
        .from("tenants")
        .update({
          name,
          email,
          onboarded_at: new Date().toISOString(),
          ...(anonToken ? { anon_token: anonToken } : {}),
        })
        .eq("id", tenantId);
    } else {
      const { data: created, error: insertErr } = await admin
        .from("tenants")
        .insert({
          kakao_id: kakaoId,
          anon_token: anonToken,
          name,
          email,
          onboarded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insertErr || !created) {
        console.error("[auth/tenant] tenant insert 실패:", insertErr);
        return NextResponse.redirect(new URL("/?error=tenant_create", url));
      }
      tenantId = created.id;
    }

    // anon_token 검색 이력 병합 (tenant_searches.tenant_id = null인 row를 매칭)
    if (anonToken) {
      await admin
        .from("tenant_searches")
        .update({ tenant_id: tenantId })
        .eq("anon_token", anonToken)
        .is("tenant_id", null);
    }
  } catch (e) {
    console.error("[auth/tenant] 처리 실패:", e);
  }

  return NextResponse.redirect(new URL(next, url));
}
