# 부픽 (BooPick) 기능 설명서

> 현재까지 구축된 기능의 단일 진입점 문서. 새로 합류한 사람은 이 문서를 읽으면 코드 위치·사용법·기 발견 quirks를 파악할 수 있다.
> 마지막 갱신: 2026-04-27 / 진행 단계: PHASE 1 완료 + PHASE 2 완료 + Week 2 첫 단위 (AI 태깅) 완료

---

## 1. 개요

| 항목 | 값 |
|---|---|
| 정의 | 공인중개사를 위한 AI 매물 매칭 + 공동중개 풀 SaaS |
| 회사 | Bottle Inc. (대표 한승수) |
| 핵심 베타 사용자 | 강남권 1선 중개사무소 (NDA — 공개 문서에서 익명 처리) |
| 목표 | 손님 조건 한 줄 → 30초 내 매칭 매물 5개 카드 회신 |
| 진행 단계 | Week 1 셋업 완료, Week 2 진행 중 |
| **출시 전략** | **Phase 1 (현재 6주 MVP)**: 자체 모바일 웹앱(PWA) 단독 / **Phase 2 (베타 안정화 후)**: 카톡 챗봇·알림톡 연동 |

자세한 비전·로드맵은 [CLAUDE.md](../CLAUDE.md) 참조.

---

## 2. 디렉토리 구조 (현재)

```
BooPick/
├── CLAUDE.md                       # Claude Code 메모 (자동 로드)
├── .env.local                      # 환경변수 (gitignored)
├── components.json                 # shadcn 설정
├── middleware.ts                   # Next.js 루트 미들웨어 (Supabase 세션 갱신)
├── next.config.mjs / postcss.config.mjs / tailwind.config.ts / tsconfig.json
├── package.json                    # name="boopick" (소문자 강제)
│
├── app/
│   ├── layout.tsx                  # 루트 레이아웃 (Inter 폰트, ko 로케일)
│   ├── page.tsx                    # 임시 랜딩 (cream 배경 + navy 타이틀)
│   ├── globals.css                 # Tailwind + shadcn slate HSL + 부픽 브랜드 컬러
│   ├── test-connection/
│   │   └── page.tsx                # Supabase/Claude/OpenAI 연결 검증 페이지
│   └── api/
│       └── listings/
│           └── tag/
│               └── route.ts        # POST: 매물 설명 → AI 태그 (Week 2)
│
├── components/
│   └── ui/                         # shadcn 컴포넌트 13개 (toast 포함)
│
├── lib/
│   ├── utils.ts                    # shadcn cn() 헬퍼
│   ├── claude.ts                   # Anthropic SDK 래퍼
│   ├── openai.ts                   # OpenAI SDK 래퍼 (Embedding + Whisper)
│   ├── tagging/
│   │   └── extract-tags.ts         # 매물 자동 태깅 함수
│   └── supabase/
│       ├── server.ts               # 서버 클라이언트 (RLS / Admin)
│       ├── client.ts               # 브라우저 클라이언트
│       ├── middleware.ts           # 세션 갱신 헬퍼
│       └── database.types.ts       # 타입 (현재 any 플레이스홀더)
│
├── hooks/
│   └── use-toast.ts                # shadcn toast 훅
│
├── prompts/                        # Claude 프롬프트 (.md)
│   ├── parse-query.md              # 쿼리 파싱
│   ├── tag-listing.md              # 매물 태깅 (Week 2 사용 중)
│   └── rank-results.md             # 결과 랭킹
│
├── supabase/
│   └── migrations/                 # 5개 마이그레이션 (1~5번)
│
└── docs/
    └── FEATURES.md                 # 본 문서
```

---

## 3. 사전 문서 (9개, 코드 작성 전 합의)

### 3.1 [CLAUDE.md](../CLAUDE.md)
프로젝트 한 줄 정의, 기술 스택, 핵심 설계 원칙(카톡 우선/공동중개 풀=해자/한국어 우선/PII 보호/30초 응답), 데이터 모델, 가격 티어, 6주 로드맵, DoD, 절대 하지 말 것 6가지. Claude Code가 매 세션 자동 로드.

