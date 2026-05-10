-- =====================================================================
-- Phase 6 — Pro 베타 신청 테이블
-- Migration: 0004_beta_requests.sql
-- =====================================================================
--
-- 사용자가 Pro 베타 신청 폼 제출 시 1행 INSERT.
-- 어드민(한승수)이 검토 후 수동으로 profiles.tier = 'pro' 업데이트.
-- =====================================================================

CREATE TABLE IF NOT EXISTS beta_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  company text,                -- 소속 (예: "강남 부동산", "(주)부픽")
  experience_years int,        -- 업력 (년)
  current_tools text,          -- 현재 사용 도구 (예: "엑셀, 네이버부동산, 디스코")
  use_case text,               -- 사용 케이스 (자유 텍스트)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,                  -- 어드민 메모
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_requests_user_id ON beta_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_requests_status ON beta_requests(status);

ALTER TABLE beta_requests ENABLE ROW LEVEL SECURITY;

-- 본인 신청만 조회·생성
DROP POLICY IF EXISTS "beta_requests_self_select" ON beta_requests;
CREATE POLICY "beta_requests_self_select" ON beta_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "beta_requests_self_insert" ON beta_requests;
CREATE POLICY "beta_requests_self_insert" ON beta_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 어드민(service_role)은 모두 조회·업데이트 가능 (RLS 우회)

NOTIFY pgrst, 'reload schema';
