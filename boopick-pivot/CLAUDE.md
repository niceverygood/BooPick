# BooPick (부픽) v2 - Pivot to Analysis SaaS

## 🎯 프로젝트 정체성

**한 줄 정의**: 부동산 사장님이 매물 엑셀을 업로드하면, 30초 안에 클라이언트 의뢰 조건에 맞는 매물 5건을 찾고 산업별 적합도 분석 리포트(PDF)를 생성해주는 SaaS.

**핵심 가치 제안**:
- 매물 40,000건 검토 → 30초
- 산업 특화 분석 리포트 자동 생성
- 클라이언트(의뢰인)에게 그대로 발송 가능한 PDF

**타겟 사용자**: 한국 공인중개사 (특히 강남/판교 등 사옥 매물 다루는 사장님)

## 🏗️ 기술 스택 (변경 없음, 기존 그대로 유지)

- **프레임워크**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **DB/Auth**: Supabase
- **AI**: Anthropic Claude (claude-sonnet-4-5) — 조건 파싱 + 산업 분석
- **PDF 생성**: Puppeteer (HTML → PDF)
- **결제**: V1에서는 빼고, 무료 베타로 시작 (V2에 카카오페이 추가)

## 🚫 V1에서 빠지는 기존 기능 (반드시 다 삭제)

이전 BoBoick 작업에서 만들었던 다음 기능들은 **모두 삭제**:

- ❌ 카카오 OAuth (그냥 이메일 로그인으로)
- ❌ 매물 등록 CRUD (사장님이 직접 매물 등록 X)
- ❌ 공동중개 매물 풀 (F6)
- ❌ 매물 매칭 알림 시스템 (F7)
- ❌ 그룹챗 자동 모니터링 (F8)
- ❌ pgvector 임베딩 (단순 SQL 검색으로 충분)
- ❌ 41,657건 임포트 데이터 (사용자가 직접 업로드하는 구조)

기존 코드에서 위 기능 관련 파일·테이블·API는 모두 제거.

## ✅ V1 핵심 기능 (이게 전부)

### 1. 매물 DB 업로드
- Excel(.xlsx) / CSV 업로드
- 자동 컬럼 매핑 (네이버부동산 엑셀 표준 형식)
- 사용자별 매물 풀 (다른 사용자와 격리)

### 2. 의뢰 조건 입력
- 자유 텍스트 입력
- Claude API로 자동 파싱 (지역, 면적, 임대료, 업종 등)
- 사용자가 파싱 결과 검토/수정

### 3. 매물 검색 + 점수화
- 조건 매칭 SQL 쿼리
- 적합도 스코어링 (단순 가중치 합)
- 상위 5건 추출

### 4. PDF 리포트 다운로드
- HTML 템플릿 → Puppeteer → PDF
- A4, 한글 폰트(Noto Sans KR)
- 매물 5건 비교표 + 매물별 상세 페이지

### 5. **산업 관점 분석** (Pro 티어 한정)
- 의뢰 업종(예: 결혼정보회사) 자동 인식 또는 수동 선택
- 업종별 운영 특성 페이지 (5가지 평가 기준)
- 매물별 "왜 이 업종에 좋은가" 분석 4개 포인트

### 6. **QR 코드 + 네이버부동산 링크** (Pro 티어 한정)
- 매물별 QR 코드 자동 생성
- 클릭 가능 URL 임베드
- 결정사 대표가 바로 네이버부동산 페이지 확인 가능

## 💰 티어 시스템

### 베이직 (무료 베타)
- 매물 업로드 ✅
- 조건 입력 + 검색 ✅
- 단순 매물 리스트 PDF (산업 분석 X, QR X) ✅
- 월 5건 리포트

### 프로 (무료 베타, V2에 유료화 예정)
- 모든 베이직 기능 ✅
- 산업 관점 분석 ✅
- QR 코드 + 네이버부동산 링크 ✅
- 월 50건 리포트

V1 단계에서는 모두 무료 베타. 가격은 V2에 결정.

## 🎯 지원 산업군

### V1 (출시 시점)
- **결혼정보회사** (검증 완료)

### V2 (점진 추가)
- 음식점 / 술집 / 홀덤펍
- 병의원 (의원·치과·피부과·한의원)
- 법무법인 / 회계법인 / 세무사
- 학원 / 스터디카페
- 미용실 / 네일샵 / 피부관리실

