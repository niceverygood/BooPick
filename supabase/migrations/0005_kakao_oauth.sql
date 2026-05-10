-- =====================================================================
-- Phase 6+ — Kakao OAuth 지원 (handle_new_user 트리거 강화)
-- Migration: 0005_kakao_oauth.sql
-- =====================================================================
--
-- 변경 사항:
--   - Kakao OAuth 사용자는 NEW.email이 NULL일 수 있음
--     ("Allow users without an email" 옵션 활성 시)
--   - Kakao raw_user_meta_data 필드 매핑:
--       name           ← Supabase Kakao provider 표준 필드
--       nickname       ← Kakao 자체 필드
--       preferred_username ← OIDC 표준
--   - 모두 NULL이면 'User' fallback (NOT NULL 제약 없으므로 유연)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, tier)
  VALUES (
    NEW.id,
    NEW.email,    -- nullable (Kakao 비공개 동의 시 NULL)
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nickname'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
      NEW.email,
      'User'
    ),
    'basic'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거는 0001에서 이미 만들었으므로 그대로 — 함수만 교체.

NOTIFY pgrst, 'reload schema';
