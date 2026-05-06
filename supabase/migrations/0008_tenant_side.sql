-- =====================================================================
-- BooPick V2 — 임차인 측 데이터 모델
-- Migration: 0008_tenant_side.sql
--
-- 변경 가설 (V1 → V2):
--   메인 사용자: 중개사 → 임차인
--   매물 풀: 공동중개 → 임차인 노출 슬롯 (default OFF)
--   가격: 49k/149k/390k → 99k/299k/990k + 성공보수형
-- =====================================================================

-- 1. 임차인 — 카톡 로그인 또는 anon_token
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  kakao_id text unique,
  anon_token text unique,
  phone text,
  name text,
  email text,
  source text,                          -- utm_source 등 유입 채널
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenants_kakao on public.tenants(kakao_id) where kakao_id is not null;
create index if not exists idx_tenants_anon on public.tenants(anon_token) where anon_token is not null;

-- 2. 임차인 검색·조회 이력
create table if not exists public.tenant_searches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  anon_token text,                      -- 비로그인 검색 추적
  query text not null,
  parsed_filters jsonb,
  result_count int not null default 0,
  response_time_ms int,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_searches_tenant on public.tenant_searches(tenant_id, created_at desc);
create index if not exists idx_tenant_searches_anon on public.tenant_searches(anon_token, created_at desc);

-- 3. 임차인 → 매물 컨택 요청 (핵심 분배 테이블)
create table if not exists public.tenant_inquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  agency_id uuid not null references public.agencies(id),  -- 분배 대상
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'met', 'contracted', 'closed', 'cancelled')),
  notify_status text not null default 'pending'
    check (notify_status in ('pending', 'sent', 'failed', 'fallback_sms', 'fallback_email')),
  notified_at timestamptz,
  contacted_at timestamptz,
  met_at timestamptz,
  contracted_at timestamptz,
  contract_amount bigint,                -- 거래 금액 (성공보수형 정산용)
  contract_type text
    check (contract_type in ('매매', '전세', '월세') or contract_type is null),
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenant_inq_tenant on public.tenant_inquiries(tenant_id);
create index if not exists idx_tenant_inq_agency on public.tenant_inquiries(agency_id, status, created_at desc);
create index if not exists idx_tenant_inq_listing on public.tenant_inquiries(listing_id);

-- 4. listings에 임차인 풀 노출 + 트래킹 컬럼
alter table public.listings
  add column if not exists tenant_pool_enabled boolean not null default false,
  add column if not exists tenant_views int not null default 0,
  add column if not exists tenant_clicks int not null default 0,
  add column if not exists tenant_inquiries_count int not null default 0,
  add column if not exists last_tenant_view_at timestamptz;

create index if not exists idx_listings_tenant_pool
  on public.listings(tenant_pool_enabled, status, created_at desc)
  where tenant_pool_enabled = true and status = 'active';

-- 5. 가격 플랜
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  monthly_price bigint not null,
  features jsonb not null,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (id, name, monthly_price, features, display_order) values
  ('basic', '베이직', 99000,
   jsonb_build_object('tenant_pool', false, 'ad_copy_daily', 5, 'analytics', false, 'priority', false), 1),
  ('pro', '프로', 299000,
   jsonb_build_object('tenant_pool', true, 'ad_copy_daily', -1, 'analytics', true, 'multiformat', true), 2),
  ('enterprise', '엔터프라이즈', 990000,
   jsonb_build_object('tenant_pool', true, 'ad_copy_daily', -1, 'analytics', true, 'priority', true, 'api', true), 3),
  ('success_fee', '성공보수형', 0,
   jsonb_build_object('tenant_pool', true, 'fee_rate', 0.07, 'requires_tracking', true), 4)
on conflict (id) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  features = excluded.features,
  display_order = excluded.display_order;

-- 6. agencies — plan 연결 + 트라이얼
alter table public.agencies
  add column if not exists plan_id text references public.subscription_plans(id) default 'basic',
  add column if not exists plan_started_at timestamptz default now(),
  add column if not exists trial_plan_id text references public.subscription_plans(id),
  add column if not exists business_registration_number text;

-- 7. RLS
alter table public.tenants enable row level security;
alter table public.tenant_searches enable row level security;
alter table public.tenant_inquiries enable row level security;
alter table public.subscription_plans enable row level security;

-- subscription_plans는 anon read 허용 (가격 페이지)
drop policy if exists "subscription_plans public read" on public.subscription_plans;
create policy "subscription_plans public read"
  on public.subscription_plans for select
  to anon, authenticated
  using (active = true);

-- tenants: 본인 데이터만 (kakao_id 매칭)
drop policy if exists "tenants self by kakao" on public.tenants;
create policy "tenants self by kakao"
  on public.tenants for select
  using (kakao_id is not null and kakao_id = (auth.jwt() ->> 'kakao_id'));

drop policy if exists "tenants self update" on public.tenants;
create policy "tenants self update"
  on public.tenants for update
  using (kakao_id is not null and kakao_id = (auth.jwt() ->> 'kakao_id'));

