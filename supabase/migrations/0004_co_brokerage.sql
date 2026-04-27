-- =====================================================================
-- BooPick MVP — Co-brokerage Triggers & Search Functions
-- Migration: 0004_co_brokerage.sql
-- =====================================================================

-- =====================================================================
-- 함수: 하이브리드 검색 (정형 + 임베딩)
-- 핵심 쿼리: 내 매물 + 공동중개 풀에서 손님 조건에 매칭되는 매물 N개 반환
-- =====================================================================

create or replace function search_listings(
  p_user_id uuid,
  p_query_embedding vector(1536),

  -- 정형 필터
  p_dong text default null,
  p_building_type text default null,
  p_transaction_type text default null,
  p_deposit_max bigint default null,
  p_monthly_rent_max bigint default null,
  p_area_pyeong_min numeric default null,
  p_area_pyeong_max numeric default null,
  p_floor_min int default null,

  -- AI 태그 필터 (jsonb 배열 매칭)
  p_industries text[] default null,
  p_facilities text[] default null,

  -- 결과 옵션
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
  -- 사용자의 agency_id 조회
  select u.agency_id into v_user_agency_id
  from users u where u.id = p_user_id;

  if v_user_agency_id is null then
    raise exception '사용자 agency를 찾을 수 없습니다';
  end if;

  return query
  select
    l.id as listing_id,
    l.agency_id,
    (l.agency_id != v_user_agency_id) as is_co_brokerage,
    (1 - (l.ai_embedding <=> p_query_embedding))::numeric as similarity,
    l.address,
    l.dong,
    l.area_pyeong,
    l.floor,
    l.deposit,
    l.monthly_rent,
    l.short_description,
    l.ai_tags,
    l.photo_urls
  from listings l
  where
    l.status = 'active'
    and l.ai_embedding is not null
    and (
      -- 내 매물
      l.agency_id = v_user_agency_id
      -- 또는 공유 풀
      or (p_include_co_brokerage and l.is_shared = true)
    )
    -- 정형 필터
    and (p_dong is null or l.dong = p_dong)
    and (p_building_type is null or l.building_type = p_building_type)
    and (p_transaction_type is null or l.transaction_type = p_transaction_type)
    and (p_deposit_max is null or l.deposit <= p_deposit_max)
    and (p_monthly_rent_max is null or l.monthly_rent <= p_monthly_rent_max)
    and (p_area_pyeong_min is null or l.area_pyeong >= p_area_pyeong_min)
    and (p_area_pyeong_max is null or l.area_pyeong <= p_area_pyeong_max)
    and (p_floor_min is null or l.floor >= p_floor_min)
    -- AI 태그 필터 (배열 교집합)
    and (
      p_industries is null
      or l.ai_tags->'industries' ?| p_industries
    )
    and (
      p_facilities is null
      or l.ai_tags->'facilities' ?| p_facilities
    )
  order by l.ai_embedding <=> p_query_embedding
  limit p_limit;
end;
$$ language plpgsql stable security definer;

-- =====================================================================
-- 트리거: 새 매물 등록 시 → 활성 손님 조건과 매칭 검사
-- =====================================================================

create or replace function trigger_match_new_listing()
returns trigger as $$
declare
  v_request record;
  v_similarity numeric;
  v_threshold numeric := 0.80; -- 매칭 기준 (코사인 유사도)
begin
  -- AI 처리 안 된 매물은 스킵
  if new.ai_embedding is null then
    return new;
  end if;

  -- 활성 손님 조건들과 비교
  for v_request in
    select cr.id, cr.agency_id, cr.embedding, cr.parsed_filters
    from client_requests cr
    where cr.status = 'active'
      and cr.embedding is not null
      and (
        -- 등록 매물이 공유됐거나, 같은 agency인 경우만 매칭
        new.is_shared = true
        or new.agency_id = cr.agency_id
      )
  loop
    -- 코사인 유사도 계산
    v_similarity := 1 - (new.ai_embedding <=> v_request.embedding);

    if v_similarity >= v_threshold then
      -- match_notifications에 기록 (중복은 unique 제약으로 자동 거부)
      insert into match_notifications (
        client_request_id,
        listing_id,
        match_score,
        is_co_brokerage,
        notified_via
      ) values (
        v_request.id,
        new.id,
        v_similarity,
        new.agency_id != v_request.agency_id,
        'kakao'
      )
      on conflict (client_request_id, listing_id) do nothing;
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

create trigger listing_after_ai_processed
  after update of ai_embedding on listings
  for each row
  when (new.ai_embedding is not null and (old.ai_embedding is null or old.ai_embedding != new.ai_embedding))
  execute function trigger_match_new_listing();

create trigger listing_after_insert
  after insert on listings
  for each row
  when (new.ai_embedding is not null)
  execute function trigger_match_new_listing();

-- =====================================================================
-- 트리거: 공동중개 관심 등록 시 매물 등록자에게 알림 발송 큐에 추가
-- (실제 알림톡 발송은 application layer에서 처리)
-- =====================================================================

create or replace function trigger_co_brokerage_inquiry_notify()
returns trigger as $$
begin
  -- 알림 발송용 pg_notify (Supabase Realtime으로 수신 가능)
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

create trigger co_brokerage_inquiry_notify
  after insert on co_brokerage_inquiries
  for each row
  execute function trigger_co_brokerage_inquiry_notify();

-- =====================================================================
-- 함수: 사용자 플랜 한도 체크 (검색 횟수 등)
-- =====================================================================

create or replace function check_plan_limit(
  p_user_id uuid,
  p_metric text -- 'searches' | 'listings' | 'clients'
)
returns boolean as $$
declare
  v_agency_id uuid;
  v_plan text;
  v_current_count int;
  v_limit int;
begin
  select agency_id into v_agency_id from users where id = p_user_id;
  select plan into v_plan from agencies where id = v_agency_id;

  -- 플랜별 한도
  v_limit := case
    when p_metric = 'searches' then case v_plan
      when 'starter' then 100
      else -1 -- 무제한
    end
    when p_metric = 'listings' then case v_plan
      when 'starter' then 50
      else -1
    end
    when p_metric = 'clients' then case v_plan
      when 'starter' then 5
      when 'pro' then 50
      else -1
    end
    else 0
  end;

  if v_limit = -1 then return true; end if;

  -- 이번 달 사용량 카운트
  v_current_count := case p_metric
    when 'searches' then (
      select count(*) from search_logs
      where agency_id = v_agency_id
        and created_at >= date_trunc('month', now())
    )
    when 'listings' then (
      select count(*) from listings
      where agency_id = v_agency_id and status = 'active'
    )
    when 'clients' then (
      select count(*) from client_requests
      where agency_id = v_agency_id and status = 'active'
    )
    else 0
  end;

  return v_current_count < v_limit;
end;
$$ language plpgsql stable security definer;

-- =====================================================================
-- Done.
-- =====================================================================
