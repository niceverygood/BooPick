-- =====================================================================
-- BooPick Fix Migration — auth schema 권한 이슈 해결
-- Migration: 0006_fix_auth_schema.sql
--
-- 배경:
--   0003에서 auth.user_agency_id() 함수를 만들려 했으나 Supabase가
--   auth schema에 사용자 함수 생성을 차단 → permission denied for schema auth
--   결과: 0003 RLS 정책 생성이 중단됨, 0004 일부 트리거만 적용됨
--
-- 조치:
--   1. 깨진 객체 정리 (의존성 순서대로)
--   2. helper 함수를 public schema에 재정의
--   3. RLS 정책 + 뷰 + 트리거 + 검색 함수 멱등 재생성
--   4. PostgREST schema cache reload
--
-- 사용법: SQL Editor에 통째로 붙여넣고 한 번 실행.
-- =====================================================================

-- =====================================================================
-- 1. 정리 (의존성 순서)
-- =====================================================================

drop view if exists listings_public cascade;

-- 깨진 auth.user_agency_id() 시도 정리 (생성 실패했을 가능성 높음, 권한 없으면 무시)
do $$ begin
  drop function if exists auth.user_agency_id() cascade;
exception when insufficient_privilege then null;
end $$;

drop function if exists public.user_agency_id() cascade;

drop trigger if exists listing_after_ai_processed on public.listings;
drop trigger if exists listing_after_insert on public.listings;
drop trigger if exists co_brokerage_inquiry_notify on public.co_brokerage_inquiries;
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.search_listings cascade;
drop function if exists public.trigger_match_new_listing() cascade;
drop function if exists public.trigger_co_brokerage_inquiry_notify() cascade;
drop function if exists public.check_plan_limit(uuid, text) cascade;
drop function if exists public.handle_new_user() cascade;

-- 기존 RLS 정책 모두 제거 (auth.user_agency_id 의존)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- =====================================================================
-- 2. helper: 현재 사용자의 agency_id (public schema)
-- =====================================================================

create function public.user_agency_id()
returns uuid as $$
  select agency_id from public.users where id = auth.uid()
$$ language sql stable security definer;

grant execute on function public.user_agency_id() to anon, authenticated, service_role;

-- =====================================================================
-- 3. RLS 활성화 + 정책 재생성
-- =====================================================================

alter table public.agencies enable row level security;
alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.client_requests enable row level security;
alter table public.match_notifications enable row level security;
alter table public.co_brokerage_inquiries enable row level security;
alter table public.share_card_logs enable row level security;
alter table public.ad_copies enable row level security;
alter table public.search_logs enable row level security;

-- agencies
create policy "agencies_select_own"
  on public.agencies for select
  using (id = public.user_agency_id());

