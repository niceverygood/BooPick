# BooPick (부픽) — Claude Code Memory · V2

> 이 파일은 Claude Code가 매 세션마다 자동으로 읽습니다.
> **V2 (2026-05-06~) — V1과는 가설이 뒤집혔으니 반드시 끝까지 읽고 작업할 것.**

## 🎯 프로젝트 한 줄 정의 (V2)

**부픽은 임차인을 모아서 가입 중개사에게 분배하는 인프라다.**

임차인이 자연어로 상가/사무실을 찾으면, 가입 중개사 매물 중 매칭되는 걸 즉시 노출하고, 임차인 컨택을 등록 중개사에게 카톡으로 분배.

## 📜 V1 → V2 전환 (2026-05-06)

| 축 | V1 (폐기) | V2 (현재) |
|---|---|---|
| 메인 사용자 | 중개사 (B2B) | **임차인 (B2C)** + 중개사 백오피스 |
| 매물 풀 정의 | 공동중개 풀 (다른 중개사도 검색) | **임차인 노출 슬롯** (가로채기 차단 default OFF) |
| 핵심 가치 | 중개사간 매물 공유 + 양타 | **임차인 acquisition + 분배** |
| 가격 4단 | 49k/149k/390k/협의 | **99k/299k/990k + 성공보수형 0원** |
| acquisition | (없음) | SEO 가이드 일 30건 + 카톡봇 + 인스타 자동 생성 |
| 락인 | (없음) | 4단 락인 (이력/SEO/노출슬롯/검증배지) |

**V1 코드는 살림** — Next.js + Supabase + Claude/OpenAI + 검색 파이프라인은 그대로. 가설만 갈음.

## 👥 누가 만드나

- 회사: Bottle Inc. (주식회사 바틀)
- 대표: 한승수
- 위치: 판교 테크노밸리 스타트업 캠퍼스
- 베타 데이터: 강남권 1선 중개사무소 1곳 매물 41,658건 (자체/베타 파트너 정리, NDA 익명)

## 🛠 기술 스택 (V1과 동일)

| 레이어 | 선택 |
|---|---|
| Framework | Next.js 14 App Router + TypeScript strict |
| Styling | Tailwind v3 + shadcn 2.1.8 (default style, slate base) |
| DB | Supabase Postgres + pgvector + RLS |
| Auth | Supabase Auth + 카카오 OAuth (임차인 / 중개사 별도) |
| LLM | Claude Sonnet 4.6 (`claude-sonnet-4-6`) / Haiku 4.5 (`claude-haiku-4-5`) |
| STT | OpenAI Whisper |
| Embedding | OpenAI text-embedding-3-small (1536) |
| 알림 | 인앱 + 이메일 (Phase 1) → 카카오 알림톡 (Phase 2) |
| 결제 | 카카오페이 또는 토스페이먼츠 (Phase 2) |
| 호스팅 | Vercel + Supabase |
| SEO | next-sitemap, OG 이미지 자동 생성 |
| 인스타 | Meta Graph API (Phase 2) |

## 📐 핵심 설계 원칙 (V2)

1. **임차인 우선**: 트래픽 90%가 모바일 임차인. 그들의 30초 경험이 부픽 BM의 심장.
2. **가입 없이 검색까지**: 임차인은 anon_token으로 검색 가능. 컨택 시점에만 카톡 로그인 강제.
3. **노출 슬롯 = 핵심 자산**: 가입 중개사 매물의 `tenant_pool_enabled`가 부픽 가치 곡선의 단일 지표.
4. **가로채기 차단**: 다른 중개사 매물은 default 비공개. 옵트인 시점은 가입 중개사 본인이.
5. **임차인 PII 마스킹**: 중개사가 처음 보는 임차인 정보는 "동/예산/조건"만. 카톡 1:1 딥링크로 우회 컨택.
6. **acquisition 엔진은 자동화**: 사람 손으로 매일 컨텐츠 못 만든다. SEO+인스타+릴스 봇이 일 30건+.

## 📁 프로젝트 구조 (V2)