### 3.2 프롬프트 3종 ([prompts/](../prompts/))
모두 `## System Prompt` + `## 출력 스키마` + `## 변환 규칙` + `## 예시` 구조의 마크다운. `lib/claude.ts`의 `loadPrompt()`로 전체 파일을 systemPrompt로 사용.

| 파일 | 입력 | 출력 |
|---|---|---|
| [parse-query.md](../prompts/parse-query.md) | 자연어 검색어 | 구조화 JSON (region/building_type/transaction_type/area/floor/deposit/monthly_rent/industries/facilities/location_features/condition) |
| [tag-listing.md](../prompts/tag-listing.md) | 매물 설명 + 간략설명 | `{industries, facilities, location_features, condition}` 4-축 태그 (각 사전 정의된 카테고리에서만 매칭) |
| [rank-results.md](../prompts/rank-results.md) | 손님 조건 + 후보 매물 N건 | 상위 5개 + 매칭 근거 1줄 + highlight_tags + 양타 수수료 추정 (공동중개 시) |

### 3.3 SQL 마이그레이션 5종 ([supabase/migrations/](../supabase/migrations/))

| 파일 | 내용 |
|---|---|
| 0001_initial_schema.sql | 9개 테이블: agencies / users / listings / client_requests / match_notifications / co_brokerage_inquiries / share_card_logs / ad_copies / search_logs. pgvector 확장 활성화. updated_at 트리거 |
| 0002_indexes.sql | 정형 필터 인덱스 + ivfflat 벡터 인덱스(lists=200) + jsonb GIN(ai_tags) + pg_trgm(description) |
| 0003_rls_policies.sql | 모든 테이블 RLS. `auth.user_agency_id()` 헬퍼. **공동중개 풀 핵심**: `listings_select_own_or_shared` (내 매물 OR `is_shared=true`). PII 마스킹 view `listings_public` (다른 agency가 볼 때 임대인 정보 NULL) |
| 0004_co_brokerage.sql | `search_listings()` 하이브리드 검색 함수 (정형 + 임베딩). 새 매물 등록 시 활성 손님 조건과 자동매칭 트리거. 공동중개 관심 등록 시 `pg_notify`. `check_plan_limit()` 플랜 한도 체크 |
| 0005_user_signup_trigger.sql | 카카오 OAuth 가입 → `agencies` + `users` 자동 생성 (14일 무료체험, admin 권한) |

상태: Supabase 프로젝트에 적용 완료 (test-connection의 Supabase ✅로 검증).

---

## 4. 프론트엔드 셋업

### 4.1 Next.js 14
- 버전: **14.2.35** (App Router, TypeScript strict, ESLint)
- `package.json`의 `name="boopick"` (소문자 — npm 제약)
- `tsconfig.json`: `"strict": true` 명시
- `app/layout.tsx`: Inter 폰트 (`next/font/google`), `lang="ko"`, metadata `"부픽 (BooPick)"`

### 4.2 Tailwind v3 + shadcn 2.1.8
- 스타일: `default`, 베이스 컬러: `slate`, CSS 변수: HSL 형식 (`H S% L%`)
- shadcn 4.x는 Tailwind v4 + oklch 가정으로 v3 환경에서 호환되지 않아 2.1.8로 핀
- 설치된 컴포넌트 13개 (`components/ui/`):
  - `button`, `input`, `label`, `card`, `form`, `dialog`, `dropdown-menu`, `toast`, `toaster`, `sonner`, `separator`, `avatar`, `badge`
- 추가 의존성: `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `next-themes`

### 4.3 부픽 브랜드 컬러 ([app/globals.css](../app/globals.css))
`:root` 안에만 정의 (다크 모드와 동일하게 유지):

| 변수 | HSL | Hex 근사 | 용도 |
|---|---|---|---|
| `--boopick-navy` | `217 49% 20%` | `#1A2E4C` | 메인 / 신뢰 |
| `--boopick-orange` | `13 100% 64%` | `#FF7849` | 액센트 / 활기 |
| `--boopick-green` | `160 84% 39%` | `#10B981` | 성공 / 체크 |
| `--boopick-cream` | `30 100% 98%` | `#FFF9F5` | 따뜻한 배경 |

사용 예: `style={{ color: "hsl(var(--boopick-navy))" }}` 또는 Tailwind config에 추가해 `bg-boopick-navy`로도 가능.

---

## 5. Supabase 통합 (`lib/supabase/`)

