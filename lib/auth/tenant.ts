// 임차인 인증 헬퍼 (V2 Phase 1.5)

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface TenantRecord {
  id: string;
  kakao_id: string | null;
  anon_token: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  notify_consent: boolean;
  onboarded_at: string | null;
}

// 클라이언트: 카카오 로그인 시작
export async function signInWithKakao(redirectTo: string): Promise<void> {
  const supabase = createBrowserClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const next = encodeURIComponent(redirectTo);

  await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: {
      redirectTo: `${siteUrl}/auth/callback/tenant?next=${next}`,
    },
  });
}

// 서버: 현재 로그인한 임차인
export async function getCurrentTenant(): Promise<TenantRecord | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const kakaoId = String(meta.provider_id ?? meta.sub ?? "");
    if (!kakaoId) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select(
        "id, kakao_id, anon_token, name, email, phone, notify_consent, onboarded_at"
      )
      .eq("kakao_id", kakaoId)
      .maybeSingle();
    return (data as TenantRecord | null) ?? null;
  } catch {
    return null;
  }
}
