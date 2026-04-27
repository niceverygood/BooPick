-- =====================================================================
-- BooPick MVP — Indexes & Search Optimization
-- Migration: 0002_indexes.sql
-- =====================================================================

-- =====================================================================
-- listings 검색 인덱스
-- =====================================================================

-- 정형 필터 인덱스
create index idx_listings_agency on listings(agency_id);
create index idx_listings_status on listings(status) where status = 'active';
create index idx_listings_dong on listings(dong) where status = 'active';
create index idx_listings_building_type on listings(building_type) where status = 'active';
create index idx_listings_transaction_type on listings(transaction_type) where status = 'active';
create index idx_listings_deposit on listings(deposit) where status = 'active';
create index idx_listings_monthly_rent on listings(monthly_rent) where status = 'active';
create index idx_listings_area on listings(area_pyeong) where status = 'active';

-- 공동중개 풀 인덱스 (가장 중요)
create index idx_listings_shared on listings(is_shared, status)
  where is_shared = true and status = 'active';

-- 정렬용
create index idx_listings_created on listings(created_at desc);
create index idx_listings_updated on listings(updated_at desc);

-- AI 처리 대기 큐
create index idx_listings_pending_tag on listings(created_at)
  where ai_processed_at is null and status = 'active';

-- =====================================================================
-- 벡터 검색 인덱스 (pgvector)
-- =====================================================================

-- listings.ai_embedding (코사인 유사도)
-- ivfflat은 데이터 1000건 이상일 때 효율적. lists는 sqrt(N) 권장.
-- 초기 베타 매물 수만 건 + 향후 확장 고려해 lists = 200으로 설정.
create index idx_listings_embedding on listings
  using ivfflat (ai_embedding vector_cosine_ops)
  with (lists = 200);

-- client_requests.embedding
create index idx_client_requests_embedding on client_requests
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- =====================================================================
-- jsonb GIN 인덱스 (ai_tags 검색)
-- =====================================================================

create index idx_listings_ai_tags on listings using gin (ai_tags);

-- =====================================================================
-- pg_trgm extension (description 키워드 검색 백업)
-- =====================================================================

create extension if not exists pg_trgm;

create index idx_listings_description_trgm on listings
  using gin (description gin_trgm_ops);

-- =====================================================================
-- 통계 자동 업데이트 (analyze)
-- =====================================================================

-- pgvector 인덱스는 INSERT 후 ANALYZE 필요
-- 베타 파트너 매물 일괄 임포트 후 수동으로:
--   ANALYZE listings;