V1은 결혼정보회사 1개만 완벽하게 만들고 출시. V2부터 한 산업씩 추가.

## 📊 데이터베이스 스키마 (단순화)

기존 9개 테이블 모두 삭제 후 새로 작성:

```sql
-- 사용자 (Supabase Auth 사용)
profiles (
  id uuid PK -- auth.users(id) FK
  email text
  name text
  tier text DEFAULT 'basic' -- 'basic' or 'pro'
  created_at timestamp
)

-- 매물 데이터셋 (업로드 단위)
datasets (
  id uuid PK
  user_id uuid FK
  name text -- e.g. "260504_40795건.xlsx"
  row_count int
  uploaded_at timestamp
)

-- 매물 (개별 행)
listings (
  id bigserial PK
  dataset_id uuid FK
  article_no text -- 네이버부동산 매물번호
  지역 text
  공급_m2 numeric
  전용_m2 numeric
  공급_평 numeric -- 자동 계산 (m2 / 3.3058)
  전용_평 numeric
  해당층 text
  전체층 text
  보증금 bigint -- 원 단위
  월세 bigint
  관리비 bigint NULL
  현재업종 text NULL
  추천업종 text NULL
  간략설명 text
  설명 text -- 풀 본문
  주소 text
  사용승인일 date
  중개사무소명 text
  -- 검색 인덱스
  raw_data jsonb -- 원본 row 보관 (확장성)
)

-- 검색 + 리포트 기록
reports (
  id uuid PK
  user_id uuid FK
  dataset_id uuid FK
  query_raw text -- 사용자 입력 자유 텍스트
  query_parsed jsonb -- Claude가 파싱한 조건
  industry text NULL -- '결혼정보회사' 등 (Pro만)
  selected_listings bigint[] -- 5건 매물 ID
  pdf_url text NULL -- Supabase Storage 경로
  tier_used text -- 'basic' or 'pro'
  created_at timestamp
)
```

## 🏃 작업 진행 순서 (Phase별)

각 Phase는 별도 프롬프트 파일로 정리되어 있습니다:

- `Phase 0`: 기존 코드 리셋 (필수 첫 단계)
- `Phase 1`: 매물 업로드 + 자동 컬럼 매핑
- `Phase 2`: 의뢰 조건 입력 + AI 파싱
- `Phase 3`: 매물 검색 + 점수화
- `Phase 4`: PDF 리포트 생성 (베이직 버전)
- `Phase 5`: 산업 관점 분석 (Pro 버전)
- `Phase 6`: 인증 + 티어 시스템

각 Phase는 독립적으로 개발 가능하지만, 순서대로 진행 권장.

## 🎨 디자인 원칙

### 색상
- Primary: Navy `#0F172A` (제목, 헤더)
- Accent: Orange `#B45309` (강조, CTA)
- Success: Green `#16A34A`
- Warning: Amber `#F59E0B`
- Background: `#FFFFFF` / `#F8FAFC`

### 톤
- 한국어 우선 (영문은 보조)
- 부동산 사장님 친화적 (전문 용어 풀어 설명)
- 모바일 우선 (한대표가 카톡으로 자료 받는 모바일 사용자)

## 🚨 절대 하지 말 것

1. **네이버부동산 자동 크롤링 금지** — 약관 위반, 저작권 문제
2. **다른 사용자 매물 노출 금지** — 사용자 격리 RLS 필수
3. **의뢰인 개인정보 PDF 노출 금지** — 의뢰 조건만 표시, 의뢰인 이름 X
4. **임의 사진 합성 금지** — QR + URL로만 연결
5. **자동 가격 추정 금지** — 광고 데이터만 표시, 추정값은 표기 명시

## 📝 참고 자료

`/assets/` 폴더 내:
- `proposal_v7_template.html` - PDF 리포트 HTML 템플릿 (검증 완료)
- `industry_marriage.json` - 결혼정보회사 산업 분석 프롬프트
- `excel_column_mapping.json` - 네이버부동산 엑셀 표준 컬럼 매핑

## 🔑 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=  # Claude (조건 파싱 + 산업 분석)

# Puppeteer 배포용 (선택)
PUPPETEER_EXECUTABLE_PATH=  # Vercel 배포 시 @sparticuz/chromium 경로
```
