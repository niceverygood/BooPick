// V3 Phase 6 — 티어 체크 + 월간 사용량 카운터
//
// 흐름:
//   1. getCurrentProfile() — auth.uid() 기반 profile 조회 + 월 자동 리셋
//   2. checkReportLimit(profile) — { allowed, remaining, limit }
//   3. incrementReportCount(userId) — RPC 호출 (PDF 생성 성공 후)
//
// 자동 월 리셋: profile.reports_reset_at < 이번달 1일이면 카운터 0 리셋

import { createClient } from "@/lib/supabase/server";

export type Tier = "basic" | "pro";

export interface TierLimits {
  monthly_reports: number;
  industry_analysis: boolean;
  qr_codes: boolean;
  industries_supported: string[];
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  basic: {
    monthly_reports: 5,
    industry_analysis: false,
    qr_codes: false,
    // 일반 사무실(가중치 무업종)만. 결혼정보회사 산업 분석은 Pro 전용.
    industries_supported: ["사무실"],
  },
  pro: {
    monthly_reports: 50,
    industry_analysis: true,
    qr_codes: true,
    industries_supported: ["사무실", "결혼정보회사"],
  },
};

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  tier: Tier;
  reports_used_month: number;
  reports_reset_at: string;
  created_at?: string;
}

export interface ReportLimit {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

const ADMIN_EMAILS = new Set([
  "seungsoo@bottle.kr",
  "niceverygood1@gmail.com",  // 한승수 대표 (개인 dev)
  "dev@bottlecorp.kr",        // Bottle Corp dev 계정 (Kakao 로그인)
]);

export function isAdmin(profile: Profile | null): boolean {
  if (!profile?.email) return false;
  return ADMIN_EMAILS.has(profile.email);
}

// auth.uid() 기반 profile 조회 + 자동 월 리셋
//
// "이번 달 1일 이후 reports_reset_at이 있는가?" 검사:
//   reports_reset_at < {YYYY-MM-01} 이면:
//     reports_used_month = 0
//     reports_reset_at = today
//   업데이트 후 다시 조회.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("id, email, name, tier, reports_used_month, reports_reset_at, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return null;

  const profile = row as Profile;

  // 월 리셋 체크
  const today = new Date();
  const startOfMonth = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-01`;
  const resetAt = profile.reports_reset_at?.slice(0, 10) ?? "1970-01-01";

  if (resetAt < startOfMonth) {
    const { data: updated } = await supabase
      .from("profiles")
      .update({
        reports_used_month: 0,
        reports_reset_at: today.toISOString().slice(0, 10),
      })
      .eq("id", user.id)
      .select("id, email, name, tier, reports_used_month, reports_reset_at, created_at")
      .single();
    return (updated as Profile) ?? profile;
  }

  return profile;
}

export function checkReportLimit(profile: Profile): ReportLimit {
  const limit = TIER_LIMITS[profile.tier].monthly_reports;
  const used = profile.reports_used_month;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}

// RPC 호출 — DB 함수 (0003_functions.sql)
export async function incrementReportCount(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_report_count", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[tier] increment fail:", error.message);
    // RPC 실패 시 fallback: 직접 update
    await supabase
      .from("profiles")
      .update({ reports_used_month: (await getCurrentUsedFromDB(userId)) + 1 })
      .eq("id", userId);
  }
}

async function getCurrentUsedFromDB(userId: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("reports_used_month")
    .eq("id", userId)
    .maybeSingle();
  return (data as { reports_used_month?: number } | null)?.reports_used_month ?? 0;
}

// 산업 분석 가능 여부 (티어 + 산업 지원 명단 모두 만족)
export function canUseIndustryAnalysis(
  profile: Profile,
  industry: string | null
): boolean {
  if (!industry) return true; // 산업 미선택은 분석 안 함
  if (industry === "사무실" || industry === "일반") return true; // 무업종은 누구나
  return TIER_LIMITS[profile.tier].industry_analysis;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
