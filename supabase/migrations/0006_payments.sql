-- =====================================================================
-- Phase V3+ — 카카오페이 결제 (단건 + 정기)
-- Migration: 0006_payments.sql
-- =====================================================================
--
-- 두 테이블:
--   1) payments      — 모든 결제 이벤트(단건 1건 = 1행, 정기 첫 결제·차회 결제도 1행씩)
--   2) subscriptions — 정기결제 키(sid) 보관. user_id 당 1개의 active.
--
-- 흐름:
--   READY → tid 발급 → payments INSERT (status='ready')
--   APPROVE → status='approved' + approved_at
--     ↳ 정기 첫 결제면 subscriptions INSERT (sid, status='active')
--     ↳ profiles.tier='pro' 자동 업데이트
--   CANCEL/FAIL → status='canceled' / 'failed'
--   정기 차회 → 기존 subscriptions.sid 로 charge → payments INSERT
--   해지 → subscriptions.status='inactive' + inactive_at
-- =====================================================================

-- 1. payments — 결제 이벤트 1행
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 결제 종류
  type text NOT NULL CHECK (type IN ('onetime', 'subscription_first', 'subscription_recurring')),
  -- 카카오페이 식별자
  cid text NOT NULL,                       -- TC0ONETIME / TCSUBSCRIP / 운영 CID
  tid text NOT NULL,                       -- 거래 고유 번호 (카카오페이 발급)
  partner_order_id text NOT NULL,          -- 우리쪽 주문 번호 (uuid)
  partner_user_id text NOT NULL,           -- 사용자 식별자 (=user_id)
  item_name text NOT NULL,
  -- 금액 (원)
  total_amount integer NOT NULL,
  tax_free_amount integer NOT NULL DEFAULT 0,
  vat_amount integer,                      -- 승인 후 카카오가 계산해 반환
  -- 상태
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'approved', 'canceled', 'failed', 'refunded')),
  -- 승인 정보
  aid text,                                -- 카카오페이 승인 번호 (approve 응답)
  payment_method_type text,                -- "MONEY" / "CARD" 등
  approved_at timestamptz,
  canceled_at timestamptz,
  failed_at timestamptz,
  -- 정기결제 시 발급되는 SID (정기결제 첫 결제 승인 시에만)
  sid text,
  -- raw 응답 보관 (디버그 + 환불 등)
  raw_ready_response jsonb,
  raw_approve_response jsonb,
  -- 생성/갱신
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tid ON payments(tid);
CREATE INDEX IF NOT EXISTS idx_payments_partner_order_id ON payments(partner_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 2. subscriptions — 정기결제 키
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cid text NOT NULL,                       -- TCSUBSCRIP or 운영
  sid text NOT NULL UNIQUE,                -- 정기결제 키
  plan text NOT NULL DEFAULT 'pro',        -- 'pro' / future tiers
  amount_per_cycle integer NOT NULL,       -- 매월 청구 금액 (원)
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'paused')),
  started_at timestamptz DEFAULT now(),
  last_charged_at timestamptz,
  next_charge_at timestamptz,
  inactive_at timestamptz,
  inactive_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge ON subscriptions(next_charge_at)
  WHERE status = 'active';

-- 3. RLS — 본인 결제만 조회
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_self_select" ON payments;
CREATE POLICY "payments_self_select" ON payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_self_select" ON subscriptions;
CREATE POLICY "subscriptions_self_select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE 는 service_role 만 (서버 API 라우트에서 처리, RLS 우회)

-- 4. updated_at 트리거 (이미 trigger_set_updated_at 함수 있음 - 0001 에서 생성)
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. PostgREST schema reload
NOTIFY pgrst, 'reload schema';
