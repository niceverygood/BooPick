-- =====================================================================
-- BooPick V2 — SEO 가이드 자동 생성 인프라
-- Migration: 0009_guides.sql
-- =====================================================================

-- 1. SEO 가이드 (자동 생성 컨텐츠)
create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  body text not null,                          -- markdown
  meta_description text,
  topic text,                                  -- "강남 카페" 등 키워드
  listing_id uuid references public.listings(id) on delete set null,
  hero_query text,                             -- "이 검색어로 들어오는 사람들에게 보여주기"
  hashtags text[] default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  view_count int not null default 0,
  click_count int not null default 0,          -- "이 매물 보기" 클릭
  ai_model text,
  ai_tokens_in int,
  ai_tokens_out int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guides_slug on public.guides(slug);
create index if not exists idx_guides_status on public.guides(status, published_at desc);
create index if not exists idx_guides_listing on public.guides(listing_id);

-- 2. RLS — 발행된 가이드는 anon read 가능
alter table public.guides enable row level security;

drop policy if exists "guides public read published" on public.guides;
create policy "guides public read published"
  on public.guides for select
  to anon, authenticated
  using (status = 'published');

-- 3. updated_at 트리거
drop trigger if exists guides_updated_at on public.guides;
create trigger guides_updated_at before update on public.guides
  for each row execute function trigger_set_updated_at();

-- 4. PostgREST schema reload
notify pgrst, 'reload schema';