```
boopick/
├── app/
│   ├── (tenant)                    # 임차인용 — 메인 트래픽
│   │   ├── page.tsx                # / 랜딩 (Hero + 검색창 + 인기 검색어)
│   │   ├── find/page.tsx           # /find 검색 결과
│   │   ├── find/[id]/page.tsx      # /find/[id] 매물 상세 + 카톡 상담 CTA
│   │   ├── guide/[slug]/page.tsx   # /guide SEO 컨텐츠 (자동 생성)
│   │   └── chat/page.tsx           # /chat 카톡 스타일 AI 매물 상담
│   │
│   ├── agent/                      # 중개사 백오피스
│   │   ├── page.tsx                # /agent 대시보드
│   │   ├── search/page.tsx         # 본인 매물 + 동의 풀 자연어 검색 (V1 /search 이동)
│   │   ├── listings/page.tsx       # 매물 등록·수정
│   │   ├── leads/page.tsx          # 임차인 inquiry inbox
│   │   ├── auto-content/page.tsx   # 광고문구 자동 생성
│   │   ├── analytics/page.tsx      # 노출/클릭/컨택 통계
│   │   └── billing/page.tsx        # 구독 관리
│   │
│   ├── admin/                      # 부픽 운영자
│   │   ├── leads/page.tsx          # 임차인 풀 모니터링
│   │   ├── content/page.tsx        # 자동 컨텐츠 모더레이션
│   │   └── agents/page.tsx         # 가입 중개사 관리
│   │
│   ├── test-connection/page.tsx    # 인프라 검증 (V1 유지)
│   │
│   └── api/
│       ├── tenant/
│       │   ├── search/route.ts     # 임차인 매물 검색 (tenant_pool만)
│       │   ├── inquiry/route.ts    # 컨택 요청 생성 + 중개사 알림
│       │   └── track/route.ts      # 노출/클릭 트래킹
│       ├── agent/
│       │   ├── search/route.ts     # V1 /api/search 이동 (본인+동의풀)
│       │   ├── listings/...        # 매물 CRUD
│       │   └── leads/...           # inquiry 관리
│       ├── admin/
│       │   ├── seed/route.ts       # 데모 매물 시드
│       │   └── content/cron/...    # SEO 가이드 자동 생성 cron
│       ├── kakao/
│       │   ├── tenant-auth/        # 임차인 카카오 OAuth
│       │   └── agent-auth/         # 중개사 카카오 OAuth
│       └── search/parse/route.ts   # 자연어 → 정형 (V1 유지)
│
├── components/
│   ├── tenant/                     # 임차인용 카드/필터
│   ├── agent/                      # 중개사용 폼/테이블
│   └── ui/                         # shadcn
│
├── lib/
│   ├── claude.ts / openai.ts       # V1 그대로
│   ├── supabase/                   # V1 그대로 (server/client/middleware/admin)
│   ├── search/parse-query.ts       # V1 그대로
│   ├── tagging/extract-tags.ts     # V1 그대로
│   ├── tenant/                     # 신규: anon_token 추적, inquiry 분배
│   ├── content/                    # 신규: SEO 가이드 자동 생성
│   ├── notify/                     # 신규: 카톡/SMS/이메일 알림
│   └── seed/demo-listings.ts       # V1 그대로
│
├── prompts/
│   ├── parse-query.md / tag-listing.md / rank-results.md   # V1
│   ├── tenant-chat.md              # 신규: 카톡 챗봇 대화
│   ├── seo-guide.md                # 신규: SEO 가이드 자동 작성
│   └── ad-copy.md                  # 신규: 광고문구 (멀티 채널)
│
├── scripts/
│   └── import-listings-xlsx.ts     # V1 그대로 (학습용 41k 데이터 임포트)
│
├── supabase/migrations/
│   ├── 0001 ~ 0007                 # V1 (그대로)
│   └── 0008_tenant_side.sql        # V2 — 임차인 측 테이블
│
└── docs/
    ├── FEATURES.md                 # 개발자 기능 설명서
    └── 사용가이드.md (.docx)       # 사용자 가이드 (V2 톤으로 갱신 예정)
```

