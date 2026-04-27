-- =====================================================================
-- BooPick — listings.external_id 컬럼 (외부 ID 매핑)
-- Migration: 0007_external_id.sql
--
-- 용도: 네이버부동산 등 외부 출처 매물번호를 저장해 idempotent 임포트 보장
-- =====================================================================

alter table public.listings
  add column if not exists external_id text;

create unique index if not exists idx_listings_external_id
  on public.listings(external_id)
  where external_id is not null;

notify pgrst, 'reload schema';