### 5.1 [server.ts](../lib/supabase/server.ts)
서버 컴포넌트·서버 액션·라우트 핸들러용.

```ts
import { createClient, createAdminClient } from "@/lib/supabase/server";

// (a) RLS 적용 — 사용자 세션 기반 (cookies)
const supabase = createClient();
const { data } = await supabase.from("listings").select("*");

// (b) RLS 우회 — 트리거/배치/seed 작업 전용 (절대 클라이언트 노출 금지)
const admin = createAdminClient();
await admin.from("listings").insert({ ... });
```

### 5.2 [client.ts](../lib/supabase/client.ts)
브라우저(클라이언트 컴포넌트)용. `createBrowserClient` 래핑.

```ts
"use client";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

### 5.3 [middleware.ts](../lib/supabase/middleware.ts) + 루트 [middleware.ts](../middleware.ts)
모든 요청마다 세션 토큰 자동 갱신. 정적 자원(`_next/static`, `_next/image`, favicon, svg/png/jpg/woff…)은 matcher에서 제외.

### 5.4 [database.types.ts](../lib/supabase/database.types.ts) ⚠️
**현재 `Database = any` 플레이스홀더.** Supabase CLI 자동 생성에는 `supabase login`(브라우저 인터랙티브) 또는 `SUPABASE_ACCESS_TOKEN` 필요. PHASE 3 즈음 한 번 실행 권장:

```bash
supabase login
supabase link --project-ref <REF>
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

---

## 6. Claude API 래퍼 ([lib/claude.ts](../lib/claude.ts))

### 6.1 모델 ID
- 기본: `claude-sonnet-4-6`
- 다운그레이드: `claude-haiku-4-5` (단순 파싱·비용 절감용, `useHaiku: true` 플래그)

### 6.2 exports

```ts
callClaude(opts: ClaudeCallOptions): Promise<ClaudeCallResult>
callClaudeJSON<T>(opts: ClaudeCallOptions): Promise<{ data: T; tokens }>
loadPrompt(name: PromptName): Promise<string>

type PromptName = "parse-query" | "tag-listing" | "rank-results" | "ad-copy" | "voice-summary"
```

### 6.3 사용 예
```ts
const systemPrompt = await loadPrompt("tag-listing");
const { data, tokens } = await callClaudeJSON<ListingTags>({
  systemPrompt,
  userMessage: "설명: 신사동 1층 25평 ...",
  maxTokens: 500,
  useHaiku: false,
});
```

`callClaudeJSON`은 응답에서 ```` ```json ```` 코드 블록 자동 제거 후 `JSON.parse` → 실패 시 `Claude JSON 파싱 실패: <앞 200자>` 에러.

### 6.4 토큰 비용 메모
- Sonnet 4.6: input ~$3/M, output ~$15/M
- 시스템 프롬프트(전체 .md) ~1.6k 토큰, 출력 ~40~100 토큰
- 호출 1회당 ~$0.0065 추정

---

## 7. OpenAI API 래퍼 ([lib/openai.ts](../lib/openai.ts))

### 7.1 모델
- 임베딩: `text-embedding-3-small`, **1536 차원** (CLAUDE.md 명시)
- STT: `whisper-1`, 한국어 (`language: "ko"`)

### 7.2 exports

```ts
createEmbedding(text: string): Promise<number[]>                      // 1536 길이
createEmbeddingsBatch(texts: string[]): Promise<number[][]>           // BATCH_SIZE=100
transcribeAudio(audioFile: File | Blob): Promise<string>              // F8 음성메모용
```

### 7.3 사용 예
```ts
import { createEmbedding } from "@/lib/openai";
const vec = await createEmbedding("신사동 1층 카페자리");  // length === 1536

// listings.ai_embedding(vector(1536))에 그대로 저장
await admin.from("listings").update({ ai_embedding: vec }).eq("id", id);
```

---

## 8. AI 자동 태깅 (Week 2 첫 단위)

### 8.1 [lib/tagging/extract-tags.ts](../lib/tagging/extract-tags.ts)

```ts
extractTags(input: ExtractTagsInput): Promise<ExtractTagsResult>

type ExtractTagsInput = {
  description: string;            // 매물 본 설명 (필수)
  shortDescription?: string;      // 간략설명
  useHaiku?: boolean;             // 비용 절감 모드
}