-- tenant_searches: 본인 검색만 read (anon insert는 server route의 service_role로만)
drop policy if exists "tenant_searches self read" on public.tenant_searches;
create policy "tenant_searches self read"
  on public.tenant_searches for select
  using (
    tenant_id in (
      select id from public.tenants
      where kakao_id = (auth.jwt() ->> 'kakao_id')
    )
  );

-- tenant_inquiries: 중개사는 본인 매물에 들어온 inquiry select/update
drop policy if exists "agency reads own inquiries" on public.tenant_inquiries;
create policy "agency reads own inquiries"
  on public.tenant_inquiries for select
  using (agency_id = public.user_agency_id());

drop policy if exists "agency updates own inquiries" on public.tenant_inquiries;
create policy "agency updates own inquiries"
  on public.tenant_inquiries for update
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

-- 임차인 본인은 자신의 inquiry select 가능
drop policy if exists "tenants read own inquiries" on public.tenant_inquiries;
create policy "tenants read own inquiries"
  on public.tenant_inquiries for select
  using (
    tenant_id in (
      select id from public.tenants
      where kakao_id = (auth.jwt() ->> 'kakao_id')
    )
  );

-- 8. 매물 등록 시 plan에 따라 tenant_pool_enabled 자동 설정
create or replace function public.trigger_set_tenant_pool_on_listing()
returns trigger as $$
declare
  v_plan_features jsonb;
  v_active_plan_id text;
begin
  -- 트라이얼이 활성이면 트라이얼 플랜, 아니면 정규 플랜
  select
    case
      when a.trial_plan_id is not null and coalesce(a.trial_ends_at, now()) > now() then a.trial_plan_id
      else a.plan_id
    end into v_active_plan_id
  from public.agencies a
  where a.id = new.agency_id;

  if v_active_plan_id is null then
    new.tenant_pool_enabled := false;
    return new;
  end if;

  select sp.features into v_plan_features
  from public.subscription_plans sp
  where sp.id = v_active_plan_id;

  if (v_plan_features ->> 'tenant_pool')::boolean = true then
    -- 사용자가 이미 명시적으로 false 설정했으면 존중 (가로채기 차단 옵션)
    if new.tenant_pool_enabled is null then
      new.tenant_pool_enabled := true;
    end if;
  else
    new.tenant_pool_enabled := false;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_tenant_pool_before_insert on public.listings;
create trigger set_tenant_pool_before_insert
  before insert on public.listings
  for each row execute function public.trigger_set_tenant_pool_on_listing();

-- 9. 임차인 공개 검색 RPC (anon 호출 가능)
create or replace function public.tenant_search_listings(
  p_query_embedding vector(1536),
  p_dong text default null,
  p_building_type text default null,
  p_transaction_type text default null,
  p_deposit_max bigint default null,
  p_monthly_rent_max bigint default null,
  p_area_pyeong_min numeric default null,
  p_area_pyeong_max numeric default null,
  p_industries text[] default null,
  p_limit int default 12
)
returns table (
  listing_id uuid,
  similarity numeric,
  address text,
  dong text,
  area_pyeong numeric,
  floor int,
  building_type text,
  transaction_type text,
  deposit bigint,
  monthly_rent bigint,
  short_description text,
  ai_tags jsonb,
  photo_urls text[],
  agency_name text
) as $$
  select
    l.id,
    (1 - (l.ai_embedding <=> p_query_embedding))::numeric,
    l.address, l.dong, l.area_pyeong, l.floor,
    l.building_type, l.transaction_type, l.deposit, l.monthly_rent,
    l.short_description, l.ai_tags, l.photo_urls,
    a.name
  from public.listings l
  join public.agencies a on a.id = l.agency_id
  where l.status = 'active'
    and l.tenant_pool_enabled = true
    and l.ai_embedding is not null
    and (p_dong is null or l.dong = p_dong)
    and (p_building_type is null or l.building_type = p_building_type)
    and (p_transaction_type is null or l.transaction_type = p_transaction_type)
    and (p_deposit_max is null or l.deposit <= p_deposit_max)
    and (p_monthly_rent_max is null or l.monthly_rent <= p_monthly_rent_max)
    and (p_area_pyeong_min is null or l.area_pyeong >= p_area_pyeong_min)
    and (p_area_pyeong_max is null or l.area_pyeong <= p_area_pyeong_max)
    and (p_industries is null or l.ai_tags->'industries' ?| p_industries)
  order by l.ai_embedding <=> p_query_embedding
  limit p_limit;
$$ language sql stable security definer;

grant execute on function public.tenant_search_listings to anon, authenticated, service_role;

-- 10. updated_at 트리거
drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at before update on public.tenants
  for each row execute function trigger_set_updated_at();

drop trigger if exists tenant_inquiries_updated_at on public.tenant_inquiries;
create trigger tenant_inquiries_updated_at before update on public.tenant_inquiries
  for each row execute function trigger_set_updated_at();

-- 11. 데모 매물 10건의 tenant_pool 활성화 + agency를 'pro'로
update public.agencies
set plan_id = 'pro'
where name = '부픽 데모 사무소';

update public.listings
set tenant_pool_enabled = true
where agency_id in (
  select id from public.agencies where name = '부픽 데모 사무소'
);

-- 12. PostgREST schema cache reload
notify pgrst, 'reload schema';

-- =====================================================================
-- Done.
-- =====================================================================
