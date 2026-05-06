// 중개사 인증 헬퍼 (V2 Phase 1.5)
// 기존 lib/agent/demo-agency.ts를 대체. 진짜 OAuth 기반.
// 단, 로그인 안 된 컨텍스트(빌드 시점)나 데모 모드에서는 fallback.

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface AgentUser {
  id: string;
  agency_id: string;
  kakao_id: string | null;
  email: string | null;
  name: string;
  role: string;
}

export interface AgentAgency {
  id: string;
  name: string;
  plan_id: string | null;
  plan_started_at: string | null;
  trial_plan_id: string | null;
  trial_ends_at: string | null;
  share_pool_opted_in: boolean;
  business_registration_number: string | null;
  agent_phone: string | null;
  notification_consent: boolean;
  kakao_channel_url: string | null;
  onboarded_at: string | null;
}

const DEMO_AGENCY_NAME = "부픽 데모 사무소";

// 서버: 현재 로그인 사용자 (auth.users.id 기준 users 테이블)
export async function getCurrentUser(): Promise<AgentUser | null> {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from("users")
      .select("id, agency_id, kakao_id, email, name, role")
      .eq("id", user.id)
      .maybeSingle();

    return (data as AgentUser | null) ?? null;
  } catch {
    return null;
  }
}

// 서버: 현재 로그인 사용자의 agency
export async function getCurrentAgency(): Promise<AgentAgency | null> {
  const user = await getCurrentUser();
  if (user) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("agencies")
        .select(
          `id, name, plan_id, plan_started_at, trial_plan_id, trial_ends_at,
           share_pool_opted_in, business_registration_number,
           agent_phone, notification_consent, kakao_channel_url, onboarded_at`
        )
        .eq("id", user.agency_id)
        .maybeSingle();
      if (data) return data as AgentAgency;
    } catch {}
  }

  // OAuth 미설정·미로그인 시 데모 fallback (로컬 dev 편의)
  if (process.env.BOOPICK_DEMO_FALLBACK !== "false") {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("agencies")
        .select(
          `id, name, plan_id, plan_started_at, trial_plan_id, trial_ends_at,
           share_pool_opted_in, business_registration_number,
           agent_phone, notification_consent, kakao_channel_url, onboarded_at`
        )
        .eq("name", DEMO_AGENCY_NAME)
        .maybeSingle();
      if (data) return data as AgentAgency;
    } catch {}
  }
  return null;
}

export async function getCurrentAgencyId(): Promise<string | null> {
  const a = await getCurrentAgency();
  return a?.id ?? null;
}

export function isProActive(agency: AgentAgency | null): boolean {
  if (!agency) return false;
  // 트라이얼 활성
  if (
    agency.trial_plan_id &&
    agency.trial_ends_at &&
    new Date(agency.trial_ends_at) > new Date() &&
    agency.trial_plan_id !== "basic"
  ) {
    return true;
  }
  return ["pro", "enterprise", "success_fee"].includes(agency.plan_id ?? "");
}