type ExtractTagsResult = {
  tags: ListingTags;              // 4-축 태그
  tokens: { input: number; output: number };
}

type ListingTags = {
  industries: string[];           // ex) ["미용실", "카페"]
  facilities: string[];           // ex) ["테라스", "엘리베이터"]
  location_features: string[];    // ex) ["코너자리", "역세권"]
  condition: string[];            // ex) ["권리금없음", "즉시입주"]
}
```

내부적으로:
1. `loadPrompt("tag-listing")` → systemPrompt
2. userMessage = `"설명: ...\n간략설명: ..."`
3. `callClaudeJSON<ListingTags>` 호출
4. 출력 shape 검증 (`Array.isArray` + `typeof === "string"` 가드)

### 8.2 [POST /api/listings/tag](../app/api/listings/tag/route.ts)

`runtime = "nodejs"` (loadPrompt가 `fs.readFile` 사용).

**요청**:
```json
POST /api/listings/tag
{
  "description": "...",
  "short_description": "...",     // optional
  "use_haiku": false                // optional
}
```

**응답** (200):
```json
{
  "tags": {
    "industries": ["미용실", "카페"],
    "facilities": ["테라스", "통유리", "엘리베이터", "주차가능"],
    "location_features": ["코너자리", "역세권", "1층노출"],
    "condition": ["권리금없음", "즉시입주"]
  },
  "tokens": { "input": 1739, "output": 97 }
}
```

**에러**:
- `400` JSON 파싱 실패 / 객체 본문이 필요합니다 / description 필드(문자열)가 필요합니다
- `500` Claude JSON 파싱 실패 / 기타

### 8.3 검증 명령
```bash
curl -s -X POST http://localhost:3000/api/listings/tag \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "신사동 가로수길 코너 1층, 25평 정사각형 구조에 통유리로 전면이 시원하게 트여 있습니다. 테라스 약 5평 별도 보유, 미용실/카페 운영하기 좋은 자리입니다.",
    "short_description": "가로수길 코너 1층, 테라스 카페자리"
  }'
