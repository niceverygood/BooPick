// Service-role Supabase client — RLS 우회 (어드민 API 전용)
//
// 절대 사용하지 말 것:
//   - 클라이언트 컴포넌트 (브라우저 노출 금지)
//   - 인증 외 일반 API 라우트 (RLS 보호 깨짐)
//
// 사용처:
//   - /api/admin/* (한대표 어드민 API)
//   - 백그라운드 job (cron 등)

import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let _admin: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다 (어드민 전용)"
    );
  }
  _admin = createSupabase<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