## 💾 데이터 모델 — V2 추가분

기존 V1 9개 테이블 위에 V2 신규:
- `tenants` — 임차인 (kakao_id 또는 anon_token 추적)
- `tenant_searches` — 검색 이력 (분석 + acquisition 채널 ROI)
- `tenant_inquiries` — 임차인 컨택 요청 (분배 핵심 테이블, status: pending/contacted/met/contracted/closed/cancelled)
- `subscription_plans` — 가격 플랜 (basic/pro/enterprise/success_fee)
- `listings.tenant_pool_enabled` (boolean) — 임차인 풀 노출 여부
- `listings.tenant_views/clicks/inquiries_count` — 노출 트래킹
- `agencies.plan_id` (FK to subscription_plans)
- `agencies.trial_plan_id`, `trial_ends_at` — 14일 Pro 트라이얼

상세는 `supabase/migrations/0008_tenant_side.sql` 참조.

## 💰 가격 (V2)

```ts
type PlanId = 'basic' | 'pro' | 'enterprise' | 'success_fee';

// monthly_price (KRW), features
basic        : 99,000  / { tenant_pool: false, ad_copy_daily: 5 }
pro          : 299,000 / { tenant_pool: true, ad_copy_daily: -1, analytics: true }
enterprise   : 990,000 / { tenant_pool: true, priority: true, api: true }
success_fee  : 0       / { tenant_pool: true, fee_rate: 0.07, requires_tracking: true }
```

베이직은 의도적 미끼 (임차인 풀 OFF). 메인 타겟은 Pro. 신규 진입자는 success_fee로 acquisition.

## 🤖 LLM 사용 패턴 (V1 + V2 신규)

| 용도 | 모델 | 위치 |
|---|---|---|
| 임차인 쿼리 파싱 | Sonnet 4.6 | parse-query.md |
| 매물 자동 태깅 | Haiku 4.5 (대량) | tag-listing.md |
| 매칭 랭킹 + 근거 | Sonnet 4.6 | rank-results.md |
| 광고문구 멀티채널 | Haiku 4.5 | ad-copy.md (V2) |
| SEO 가이드 1500~2500자 | Sonnet 4.6 | seo-guide.md (V2) |
| 카톡 챗봇 대화 | Sonnet 4.6 | tenant-chat.md (V2) |
| 음성메모 정리 | Sonnet 4.6 | voice-summary.md |
| STT | Whisper | lib/openai.ts |

호출 규칙:
- 모든 LLM 호출은 `lib/claude.ts` / `lib/openai.ts` 래퍼 통해서만
- 프롬프트는 `prompts/*.md` 파일로 분리
- 토큰/비용 로그를 모든 호출에서 수집

## 🔐 보안 & 멀티테넌시 (V2)

- **RLS 필수**: 모든 테이블 적용
- **임차인 PII**: 중개사가 보는 inquiry 첫 화면은 "동/예산/조건"만. 전화·이름은 inquiry status가 'contacted'로 바뀐 후에만
- **anon_token**: 비로그인 임차인은 cookie의 anon_token으로 추적. 컨택 시점에 카톡 로그인 강제하며 anon_token → kakao_id 병합
- **subscription_plans**: anon read 허용 (가격 페이지 노출용)
- **service_role key**: 서버 사이드만, 절대 클라이언트 노출 X

## ⚠️ 절대 하지 말 것 (V2)

1. ❌ **41k 강남 매물 데이터를 임차인 검색 결과로 노출** — 출처 정리 안 됐음. **학습/벤치마크/광고문구 LLM 컨텍스트로만 내부 사용**
2. ❌ **가입 중개사 동의 없이 다른 중개사 매물을 임차인 풀에 노출** — 가로채기 분쟁 즉시
3. ❌ **임차인 개인정보(전화 등)를 중개사에게 직접 노출** — 카톡 1:1 딥링크 또는 부픽 내 메시지로 우회
4. ❌ **거래 완료 매물 자동 비활성화 없이 운영** — 14일 미접속 매물 자동 archived
5. ❌ **광고법 위반** — 모든 매물에 매물번호 / 등록 중개사 / 사업자등록번호 표시 의무
6. ❌ **카카오톡 알림톡 사전 동의 없이 발송** — 정보통신망법 위반. 회원가입 시 명시적 동의

