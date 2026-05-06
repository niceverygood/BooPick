-- =====================================================================
-- BooPick V2 — Funnel 트래킹 + 광고비 (CAC 측정)
-- Migration: 0011_funnel_tracking.sql
-- =====================================================================

-- 1. funnel_events — 임차인 행동 이벤트
create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  anon_token text,
  event_type text not null,
  -- 'landing_view' | 'search' | 'listing_view' | 'inquiry_click'
  -- | 'inquiry_submit' | 'agent_contacted' | 'meeting' | 'contracted'
  listing_id uuid references public.listings(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referer text,
  user_agent text,
  device_type text,  -- 'mobile' | 'desktop' | 'tablet'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_funnel_events_tenant on public.funnel_events(tenant_id) where tenant_id is not null;
create index if not exists idx_funnel_events_anon on public.funnel_events(anon_token) where anon_token is not null;
create index if not exists idx_funnel_events_type on public.funnel_events(event_type, created_at desc);
create index if not exists idx_funnel_events_utm on public.funnel_events(utm_source, utm_campaign);
create index if not exists idx_funnel_events_created on public.funnel_events(created_at desc);
create index if not exists idx_funnel_events_listing on public.funnel_events(listing_id) where listing_id is not null;

-- 2. ad_spends — 광고비 수동 입력
create table if not exists public.ad_spends (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  channel text not null,
  -- 'meta' | 'google' | 'naver' | 'kakao_moment' | 'instagram' | 'opentalk' | 'manual'
  campaign text,
  amount bigint not null,  -- 원 단위
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ad_spends_date on public.ad_spends(date desc);
create index if not exists idx_ad_spends_channel on public.ad_spends(channel, date desc);

drop trigger if exists ad_spends_updated_at on public.ad_spends;
create trigger ad_spends_updated_at before update on public.ad_spends
  for each row execute function trigger_set_updated_at();

-- 3. RLS — service_role만 insert (server route 통해서만)
alter table public.funnel_events enable row level security;
alter table public.ad_spends enable row level security;

-- 어드민만 select 가능 (현재는 정책 없음 — service_role 통해서만 어드민 페이지 조회)
-- 추후 admin role 도입 시 정책 추가

-- 4. PostgREST schema reload
notify pgrst, 'reload schema';
