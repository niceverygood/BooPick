// V3 Phase 6+ — 티어 시스템 + 권한 매트릭스
//
// 흐름:
//   1. getCurrentProfile() — auth.uid() 기반 + 월 자동 리셋
//   2. checkReportLimit(profile) / canUseFeature(profile, 'crm') / ...
//   3. incrementReportCount(userId) — RPC 호출
//
// 매트릭스 (4-tier 설계, 현재 V1: Free + Pro만 활성):
//   Free  — 5 PDF/월, 데이터셋 1개, 30일 보관, 워터마크 ON
//   Pro   — 50 PDF/월, 무제한 데이터셋, 영구, 워터마크 OFF, 모든 V1 기능
//   Team  — Pro + 협업 (V1.5)
//   Enterprise — Team + API + SSO (V3+)

import { createClient } from "@/lib/supabase/server";

export type Tier = "basic" | "pro";

export interface TierLimits {
  // 사용량 제한
  monthly_reports: number;
  monthly_datasets: number;          // basic 1, pro Infinity
  retention_days: number | null;     // 데이터셋 자동 삭제 기한 (null = 영구)

  // 기능 게이트
  industry_analysis: boolean;        // Pro 산업 관점 분석 (결혼정보회사 등)
  qr_codes: boolean;                 // PDF QR + 네이버 링크
  industries_supported: string[];    // 지원 산업 목록 (display_name 기준)
  kakao_send: boolean;               // 카톡 알림톡 발송
  email_send: boolean;               // 이메일 발송
  crm: boolean;                      // 의뢰자 CRM
  memo: boolean;                     // 매물 메모
  calendar: boolean;                 // 답사 캘린더 연동
  market_analysis: boolean;          // 시세 대비 분석 (V2.5)
  distance_sort: boolean;            // 거리 기반 정렬 (V2.5)
  watermark_pdf: boolean;            // PDF 워터마크 (Basic=true)
  brand_pdf: boolean;                // 사장님 로고/사인 PDF
  tax_invoice: boolean;              // 세금계산서
  priority_support: boolean;         // 우선 지원
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  basic: {
    monthly_reports: 5,
    monthly_datasets: 1,
    retention_days: 30,

    industry_analysis: false,
    qr_codes: false,
    industries_supported: ["사무실"],  // 일반 사무실만
    kakao_send: false,
    email_send: false,
    crm: false,
    memo: false,
    calendar: false,
    market_analysis: false,
    distance_sort: false,
    watermark_pdf: true,                // ⭐ Free는 워터마크 ON
    brand_pdf: false,
    tax_invoice: false,
    priority_support: false,
  },
  pro: {
    monthly_reports: 50,
    monthly_datasets: Number.POSITIVE_INFINITY,
    retention_days: null,                // 영구 보관

    industry_analysis: true,
    qr_codes: true,
    industries_supported: ["사무실", "결혼정보회사"],
    kakao_send: true,
    email_send: true,
    crm: true,
    memo: true,
    calendar: true,
    market_analysis: true,
    distance_sort: true,
    watermark_pdf: false,
    brand_pdf: false,                    // Team 이상에서 (V1.5)
    tax_invoice: true,
    priority_support: false,             // Team부터 우선 지원
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

// ============================================================
// Profile 조회 + 자동 월 리셋

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

// ============================================================
// Limit / Feature 체크

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

// 데이터셋 개수 한도 체크 (Basic: 1개)
//   현재 데이터셋 수를 받아서 새로 만들 수 있는지 판단.
export function checkDatasetLimit(
  profile: Profile,
  currentCount: number
): { allowed: boolean; limit: number; current: number } {
  const limit = TIER_LIMITS[profile.tier].monthly_datasets;
  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
  };
}

// 산업 분석 가능 여부 (티어 + 산업 지원 명단 모두 만족)
export function canUseIndustryAnalysis(
  profile: Profile,
  industry: string | null
): boolean {
  if (!industry) return true;
  if (industry === "사무실" || industry === "일반") return true;
  return TIER_LIMITS[profile.tier].industry_analysis;
}

// 범용 feature 체크 — 새 기능 추가 시 TierLimits에 추가하고 여기서 검사
export type FeatureKey =
  | "qr_codes"
  | "kakao_send"
  | "email_send"
  | "crm"
  | "memo"
  | "calendar"
  | "market_analysis"
  | "distance_sort"
  | "brand_pdf"
  | "tax_invoice"
  | "priority_support";

export function canUseFeature(profile: Profile, feature: FeatureKey): boolean {
  return !!TIER_LIMITS[profile.tier][feature];
}

// PDF 워터마크 표시 여부 (Basic만 true)
export function shouldShowWatermark(profile: Profile | null): boolean {
  if (!profile) return true;  // 미인증 또는 fallback
  return TIER_LIMITS[profile.tier].watermark_pdf;
}

// 데이터셋 만료 일자 계산 (Basic만 한정)
//   uploaded_at 기준 + retention_days → 만료일 ISO string
//   Pro는 null 반환 (영구).
export function datasetExpiresAt(
  profile: Profile,
  uploadedAt: string | Date
): string | null {
  const days = TIER_LIMITS[profile.tier].retention_days;
  if (days == null) return null;
  const upload = new Date(uploadedAt);
  const expiry = new Date(upload);
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
}

// 만료일까지 남은 일수
export function daysUntilExpiry(
  profile: Profile,
  uploadedAt: string | Date
): number | null {
  const days = TIER_LIMITS[profile.tier].retention_days;
  if (days == null) return null;
  const upload = new Date(uploadedAt);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - upload.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days - elapsed);
}

// ============================================================
// RPC

export async function incrementReportCount(userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("increment_report_count", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[tier] increment fail:", error.message);
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
