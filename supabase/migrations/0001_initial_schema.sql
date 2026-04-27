-- =====================================================================
-- BooPick MVP — Initial Schema
-- Migration: 0001_initial_schema.sql
-- Created: 2026-04-25
-- =====================================================================

-- pgvector extension
create extension if not exists vector;

-- =====================================================================
-- 1. agencies (중개사무소 - 테넌트)
-- =====================================================================
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_number text unique,
  representative_name text,
  representative_phone text,
  address text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'office', 'enterprise')),
  trial_ends_at timestamptz,
  share_pool_opted_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agencies_plan on agencies(plan);
create index idx_agencies_share_pool on agencies(share_pool_opted_in) where share_pool_opted_in = true;

-- =====================================================================
-- 2. users (중개사)
-- =====================================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  kakao_id text unique,
  email text unique,
  name text not null,
  phone text,
  role text not null default 'broker' check (role in ('admin', 'broker', 'staff')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_agency on users(agency_id);
create index idx_users_kakao on users(kakao_id);

-- =====================================================================
-- 3. listings (매물)
-- =====================================================================
create table listings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  registered_by uuid references users(id),

  -- 정형 필드
  address text not null,
  dong text,
  building_name text,
  area_pyeong numeric(10, 2),
  area_sqm numeric(10, 2),
  floor int,
  total_floors int,
  building_type text check (building_type in ('상가', '사무실', '주거', '토지', '기타')),
  transaction_type text check (transaction_type in ('매매', '전세', '월세', '단기')),
  deposit bigint,
  monthly_rent bigint,
  premium bigint,
  maintenance_fee bigint,

  -- 비정형 콘텐츠
  description text,
  short_description text,
  photo_urls text[] default '{}',

  -- AI 정형화 결과
  ai_tags jsonb default '{
    "industries": [],
    "facilities": [],
    "location_features": [],
    "condition": []
  }'::jsonb,
  ai_embedding vector(1536),
  ai_processed_at timestamptz,
  ai_processing_error text,

  -- 음성메모 누적 (F8)
  voice_memos jsonb default '[]'::jsonb,

  -- 임대인 정보 (PII - 등록자만 read 가능)
  landlord_name text,
  landlord_phone text,
  landlord_note text,

  -- 공유 설정
  is_shared boolean not null default false,
  contact_method text default 'kakao' check (contact_method in ('kakao', 'phone', 'both')),

  -- 메타
  status text not null default 'active' check (status in ('active', 'pending', 'contracted', 'expired', 'archived')),
  source text default 'manual' check (source in ('manual', 'csv', 'voice', 'api')),
  view_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 4. client_requests (손님 조건)
-- =====================================================================
create table client_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid not null references users(id),

  client_name text,
  client_phone text,
  client_note text,

  raw_query text not null,
  parsed_filters jsonb,
  embedding vector(1536),

  status text not null default 'active' check (status in ('active', 'matched', 'closed', 'archived')),
  closed_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- 5. match_notifications (자동매칭 알림 로그)
-- =====================================================================
create table match_notifications (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references client_requests(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  match_score numeric(5, 4) not null,
  is_co_brokerage boolean not null default false,
  notified_via text default 'kakao' check (notified_via in ('kakao', 'sms', 'email', 'web')),
  notified_at timestamptz not null default now(),
  user_action text check (user_action in ('viewed', 'sent_to_client', 'dismissed', 'co_broker_inquiry', 'expired')),
  user_action_at timestamptz,

  unique(client_request_id, listing_id)
);

create index idx_match_notif_client on match_notifications(client_request_id);
create index idx_match_notif_listing on match_notifications(listing_id);

-- =====================================================================
-- 6. co_brokerage_inquiries (공동중개 관심)
-- =====================================================================
create table co_brokerage_inquiries (
  id uuid primary key default gen_random_uuid(),
  inquirer_agency_id uuid not null references agencies(id) on delete cascade,
  inquirer_user_id uuid not null references users(id),
  listing_id uuid not null references listings(id) on delete cascade,
  listing_owner_agency_id uuid not null references agencies(id),
  client_request_id uuid references client_requests(id),
  message text,

  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'contracted', 'expired')),
  responded_at timestamptz,
  response_message text,

  created_at timestamptz not null default now()
);

create index idx_co_brok_inquirer on co_brokerage_inquiries(inquirer_agency_id);
create index idx_co_brok_owner on co_brokerage_inquiries(listing_owner_agency_id);
create index idx_co_brok_status on co_brokerage_inquiries(status);

-- =====================================================================
-- 7. share_card_logs (매물 공유 카드 발송 - F9)
-- =====================================================================
create table share_card_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  client_phone text,
  card_url text not null,
  click_count int default 0,
  created_at timestamptz not null default now()
);

create index idx_share_card_user on share_card_logs(user_id);
create index idx_share_card_listing on share_card_logs(listing_id);

-- =====================================================================
-- 8. ad_copies (광고문구 생성 이력 - F7)
-- =====================================================================
create table ad_copies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  channel text check (channel in ('naver', 'dabang', 'zigbang', 'kakao', 'instagram', 'general')),
  tone text check (tone in ('formal', 'casual', 'impact')),
  content text not null,
  tokens_used int,
  created_at timestamptz not null default now()
);

create index idx_ad_copies_listing on ad_copies(listing_id);

-- =====================================================================
-- 9. search_logs (검색/사용 분석)
-- =====================================================================
create table search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  agency_id uuid references agencies(id) on delete cascade,

  query text not null,
  parsed_filters jsonb,
  result_count int not null default 0,
  co_brokerage_count int not null default 0,
  response_time_ms int,
  tokens_used int,

  created_at timestamptz not null default now()
);

create index idx_search_logs_user on search_logs(user_id);
create index idx_search_logs_agency on search_logs(agency_id);
create index idx_search_logs_created on search_logs(created_at desc);

-- =====================================================================
-- 10. updated_at trigger
-- =====================================================================
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger agencies_updated_at before update on agencies
  for each row execute function trigger_set_updated_at();
create trigger users_updated_at before update on users
  for each row execute function trigger_set_updated_at();
create trigger listings_updated_at before update on listings
  for each row execute function trigger_set_updated_at();
create trigger client_requests_updated_at before update on client_requests
  for each row execute function trigger_set_updated_at();

-- =====================================================================
-- Done. 다음 마이그레이션:
-- 0002_indexes.sql       (벡터 인덱스 + 검색 최적화)
-- 0003_rls_policies.sql  (Row Level Security)
-- 0004_co_brokerage.sql  (공동중개 트리거 + 함수)
-- 0005_user_signup_trigger.sql (카카오 가입 시 agency + user 자동 생성)
-- =====================================================================
