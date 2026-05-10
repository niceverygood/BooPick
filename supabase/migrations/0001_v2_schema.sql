-- =====================================================================
-- BooPick V2 (분석 SaaS) — Initial Schema
-- Migration: 0001_v2_schema.sql
-- =====================================================================

-- 1. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  tier text NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro')),
  reports_used_month int NOT NULL DEFAULT 0,
  reports_reset_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. datasets
CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_filename text,
  row_count int NOT NULL DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);

-- 3. listings
CREATE TABLE listings (
  id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  article_no text,
  지역 text,
  공급_m2 numeric,
  전용_m2 numeric,
  공급_평 numeric GENERATED ALWAYS AS (공급_m2 / 3.3058) STORED,
  전용_평 numeric GENERATED ALWAYS AS (전용_m2 / 3.3058) STORED,
  해당층 text,
  전체층 text,
  보증금 bigint,
  월세 bigint,
  관리비 bigint,
  현재업종 text,
  추천업종 text,
  간략설명 text,
  설명 text,
  주소 text,
  사용승인일 date,
  중개사무소명 text,
  raw_data jsonb
);

CREATE INDEX idx_listings_dataset_id ON listings(dataset_id);
CREATE INDEX idx_listings_공급_m2 ON listings(공급_m2);
CREATE INDEX idx_listings_월세 ON listings(월세);
CREATE INDEX idx_listings_사용승인일 ON listings(사용승인일);

-- 4. reports
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dataset_id uuid REFERENCES datasets(id) ON DELETE SET NULL,
  query_raw text NOT NULL,
  query_parsed jsonb NOT NULL,
  industry text,
  selected_listings bigint[],
  pdf_url text,
  tier_used text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reports_user_id ON reports(user_id);

-- 5. RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "datasets_self" ON datasets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "listings_self" ON listings FOR ALL USING (
  dataset_id IN (SELECT id FROM datasets WHERE user_id = auth.uid())
);
CREATE POLICY "reports_self" ON reports FOR ALL USING (auth.uid() = user_id);

-- 6. 신규 가입 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, tier)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'basic');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. updated_at 트리거 (profiles)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 8. PostgREST schema reload
NOTIFY pgrst, 'reload schema';