create policy "agencies_update_own_admin"
  on public.agencies for update
  using (
    id = public.user_agency_id()
    and exists(select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- users
create policy "users_select_same_agency"
  on public.users for select
  using (agency_id = public.user_agency_id());

create policy "users_insert_self_admin"
  on public.users for insert
  with check (
    agency_id = public.user_agency_id()
    and exists(select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "users_update_self_or_admin"
  on public.users for update
  using (
    id = auth.uid()
    or (
      agency_id = public.user_agency_id()
      and exists(select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    )
  );

-- listings
create policy "listings_select_own_or_shared"
  on public.listings for select
  using (
    agency_id = public.user_agency_id()
    or (is_shared = true and status = 'active')
  );

create policy "listings_insert_own_agency"
  on public.listings for insert
  with check (agency_id = public.user_agency_id());

create policy "listings_update_own"
  on public.listings for update
  using (agency_id = public.user_agency_id());

create policy "listings_delete_own"
  on public.listings for delete
  using (agency_id = public.user_agency_id());

-- client_requests
create policy "client_requests_all_own_agency"
  on public.client_requests for all
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

-- match_notifications
create policy "match_notif_select_own"
  on public.match_notifications for select
  using (
    exists(
      select 1 from public.client_requests
      where client_requests.id = match_notifications.client_request_id
        and client_requests.agency_id = public.user_agency_id()
    )
  );

create policy "match_notif_update_own"
  on public.match_notifications for update
  using (
    exists(
      select 1 from public.client_requests
      where client_requests.id = match_notifications.client_request_id
        and client_requests.agency_id = public.user_agency_id()
    )
  );

-- co_brokerage_inquiries
create policy "co_brok_select_either_party"
  on public.co_brokerage_inquiries for select
  using (
    inquirer_agency_id = public.user_agency_id()
    or listing_owner_agency_id = public.user_agency_id()
  );

create policy "co_brok_insert_inquirer"
  on public.co_brokerage_inquiries for insert
  with check (inquirer_agency_id = public.user_agency_id());

create policy "co_brok_update_owner_response"
  on public.co_brokerage_inquiries for update
  using (listing_owner_agency_id = public.user_agency_id());

-- share_card_logs / ad_copies / search_logs
create policy "share_card_own_user"
  on public.share_card_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ad_copies_own_user"
  on public.ad_copies for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "search_logs_own_agency"
  on public.search_logs for select
  using (agency_id = public.user_agency_id());

create policy "search_logs_insert_own_user"
  on public.search_logs for insert
  with check (user_id = auth.uid() or user_id is null);

-- =====================================================================
-- 4. listings_public 뷰 (PII 마스킹)
-- =====================================================================

create or replace view public.listings_public as
select
  id, agency_id, registered_by, address, dong, building_name,
  area_pyeong, area_sqm, floor, total_floors, building_type,
  transaction_type, deposit, monthly_rent, premium, maintenance_fee,
  description, short_description, photo_urls, ai_tags, ai_embedding,
  is_shared, contact_method,
  case when agency_id = public.user_agency_id() then landlord_name else null end as landlord_name,
  case when agency_id = public.user_agency_id() then landlord_phone else null end as landlord_phone,
  case when agency_id = public.user_agency_id() then landlord_note else null end as landlord_note,
  case when agency_id = public.user_agency_id() then voice_memos else '[]'::jsonb end as voice_memos,
  status, view_count, created_at, updated_at
from public.listings;

grant select on public.listings_public to authenticated;

-- =====================================================================
-- 5. 검색 함수 (0004 — 멱등)
-- =====================================================================

create or replace function public.search_listings(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_dong text default null,
  p_building_type text default null,
  p_transaction_type text default null,
  p_deposit_max bigint default null,
  p_monthly_rent_max bigint default null,
  p_area_pyeong_min numeric default null,
  p_area_pyeong_max numeric default null,
  p_floor_min int default null,
  p_industries text[] default null,
  p_facilities text[] default null,
  p_limit int default 20,
  p_include_co_brokerage boolean default true
)
returns table (
  listing_id uuid,
  agency_id uuid,
  is_co_brokerage boolean,
  similarity numeric,
  address text,
  dong text,
  area_pyeong numeric,
  floor int,
  deposit bigint,
  monthly_rent bigint,
  short_description text,
  ai_tags jsonb,
  photo_urls text[]
) as $$
declare
  v_user_agency_id uuid;
begin
  select u.agency_id into v_user_agency_id
  from public.users u where u.id = p_user_id;

  if v_user_agency_id is null then
    raise exception '사용자 agency를 찾을 수 없습니다';
  end if;

  return query
  select
    l.id, l.agency_id,
    (l.agency_id != v_user_agency_id),
    (1 - (l.ai_embedding <=> p_query_embedding))::numeric,
    l.address, l.dong, l.area_pyeong, l.floor,
    l.deposit, l.monthly_rent,
    l.short_description, l.ai_tags, l.photo_urls
  from public.listings l
  where l.status = 'active'
    and l.ai_embedding is not null
    and (l.agency_id = v_user_agency_id or (p_include_co_brokerage and l.is_shared = true))
    and (p_dong is null or l.dong = p_dong)
    and (p_building_type is null or l.building_type = p_building_type)
    and (p_transaction_type is null or l.transaction_type = p_transaction_type)
    and (p_deposit_max is null or l.deposit <= p_deposit_max)
    and (p_monthly_rent_max is null or l.monthly_rent <= p_monthly_rent_max)
    and (p_area_pyeong_min is null or l.area_pyeong >= p_area_pyeong_min)
    and (p_area_pyeong_max is null or l.area_pyeong <= p_area_pyeong_max)
    and (p_floor_min is null or l.floor >= p_floor_min)
    and (p_industries is null or l.ai_tags->'industries' ?| p_industries)
    and (p_facilities is null or l.ai_tags->'facilities' ?| p_facilities)
  order by l.ai_embedding <=> p_query_embedding
  limit p_limit;
end;
$$ language plpgsql stable security definer;

-- =====================================================================
-- 6. 자동매칭 트리거 (0004 — 멱등)
-- =====================================================================

create or replace function public.trigger_match_new_listing()
returns trigger as $$
declare
  v_request record;
  v_similarity numeric;
  v_threshold numeric := 0.80;
begin
  if new.ai_embedding is null then return new; end if;

  for v_request in
    select cr.id, cr.agency_id, cr.embedding, cr.parsed_filters
    from public.client_requests cr
    where cr.status = 'active'
      and cr.embedding is not null
      and (new.is_shared = true or new.agency_id = cr.agency_id)
  loop
    v_similarity := 1 - (new.ai_embedding <=> v_request.embedding);
    if v_similarity >= v_threshold then
      insert into public.match_notifications (
        client_request_id, listing_id, match_score, is_co_brokerage, notified_via
      ) values (
        v_request.id, new.id, v_similarity,
        new.agency_id != v_request.agency_id, 'kakao'
      )
      on conflict (client_request_id, listing_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists listing_after_ai_processed on public.listings;
create trigger listing_after_ai_processed
  after update of ai_embedding on public.listings
  for each row
  when (new.ai_embedding is not null and (old.ai_embedding is null or old.ai_embedding != new.ai_embedding))
  execute function public.trigger_match_new_listing();

drop trigger if exists listing_after_insert on public.listings;
create trigger listing_after_insert
  after insert on public.listings
  for each row
  when (new.ai_embedding is not null)
  execute function public.trigger_match_new_listing();

-- =====================================================================
-- 7. 공동중개 알림 (0004 — 멱등)
-- =====================================================================

create or replace function public.trigger_co_brokerage_inquiry_notify()
returns trigger as $$
begin
  perform pg_notify(
    'co_brokerage_inquiry',
    json_build_object(
      'inquiry_id', new.id,
      'inquirer_agency_id', new.inquirer_agency_id,
      'listing_id', new.listing_id,
      'listing_owner_agency_id', new.listing_owner_agency_id
    )::text
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists co_brokerage_inquiry_notify on public.co_brokerage_inquiries;
create trigger co_brokerage_inquiry_notify
  after insert on public.co_brokerage_inquiries
  for each row
  execute function public.trigger_co_brokerage_inquiry_notify();

-- =====================================================================
-- 8. 플랜 한도 체크 (0004 — 멱등)
-- =====================================================================

create or replace function public.check_plan_limit(p_user_id uuid, p_metric text)
returns boolean as $$
declare
  v_agency_id uuid;
  v_plan text;
  v_current_count int;
  v_limit int;
begin
  select agency_id into v_agency_id from public.users where id = p_user_id;
  select plan into v_plan from public.agencies where id = v_agency_id;

  v_limit := case
    when p_metric = 'searches' then case v_plan when 'starter' then 100 else -1 end
    when p_metric = 'listings' then case v_plan when 'starter' then 50 else -1 end
    when p_metric = 'clients' then case v_plan when 'starter' then 5 when 'pro' then 50 else -1 end
    else 0
  end;

  if v_limit = -1 then return true; end if;

  v_current_count := case p_metric
    when 'searches' then (
      select count(*) from public.search_logs
      where agency_id = v_agency_id and created_at >= date_trunc('month', now())
    )
    when 'listings' then (
      select count(*) from public.listings
      where agency_id = v_agency_id and status = 'active'
    )
    when 'clients' then (
      select count(*) from public.client_requests
      where agency_id = v_agency_id and status = 'active'
    )
    else 0
  end;

  return v_current_count < v_limit;
end;
$$ language plpgsql stable security definer;

-- =====================================================================
-- 9. 가입 트리거 (0005 — 멱등)
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_agency_id uuid;
  v_name text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    '미입력'
  );

  insert into public.agencies (name, plan, trial_ends_at)
  values (v_name || '의 사무소', 'starter', now() + interval '14 days')
  returning id into v_agency_id;

  insert into public.users (id, agency_id, kakao_id, email, name, role)
  values (
    new.id, v_agency_id,
    new.raw_user_meta_data->>'sub',
    new.email, v_name, 'admin'
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 10. PostgREST schema cache reload
-- =====================================================================

notify pgrst, 'reload schema';

-- =====================================================================
-- Done. 검증:
--   select count(*) from public.agencies;     -- 테이블 존재 OK
--   select public.user_agency_id();           -- null 반환 (anon이라 OK)
-- =====================================================================
