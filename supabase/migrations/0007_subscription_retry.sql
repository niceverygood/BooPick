-- =====================================================================
-- Phase V3+ — 정기 차회 자동 결제: 재시도·멱등·알림 로그
-- Migration: 0007_subscription_retry.sql
-- =====================================================================
--
-- 0006 이후 추가:
--   1) subscriptions: 재시도 상태 + 결제 주기(billing_cycle) + 유예기간
--   2) payments: 멱등 키(idempotency_key) + subscription_id + tid nullable
--      · 정기 차회는 사전 발급 tid 가 없으므로 tid NOT NULL 해제
--   3) notification_logs: 알림톡 발송 로그 (스텁 단계, 콘솔 + DB 기록)
-- =====================================================================

-- 1. subscriptions 재시도/주기/유예 컬럼
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS retry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_charge_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_charge_error text,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly'));

-- 기존 active 구독 billing_cycle 백필 (연간가 이상이면 yearly)
UPDATE subscriptions
SET billing_cycle = 'yearly'
WHERE amount_per_cycle >= 400000 AND billing_cycle = 'monthly';

-- 2. payments 멱등/연결/tid nullable
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS subscription_id uuid
    REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE payments ALTER COLUMN tid DROP NOT NULL;

-- idempotency_key UNIQUE (NULL 은 서로 distinct → 기존 단건/첫결제 행에 영향 없음)
-- 형태: "${subscription_id}:${YYYYMMDD(KST)}" → 같은 구독 같은 날 1회만
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_key
  ON payments(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id
  ON payments(subscription_id);

-- 3. notification_logs (알림톡 스텁)
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'kakao_alimtalk',
  template_id text,
  recipient_masked text,          -- PII 마스킹된 수신자 (전화/이메일)
  variables jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id
  ON notification_logs(user_id);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_logs_self_select" ON notification_logs;
CREATE POLICY "notification_logs_self_select" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);
-- insert/update 는 service_role 만 (cron·서버 라우트)

-- 4. PostgREST schema reload
NOTIFY pgrst, 'reload schema';