```

3개 케이스(풍부/모호/입력검증) 모두 검증 완료. tag-listing.md 예시와 1:1 일치.

---

## 9. 페이지

### 9.1 [/ (홈)](../app/page.tsx)
임시 랜딩. cream 배경 + navy 타이틀 "부픽 (BooPick)" + slate "셋업 완료". shadcn `Card`로 감싸서 컴포넌트 작동 확인 겸.

### 9.2 [/test-connection](../app/test-connection/page.tsx) ⚠️ 임시
서버 컴포넌트. `Promise.all`로 3개 외부 서비스 병렬 검증:

| 검사 | 호출 | 성공 기준 |
|---|---|---|
| Supabase | `agencies` 테이블 count 쿼리 | error 없음 (RLS로 0건이어도 OK) |
| Claude | `callClaude("안녕")` | 응답 + 토큰 수 |
| OpenAI | `createEmbedding("hello")` | 1536 차원 벡터 |

shadcn `Card` 3개로 ✅/❌ 표시. PHASE 5 즈음 (dashboard) 그룹 안으로 이동 또는 삭제 예정.

---

## 10. 환경변수 ([.env.local](../.env.local))

```
NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<JWT>
SUPABASE_SERVICE_ROLE_KEY=<JWT>          # 서버 사이드만, 절대 클라이언트 노출 금지
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
KAKAO_CLIENT_ID=                          # PHASE 3에서 설정
KAKAO_CLIENT_SECRET=
KAKAO_REST_API_KEY=
KAKAO_ADMIN_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env*.local` 패턴은 [.gitignore](../.gitignore)에 포함.

---

## 11. 알아둘 것 (Gotchas)

### 11.1 `ANTHROPIC_API_KEY` 빈 값 (Claude Code 한정)
Claude Code(에이전트 하네스)가 spawn하는 Bash subprocess에 `ANTHROPIC_API_KEY=""` 보안 차원 자동 주입. Next.js의 env 우선순위는 `process.env(기존) > .env.local`이라 빈 값이 .env.local을 가린다.

**증상**: `Could not resolve authentication method` 에러
**우회**: 검증 셸에서 `unset ANTHROPIC_API_KEY` 후 `npm run dev`
**일반 사용자 터미널(iTerm/Warp 등)에서는 발생하지 않음.**

### 11.2 포트 3000 점유 → 자동 3001 fallback
다른 사용자 node 프로세스가 3000을 점유하면 Next.js가 3001로 자동 fallback. 중지하려면 점유 PID 확인 후 본인 프로세스만 종료.

### 11.3 `Database = any`
Supabase 자동 생성 타입은 PHASE 3 즈음 도입 예정. 현재는 모든 쿼리 결과가 `any`로 반환됨 (런타임 안전성은 보장되나 컴파일러 도움 없음).

### 11.4 디렉토리 이름 vs npm 이름
폴더는 `BooPick/`(대문자 OK), `package.json` `name`은 `boopick`(npm 소문자 강제). Next.js init 시 충돌 → 임시 폴더에 init 후 옮기는 우회 사용함.

### 11.5 `form` 컴포넌트와 shadcn 4.x 비호환
shadcn 4.x base-nova 레지스트리에는 `form`이 없음. 그래서 2.1.8 라인 사용. 추후 4.x로 마이그레이션 시 `form` 사용처 직접 패치 필요.

### 11.6 토큰 비용 (대량 임포트 시 주목)
베타 파트너 매물 수만 건 일괄 태깅 시 Sonnet 4.6 기준 호출당 ~$0.0065 (예: 4만 건이면 약 $260). 옵션:
- `useHaiku: true` → 5~10x 절감 (~$30~60)
- 시스템 프롬프트 축약 (예시 섹션 제거하면 ~700 토큰 절감)

배치 임포트 직전 결정 필요.

---

## 12. 다음 단계 후보

Week 2 남은 작업:

| 후보 | 의존성 | 규모 |
|---|---|---|
| **`lib/search/parse-query.ts`** | 없음 (extract-tags와 같은 패턴) | 소 |
| **`scripts/import-beta-listings.ts`** | extractTags + createEmbeddingsBatch + admin client | 중 (CSV 형식 결정 필요) |
| **인증 + 매물 CRUD UI** | 카카오 OAuth 또는 임시 로그인 결정 필요 | 대 |

---

## 13. 자주 쓰는 명령

```bash
# 로컬 개발
npm run dev                                  # localhost:3000 (또는 3001)

# 검증 셸에서 Claude API 안 될 때
unset ANTHROPIC_API_KEY && npm run dev

# 환경변수 채움 상태 확인 (값 마스킹)
awk -F= '/^[A-Z]/ { if(length($2)==0) print $1" → EMPTY"; else print $1" → SET("length($2)" chars)" }' .env.local

# 매물 태깅 API 호출
curl -s -X POST http://localhost:3000/api/listings/tag \
  -H 'Content-Type: application/json' \
  -d '{"description":"...","short_description":"..."}'

# Supabase 타입 자동 생성 (PHASE 3 이후 추천)
supabase login && supabase link --project-ref <REF>
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

---

## 14. 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-04-25 | 사전 문서 9개 작성 (CLAUDE.md, 프롬프트 3종, 마이그레이션 5종) |
| 2026-04-26 | PHASE 1 셋업 완료 (Next.js + shadcn 2.1.8 + 부픽 컬러). 셋업 중 shadcn 4.x↔v3 호환성 이슈로 2.1.8 핀 결정 |
| 2026-04-26 | PHASE 2 인프라 완료 (Supabase + Claude + OpenAI 래퍼 + /test-connection 검증) |
| 2026-04-26 | Week 2 첫 단위 — AI 자동 태깅 (`lib/tagging/extract-tags.ts` + `POST /api/listings/tag`) |
| 2026-04-27 | 본 문서 작성 |
| 2026-04-27 | **출시 전략 변경**: 카카오톡 챗봇/알림톡 → Phase 2로 분리. Phase 1은 자체 모바일 웹앱(PWA) 단독으로 6주 MVP 진행. Week 4 작업이 "카톡 챗봇 + 자동매칭"에서 "자동매칭 알림 (인앱·이메일) + PWA 최적화"로 변경. CLAUDE.md / docs/사용가이드.md / docs/사용가이드.docx 동기화. 카카오 OAuth 로그인 + 카카오페이 결제는 Phase 1 그대로 유지. |
