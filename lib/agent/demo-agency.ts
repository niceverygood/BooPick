// V2 Step 2~3 임시 — 카카오 OAuth 본격 도입(Step 3) 전까지
// 모든 /agent/* 페이지는 "부픽 데모 사무소"로 자동 로그인된 것처럼 동작.
//
// Step 3에서 실제 카카오 OAuth + auth.uid() → users.agency_id로 교체.

import { createAdminClient } from "@/lib/supabase/server";

export const DEMO_AGENCY_NAME = "부픽 데모 사무소";

export async function getCurrentAgencyId(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agencies")
      .select("id")
      .eq("name", DEMO_AGENCY_NAME)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export interface CurrentAgency {
  id: string;
  name: string;
  plan_id: string | null;
  plan_started_at: string | null;
  trial_plan_id: string | null;
  trial_ends_at: string | null;
  share_pool_opted_in: boolean;
  business_registration_number: string | null;
}

export async function getCurrentAgency(): Promise<CurrentAgency | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agencies")
      .select(
        "id, name, plan_id, plan_started_at, trial_plan_id, trial_ends_at, share_pool_opted_in, business_registration_number"
      )
      .eq("name", DEMO_AGENCY_NAME)
      .maybeSingle();
    return (data as CurrentAgency) ?? null;
  } catch {
    return null;
  }
}