## 🚀 V2 4주 로드맵

| Step | 기간 | 핵심 |
|---|---|---|
| Step 0 | 1일 | V1 정리 (`/search → /agent/search`) + 마이그레이션 0008 (tenants, inquiries, plans) |
| Step 1 | 1주 | 임차인 진입점 — `/`, `/find`, `/find/[id]`, `/api/tenant/*` |
| Step 2 | 1주 | 분배 파이프 — 임차인/중개사 카카오 OAuth, 카톡 알림, `/agent/leads` inbox |
| Step 3 | 1주 | 중개사 백오피스 — `/agent` 대시보드, 매물 CRUD, 광고문구, billing stub |
| Step 4 | 1주 | 임차인 acquisition 엔진 — SEO 가이드 cron, 카톡 챗봇, 인스타 자동, UTM 추적 |

## ✅ Definition of Done

- [ ] 코드 작성 + 타입 안전 (TypeScript strict)
- [ ] 한국어 에러 메시지 (사용자 노출되는 부분)
- [ ] Supabase RLS 정책 검증
- [ ] 모바일 우선 (임차인 흐름은 모바일 카톡 진입 가정)
- [ ] 응답 시간 < 3초 (검색은 캐싱 적극 활용)
- [ ] 로컬 dev 검증 → push → Vercel 배포 확인까지

## 🎨 UX 가이드라인

- **모바일 우선**: 임차인 90%가 모바일 카톡에서 진입
- **shadcn/ui 컴포넌트만 사용**: 직접 디자인 X
- **부픽 브랜드 컬러** (Tailwind utility로 등록):
  - `bg-boopick-cream` (배경)
  - `text-boopick-navy` (헤딩)
  - `text-boopick-orange` (액센트·CTA)
  - `text-boopick-green` (성공/체크)
- **로딩 UI**: 검색 응답 1~3초. spinner + "AI가 매칭 중..."
- **임차인 톤**: 친근하고 따뜻하게 ("찾고 있는 자리, 한 줄로 말씀해보세요")
- **중개사 톤**: 정확하고 효율적 ("오늘 들어온 임차인 N명")

## 🎯 Claude Code Working Style (V2)

1. **새 기능 추가 전**: 항상 `supabase/migrations/`에 마이그레이션부터
2. **LLM 프롬프트**: 인라인 X, `prompts/*.md`로 분리
3. **타입**: Supabase 타입 자동 생성 추후 (`supabase gen types typescript`)
4. **테스트**: 핵심 비즈니스 로직(검색/태깅/매칭/inquiry 분배)은 테스트 권장
5. **커밋 메시지**: `[v2-step1] /find 페이지 구현` 형식
6. **단계 단위 커밋**: 각 Step의 sub-task별 commit + push + Vercel 배포 확인

## 🆘 막힐 때

- 한승수 대표 결정 필요 (BM/가격/데이터 출처): TODO 주석 + 알림
- 기술 결정 막힘: `docs/decisions/` 폴더에 ADR 작성
- 비대화형 자동 진행: 사용자에게 묻지 말고 합리적 가정으로 진행 후 보고

## 📝 V2 의사결정 기록

| 일자 | 결정 |
|---|---|
| 2026-05-06 | V1 → V2 가설 전환. 사용자 정의 뒤집기 (중개사 → 임차인). 41k 데이터 = 자체 정리 (A) — 학습 자료로 내부 사용 가능, 임차인 검색 결과 노출 X. |
| 2026-05-06 | 가격 4단 신규 (99k/299k/990k/성공보수). Pro가 메인 타겟. |
| 2026-05-06 | 카톡 챗봇/알림톡 다시 메인 경로로. Phase 2가 아니라 V2 Step 2~4의 핵심. |
