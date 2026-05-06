-- =====================================================================
-- BooPick V2 — 카카오 OAuth 적응 + 알림 인프라
-- Migration: 0010_oauth_and_notify.sql
-- =====================================================================

-- 1. 0005 가입 트리거 비활성화
--    → 카카오 OAuth 후 진입점에 따라 (임차인/중개사) 처리 흐름이 달라야 함
--    → /auth/callback/{tenant|agent}에서 직접 처리
drop trigger if exists on_auth_user_created on auth.users;

-- 2. tenants 보강 — 가입 + 컨택 정책
alter table public.tenants
  add column if not exists onboarded_at timestamptz,
  add column if not exists notify_consent boolean not null default false;

-- 3. agencies 보강 — 알림 / 트라이얼 / 카톡 채널
alter table public.agencies
  add column if not exists owner_user_id uuid references public.users(id),
  add column if not exists agent_phone text,
  add column if not exists notification_consent boolean not null default false,
  add column if not exists kakao_channel_url text,
  add column if not exists onboarded_at timestamptz;

-- trial_ends_at은 0001에서 이미 있음 (트라이얼 종료일)

-- 4. tenant_inquiries 보강 — 알림 발송 결과 추적
alter table public.tenant_inquiries
  add column if not exists notification_sent_at timestamptz,
  add column if not exists notification_channel text,
  add column if not exists notification_cost numeric;

-- 5. RLS 정책 보완 — anon이 tenants self-insert 가능 (callback에서 service_role 사용하지만 명시)
drop policy if exists "tenants self by kakao" on public.tenants;
create policy "tenants self by kakao"
  on public.tenants for select
  using (kakao_id is not null and kakao_id = (auth.jwt() ->> 'kakao_id'));

drop policy if exists "tenants insert via service" on public.tenants;
create policy "tenants insert via service"
  on public.tenants for insert
  with check (false);  -- service_role만 insert (RLS 우회)

-- 6. PostgREST schema cache reload
notify pgrst, 'reload schema';
