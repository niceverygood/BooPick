# Phase 0: 기존 코드 리셋

> **목표**: 기존 BoBoick CRM-form 코드를 정리하고 분석 SaaS 베이스로 전환
> **소요 시간**: 30분
> **선행 조건**: 없음 (가장 먼저 실행)

---

## 📌 클로드 코드에게 줄 프롬프트

아래 프롬프트를 Claude Code 터미널에서 실행하세요.

```
@CLAUDE.md 파일을 먼저 정독하고 시작해줘.

이 프로젝트는 부픽 v2 피벗이야. 기존 코드를 정리하고 분석 SaaS 베이스로 만들어야 해.

# 작업 1: 기존 파일 삭제

다음 파일/폴더를 모두 삭제해줘:
- app/dashboard/listings/* (매물 등록 페이지)
- app/dashboard/co-brokerage/* (공동중개 페이지)
- app/dashboard/inbox/* (그룹챗 모니터링)
- app/api/listings/* (매물 CRUD API)
- app/api/auth/kakao/* (카카오 OAuth)
- components/listing-form.tsx
- components/listing-card.tsx
- components/co-brokerage-toggle.tsx
- lib/embeddings.ts (pgvector 사용)
- supabase/migrations/0001_initial_schema.sql ~ 0005_user_signup_trigger.sql (모든 기존 마이그레이션)

# 작업 2: 새 마이그레이션 작성

supabase/migrations/0001_v2_schema.sql 새로 작성:

```sql
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

-- 2. datasets (업로드 단위)
CREATE TABLE datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  original_filename text,
  row_count int NOT NULL DEFAULT 0,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_datasets_user_id ON datasets(user_id);

-- 3. listings (개별 매물)
CREATE TABLE listings (
  id bigserial PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  article_no text,                  -- 네이버부동산 매물번호
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

-- 5. RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- profiles: 자기 것만
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (auth.uid() = id);

-- datasets: 자기 것만
CREATE POLICY "datasets_self" ON datasets FOR ALL USING (auth.uid() = user_id);

-- listings: 자기 dataset의 매물만
CREATE POLICY "listings_self" ON listings FOR ALL USING (
  dataset_id IN (SELECT id FROM datasets WHERE user_id = auth.uid())
);

-- reports: 자기 것만
CREATE POLICY "reports_self" ON reports FOR ALL USING (auth.uid() = user_id);

-- 6. 신규 가입 시 profile 자동 생성 트리거
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
```

# 작업 3: Supabase 마이그레이션 적용

다음을 순서대로 실행:

1. Supabase Studio (http://localhost:54321) 접속 가능한지 확인
2. `npx supabase db reset` 실행 (기존 DB 초기화 + 새 마이그레이션 적용)
3. SQL 에디터에서 다음으로 검증:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   ```
4. 결과: `profiles, datasets, listings, reports` 4개 테이블만 있어야 함

# 작업 4: 디렉토리 구조 정리

새로 만들 폴더 구조:

```
app/
  (marketing)/
    page.tsx                    # 랜딩
    pricing/page.tsx
  (auth)/
    login/page.tsx
    signup/page.tsx
  (dashboard)/
    layout.tsx                  # 인증 보호
    dashboard/
      page.tsx                  # 메인 대시보드
      upload/page.tsx           # Phase 1
      search/page.tsx           # Phase 2-3
      reports/page.tsx          # 리포트 목록
      reports/[id]/page.tsx     # 리포트 상세
  api/
    upload/route.ts             # Phase 1
    parse-query/route.ts        # Phase 2
    search/route.ts             # Phase 3
    generate-pdf/route.ts       # Phase 4
components/
  ui/                           # shadcn (유지)
  upload-dropzone.tsx           # Phase 1
  query-input.tsx               # Phase 2
  parsed-conditions.tsx         # Phase 2
  results-table.tsx             # Phase 3
  industry-selector.tsx         # Phase 5
lib/
  supabase/
    server.ts                   # 유지
    client.ts                   # 유지
  excel-parser.ts               # Phase 1
  query-parser.ts               # Phase 2
  scoring.ts                    # Phase 3
  pdf-generator.ts              # Phase 4
  industries/
    marriage.ts                 # Phase 5 (결혼정보회사)
types/
  database.ts                   # Supabase 타입
  index.ts
```

기존 폴더에서 위 구조에 안 맞는 것은 삭제. 빈 폴더는 .gitkeep 으로 유지.

# 작업 5: 기존 의존성 정리

package.json에서 다음 패키지 제거 (사용 안 함):
- @kakao/sdk (있다면)
- pgvector
- 기타 매물 등록 관련 라이브러리

다음 패키지 설치 (Phase 1~5에서 사용):
- xlsx (엑셀 파싱)
- qrcode (QR 코드 생성)
- puppeteer (PDF 생성, dev에서)
- @sparticuz/chromium (Vercel 배포 시)

```bash
npm uninstall @kakao/sdk pgvector
npm install xlsx qrcode @types/qrcode
npm install puppeteer
# 배포 시: npm install @sparticuz/chromium puppeteer-core
```

# 작업 6: 기본 페이지 셋업

app/(marketing)/page.tsx 새로 작성:
- 부픽 v2 랜딩 페이지
- 헤드라인: "매물 40,000건을 30초 안에 분석해드립니다"
- 서브: "산업 특화 적합도 분석 + PDF 리포트"
- CTA 버튼: "무료로 시작하기" → /signup

app/(dashboard)/dashboard/page.tsx 새로 작성:
- "내 데이터셋" 리스트 (datasets 테이블)
- "최근 리포트" 리스트 (reports 테이블)
- "+ 새 매물 업로드" 버튼 → /dashboard/upload
- "+ 새 검색" 버튼 → /dashboard/search

# 검증 체크리스트

작업 끝나면 다음 확인:
- [ ] 기존 매물 등록·공동중개·카카오OAuth 코드 모두 삭제됨
- [ ] supabase/migrations 에 0001_v2_schema.sql 만 있음
- [ ] `npx supabase db reset` 성공
- [ ] profiles, datasets, listings, reports 테이블 생성됨
- [ ] 새 디렉토리 구조 (app/dashboard/upload, search, reports) 셋업됨
- [ ] xlsx, qrcode, puppeteer 패키지 설치됨
- [ ] 랜딩 페이지 + 대시보드 페이지 빈 골격 존재함
- [ ] `npm run dev` 정상 작동
- [ ] localhost:3001 접속 시 새 랜딩 보임

위 모든 체크리스트 통과하면 Phase 1으로 진행할 수 있어.

진행해줘.
```

---

## ✅ 완료 후 다음 단계

→ `Phase 1: 매물 업로드` 프롬프트 사용
