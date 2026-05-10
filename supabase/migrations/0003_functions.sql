-- =====================================================================
-- Phase 6 — 티어 시스템 RPC 함수
-- Migration: 0003_functions.sql
-- =====================================================================
--
-- 함수:
--   1. increment_report_count(p_user_id) — PDF 생성 성공 후 호출, +1
--   2. reset_monthly_usage_if_needed(p_user_id) — 이번 달 1일 이후 첫 호출 시 0 리셋
--   3. set_user_tier(p_user_id, p_tier) — 어드민 전용 (RLS X, service_role 필요)
-- =====================================================================

-- 1. 리포트 카운터 +1
CREATE OR REPLACE FUNCTION increment_report_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET reports_used_month = reports_used_month + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_report_count(uuid) TO authenticated;

-- 2. 월 리셋 (lib/tier-check.ts에서 호출하지 않지만 cron / 어드민용 백업)
CREATE OR REPLACE FUNCTION reset_monthly_usage_if_needed(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_reset_at date;
  v_first_of_month date;
BEGIN
  SELECT reports_reset_at INTO v_reset_at
  FROM public.profiles
  WHERE id = p_user_id;

  v_first_of_month := date_trunc('month', CURRENT_DATE)::date;

  IF v_reset_at IS NULL OR v_reset_at < v_first_of_month THEN
    UPDATE public.profiles
    SET reports_used_month = 0,
        reports_reset_at = CURRENT_DATE
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_monthly_usage_if_needed(uuid) TO authenticated;

-- 3. 어드민: 사용자 티어 변경 (service_role로만 호출 — Edge Function/admin API에서)
CREATE OR REPLACE FUNCTION set_user_tier(p_user_id uuid, p_tier text)
RETURNS void AS $$
BEGIN
  IF p_tier NOT IN ('basic', 'pro') THEN
    RAISE EXCEPTION 'Invalid tier: %', p_tier;
  END IF;

  UPDATE public.profiles
  SET tier = p_tier
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- service_role만 직접 호출 가능 (admin API에서 service client로)
REVOKE ALL ON FUNCTION set_user_tier(uuid, text) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
