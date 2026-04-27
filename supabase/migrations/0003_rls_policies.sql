-- =====================================================================
-- BooPick MVP — Row Level Security Policies
-- Migration: 0003_rls_policies.sql
--
-- 핵심 원칙:
-- 1. 모든 테이블 RLS 활성화
-- 2. agency_id 기반 멀티테넌시
-- 3. 공동중개 풀(listings.is_shared = true)은 다른 agency도 read 가능
-- 4. 임대인 PII는 등록자만 read 가능 (별도 view로 분리)
-- =====================================================================

-- =====================================================================
-- helper: 현재 사용자의 agency_id 조회
-- =====================================================================
create or replace function auth.user_agency_id()
returns uuid as $$
  select agency_id from public.users where id = auth.uid()
$$ language sql stable security definer;

-- =====================================================================
-- agencies
-- =====================================================================
alter table agencies enable row level security;

create policy "agencies_select_own"
  on agencies for select
  using (id = auth.user_agency_id());

create policy "agencies_update_own_admin"
  on agencies for update
  using (
    id = auth.user_agency_id()
    and exists(select 1 from users where id = auth.uid() and role = 'admin')
  );

-- =====================================================================
-- users
-- =====================================================================
alter table users enable row level security;

create policy "users_select_same_agency"
  on users for select
  using (agency_id = auth.user_agency_id());

create policy "users_insert_self_admin"
  on users for insert
  with check (
    agency_id = auth.user_agency_id()
    and exists(select 1 from users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "users_update_self_or_admin"
  on users for update
  using (
    id = auth.uid()
    or (
      agency_id = auth.user_agency_id()
      and exists(select 1 from users u where u.id = auth.uid() and u.role = 'admin')
    )
  );

-- =====================================================================
-- listings (가장 중요 — 공동중개 풀 로직 포함)
-- =====================================================================
alter table listings enable row level security;

-- SELECT: 내 매물 OR 공유된 매물(공동중개 풀)
create policy "listings_select_own_or_shared"
  on listings for select
  using (
    agency_id = auth.user_agency_id()
    or (
      is_shared = true
      and status = 'active'
    )
  );

-- INSERT: 내 agency에만 등록 가능
create policy "listings_insert_own_agency"
  on listings for insert
  with check (agency_id = auth.user_agency_id());

-- UPDATE: 내 매물만
create policy "listings_update_own"
  on listings for update
  using (agency_id = auth.user_agency_id());

-- DELETE: 내 매물만
create policy "listings_delete_own"
  on listings for delete
  using (agency_id = auth.user_agency_id());

-- =====================================================================
-- VIEW: listings_public (다른 agency가 볼 때 PII 마스킹)
-- 검색 결과 표시용으로 이 view를 사용
-- =====================================================================
create or replace view listings_public as
select
  id,
  agency_id,
  registered_by,
  address,
  dong,
  building_name,
  area_pyeong,
  area_sqm,
  floor,
  total_floors,
  building_type,
  transaction_type,
  deposit,
  monthly_rent,
  premium,
  maintenance_fee,
  description,
  short_description,
  photo_urls,
  ai_tags,
  ai_embedding,
  is_shared,
  contact_method,
  -- PII 마스킹: 등록자 본인이 아니면 NULL
  case when agency_id = auth.user_agency_id() then landlord_name else null end as landlord_name,
  case when agency_id = auth.user_agency_id() then landlord_phone else null end as landlord_phone,
  case when agency_id = auth.user_agency_id() then landlord_note else null end as landlord_note,
  case when agency_id = auth.user_agency_id() then voice_memos else '[]'::jsonb end as voice_memos,
  status,
  view_count,
  created_at,
  updated_at
from listings;

grant select on listings_public to authenticated;

-- =====================================================================
-- client_requests
-- =====================================================================
alter table client_requests enable row level security;

create policy "client_requests_all_own_agency"
  on client_requests for all
  using (agency_id = auth.user_agency_id())
  with check (agency_id = auth.user_agency_id());

-- =====================================================================
-- match_notifications
-- =====================================================================
alter table match_notifications enable row level security;

create policy "match_notif_select_own"
  on match_notifications for select
  using (
    exists(
      select 1 from client_requests
      where client_requests.id = match_notifications.client_request_id
        and client_requests.agency_id = auth.user_agency_id()
    )
  );

create policy "match_notif_update_own"
  on match_notifications for update
  using (
    exists(
      select 1 from client_requests
      where client_requests.id = match_notifications.client_request_id
        and client_requests.agency_id = auth.user_agency_id()
    )
  );

-- =====================================================================
-- co_brokerage_inquiries (양쪽 agency가 모두 보임)
-- =====================================================================
alter table co_brokerage_inquiries enable row level security;

create policy "co_brok_select_either_party"
  on co_brokerage_inquiries for select
  using (
    inquirer_agency_id = auth.user_agency_id()
    or listing_owner_agency_id = auth.user_agency_id()
  );

create policy "co_brok_insert_inquirer"
  on co_brokerage_inquiries for insert
  with check (inquirer_agency_id = auth.user_agency_id());

create policy "co_brok_update_owner_response"
  on co_brokerage_inquiries for update
  using (listing_owner_agency_id = auth.user_agency_id());

-- =====================================================================
-- share_card_logs / ad_copies / search_logs
-- =====================================================================
alter table share_card_logs enable row level security;
alter table ad_copies enable row level security;
alter table search_logs enable row level security;

create policy "share_card_own_user"
  on share_card_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ad_copies_own_user"
  on ad_copies for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "search_logs_own_agency"
  on search_logs for select
  using (agency_id = auth.user_agency_id());

create policy "search_logs_insert_own_user"
  on search_logs for insert
  with check (user_id = auth.uid() or user_id is null);

-- =====================================================================
-- Done.
-- =====================================================================
