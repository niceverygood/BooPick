# BooPick (부픽) — Claude Code Memory

> 이 파일은 Claude Code가 매 세션마다 자동으로 읽습니다.
> 프로젝트의 모든 핵심 컨텍스트를 여기에 박아둡니다.

## 🎯 프로젝트 한 줄 정의

**공인중개사를 위한 AI 매물 매칭 + 공동중개 풀 SaaS.**
모바일 웹앱에서 손님 조건 한 줄 입력하면, 30초 안에 [내 매물 + 공유 풀]에서 AI가 매칭 매물 5개를 카드로 회신.

**Phase 1 (현재 6주 MVP)**: 자체 웹앱 (PWA) 단독으로 출시. **Phase 2 (베타 안정화 후)**: 카톡 챗봇·알림톡 연동.

## 👥 누가 만드나

- 회사: Bottle Inc. (주식회사 바틀)
- 대표: 한승수 (Han Seungsu)
- 위치: 판교 테크노밸리 스타트업 캠퍼스
- 핵심 베타 사용자: 강남권 1선 중개사무소 (NDA — 공개 문서에서 익명 처리)

## 🛠 기술 스택 (절대 바꾸지 말 것)

| 레이어 | 선택 | 비고 |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | TypeScript |
| Styling | **Tailwind CSS + shadcn/ui** | |
| DB | **Supabase Postgres + pgvector** | RLS로 멀티테넌시 |
| Auth | **Supabase Auth + 카카오 OAuth** | |
| LLM | **Claude Sonnet 4.6** | 모델 ID: `claude-sonnet-4-6` |
| STT | **OpenAI Whisper** | 음성메모 (F8) |
| Embedding | **OpenAI text-embedding-3-small** | 1536차원 |
| 알림 | **인앱 + 이메일** (Phase 1) → **카톡 알림톡** (Phase 2) | |
| 카톡 챗봇 | **(Phase 2)** 카카오 i 오픈빌더 | Phase 1에서는 웹앱이 메인 인터페이스 |
| 결제 | **카카오페이 정기결제** | 결제 채널만 사용 (가입·검색 흐름과 무관) |
| 호스팅 | **Vercel (FE) + Supabase** | |
| Job Queue | **Supabase Cron / pg_boss** | 매물 태깅 배치 |

## 📐 핵심 설계 원칙

1. **모바일 웹 우선 (PWA)**: Phase 1은 모바일 최적화 웹앱 단독. 검색·등록·관리·통계 모두 웹에서 처리. 카톡 챗봇/알림톡은 Phase 2.
2. **공동중개 풀 = 해자**: 매물 풀 자체가 차별화 자산. 옵트인 기반 공유.
3. **한국어 우선**: UI/프롬프트/메시지 모두 한국어. 영문은 보조.
4. **개인정보 보호**: 임대인 연락처 등 민감 정보는 절대 다른 중개사에게 노출 X.
5. **응답 속도 < 30초**: 자연어 검색 → 매물 5개 응답까지.
6. **외부 공유는 OG 카드 + 짧은 링크**: 매물을 손님께 보낼 때는 부픽 매물 카드 URL을 사장님이 본인 카톡으로 직접 발송 (부픽 시스템이 카톡 발송 X). 클릭 추적만.

## 📁 프로젝트 구조

```
boopick/
├── app/
│   ├── (dashboard)/         # 인증 후 화면
│   │   ├── listings/         # 매물 관리
│   │   ├── clients/          # 손님 조건 관리
│   │   ├── search/           # 웹 검색 UI
│   │   ├── analytics/        # 공동중개 활동 통계
│   │   └── settings/
│   ├── (marketing)/         # 공개 화면 (랜딩)
│   ├── api/
│   │   ├── chat/
│   │   │   ├── webhook/      # 카카오 챗봇 진입점 (Phase 2)
│   │   │   └── search/       # 검색 핸들러 (웹앱 + 향후 카톡 공용)
│   │   ├── listings/
│   │   │   ├── upload/       # CSV/엑셀 업로드
│   │   │   ├── tag/          # AI 자동 태깅
│   │   │   └── [id]/
│   │   ├── matching/
│   │   │   └── notify/       # 매칭 알림 (인앱/이메일 — Phase 1 / 알림톡 — Phase 2)
│   │   ├── voice/            # 음성메모 STT (F8)
│   │   ├── ad-copy/          # 광고문구 AI (F7)
│   │   └── kakao/
│   │       └── auth/
│   └── auth/
├── components/
│   ├── listing-card.tsx      # 매물 카드 (공동중개 표시 포함)
│   ├── search-bar.tsx
│   ├── voice-recorder.tsx    # F8
│   ├── share-card-preview.tsx # F9 매물 공유 카드 (OG 이미지 + 단축 URL)
│   └── ui/                   # shadcn/ui
├── lib/
│   ├── claude.ts             # Claude API 래퍼
│   ├── openai.ts             # OpenAI (Whisper + Embedding)
│   ├── supabase.ts           # Supabase 클라이언트
│   ├── kakao.ts              # 카카오 OAuth + (Phase 2) 알림톡/챗봇 래퍼
│   ├── search/
│   │   ├── parse-query.ts    # 자연어 → 구조화
│   │   ├── hybrid-search.ts  # 정형 + 임베딩 하이브리드
│   │   └── rank.ts           # 최종 랭킹
│   ├── tagging/
│   │   ├── extract-tags.ts   # 매물 자동 태깅
│   │   └── batch-tag.ts      # 대량 처리
│   ├── matching/
│   │   ├── match-engine.ts   # 새 매물 → 손님 조건 매칭
│   │   └── notify.ts         # 인앱·이메일 발송 (Phase 1) / 알림톡 (Phase 2)
│   └── billing/
│       └── kakao-pay.ts      # 카카오페이 정기결제
├── prompts/
│   ├── parse-query.md        # 쿼리 파싱 프롬프트
│   ├── tag-listing.md        # 매물 태깅 프롬프트
│   ├── rank-results.md       # 랭킹 + 매칭 근거
│   ├── ad-copy.md            # 광고문구 생성
│   └── voice-summary.md      # 음성메모 정리
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_indexes.sql
│   │   ├── 0003_rls_policies.sql
│   │   └── 0004_co_brokerage.sql
│   └── seed/
│       └── beta_partner_listings.sql # 베타 파트너 매물 임포트용
└── tests/
    ├── search.test.ts
    └── tagging.test.ts
```

## 💾 데이터 모델 핵심 테이블

상세 스키마는 `supabase/migrations/0001_initial_schema.sql` 참조.

핵심 엔티티:
- `agencies` — 중개사무소 (테넌트)
- `users` — 중개사
- `listings` — 매물 (`is_shared` 컬럼이 공동중개 풀 옵트인 키)
- `client_requests` — 손님 조건
- `match_notifications` — 자동매칭 알림 로그
- `co_brokerage_inquiries` — 공동중개 관심 트래킹
- `share_card_logs` — F9 매물 카드 발송
- `ad_copies` — F7 광고문구 이력
- `search_logs` — 분석용

## 🤖 LLM 사용 패턴

### Claude API
- **모델**: `claude-sonnet-4-6` (정확도 우선)
- **다운그레이드 옵션**: 단순 파싱은 `claude-haiku-4-5` 사용 가능 (비용 절감)
- **사용처**:
  1. 쿼리 파싱 (자연어 → 구조화 JSON)
  2. 매물 태깅 (설명 → 카테고리)
  3. 매칭 랭킹 + 근거 생성
  4. 광고문구 생성 (F7)
  5. 음성메모 정리 (F8)

### OpenAI API
- **임베딩**: `text-embedding-3-small` (1536차원)
- **STT**: `whisper-1`

### 호출 규칙
- 모든 LLM 호출은 `lib/claude.ts` / `lib/openai.ts` 래퍼 통해서만.
- 프롬프트는 `prompts/*.md` 파일로 분리.
- 토큰/비용 로그를 모든 호출에서 수집 (`search_logs.tokens_used`).

## 🔐 보안 & 멀티테넌시

- **Supabase RLS 필수**: 모든 테이블에 `agency_id` 기반 정책 적용.
- **공동중개 풀 예외**: `listings.is_shared = true`인 매물은 다른 agency도 read 가능. 단 `agency_id` (등록자)는 항상 보임.
- **임대인/임차인 PII**: `listings` 테이블의 연락처는 등록자만 read 가능. 다른 중개사는 마스킹.
- **API 키**: Supabase service role key는 서버 사이드만. anon key로 클라이언트 RLS 활용.

## 💰 가격 티어 (4단계)

```ts
type Plan = 'starter' | 'pro' | 'office' | 'enterprise';

const planLimits: Record<Plan, PlanLimits> = {
  starter:    { price: 49000,  listings: 50,    searches: 100,  clients: 5,  sharePool: false, autoMatch: false },
  pro:        { price: 149000, listings: -1,    searches: -1,   clients: 50, sharePool: true,  autoMatch: true  },
  office:     { price: 390000, listings: -1,    searches: -1,   clients: -1, sharePool: true,  autoMatch: true, seats: 7 },
  enterprise: { price: -1,     listings: -1,    searches: -1,   clients: -1, sharePool: true,  autoMatch: true, seats: -1 },
};
// -1 = 무제한
```

## 🚀 Phase 1 — 6주 MVP 로드맵 (자체 웹앱)

| Week | 핵심 작업 |
|---|---|
| 1 | Next.js + Supabase 셋업, DB 스키마, RLS, Auth (카카오 OAuth) |
| 2 | 매물 CRUD + CSV 일괄 업로드 + AI 자동 태깅 + 베타 파트너 데이터 임포트 |
| 3 | 자연어 검색 코어 (파싱 + 하이브리드 검색 + 공동중개 풀 통합) |
| 4 | 자동매칭 알림 (인앱 + 이메일) + 모바일 PWA 최적화 + 매물 공유 OG 카드 |
| 5 | 부가 기능 (광고문구 F7 / 음성메모 F8 / 매물 카드 공유 페이지 F9) |
| 6 | 카카오페이 정기결제 + 베타 출시 + QA |

## 🔮 Phase 2 — 카톡 연동 (베타 안정화 후)

| 작업 | 비고 |
|---|---|
| 카카오 알림톡 템플릿 승인 (자동매칭/공동중개/결제) | 카카오 검수 1주 이상 소요 — 일찍 신청 |
| 카카오 i 오픈빌더 챗봇 (`app/api/chat/webhook/`) | 손님 조건 카톡 입력 → 매물 카드 회신 |
| 알림 채널 전환 — 인앱·이메일 → 알림톡 (옵션) | 사용자 설정에서 선택 |

## ✅ Definition of Done (각 task)

- [ ] 코드 작성 + 타입 안전 (TypeScript strict)
- [ ] 테스트 작성 (해당하는 경우)
- [ ] 성공 케이스 + 실패 케이스 처리
- [ ] 한국어 에러 메시지 (사용자 노출되는 부분)
- [ ] Supabase RLS 정책 검증
- [ ] 로깅 (search_logs / 에러 로그)
- [ ] README/문서 업데이트 (해당하는 경우)

## 🎨 UX 가이드라인

- **모바일 우선 (PWA)**: 사용자는 모바일 브라우저로 진입(`boopick.kr` 즐겨찾기 또는 홈 화면 설치). 데스크톱도 지원하되 모바일 사이즈가 메인 — 손님 응대 중 카페·차 안에서도 검색 가능해야 함.
- **외부 카톡 발송 X**: 손님 카톡 발송은 사장님이 직접. 부픽은 매물 카드 URL을 클립보드 복사 또는 카톡 share intent로 넘김. (Phase 2에서 알림톡 자동 발송 추가)
- **shadcn/ui 컴포넌트만 사용**: 직접 디자인 X. shadcn 기본 → 필요시 커스텀.
- **부픽 브랜드 컬러**:
```css
  --boopick-navy: #1A2E4C;     /* 메인 - 신뢰 */
  --boopick-orange: #FF7849;    /* 액센트 - 활기 */
  --boopick-green: #10B981;     /* 성공/체크 */
  --boopick-cream: #FFF9F5;     /* 따뜻한 배경 */
```
- **로딩 UI**: 검색 응답이 30초 가까이 걸릴 수 있으니 명확한 진행 상태 표시.

## ⚠️ 절대 하지 말 것

1. ❌ 네이버부동산 / 다방 / 직방 매물 무단 크롤링 (법적 리스크)
2. ❌ 사용자 동의 없이 다른 중개사 매물을 공유 풀에 노출
3. ❌ 임대인/임차인 PII(연락처 등) 마스킹 없이 노출
4. ❌ Supabase service role key를 클라이언트 사이드에서 사용
5. ❌ 응답 시간 30초 초과 시 사용자에게 진행 상태 안 보여주기
6. ❌ Claude/OpenAI 호출에서 토큰/비용 로깅 누락

## 🎯 Claude Code Working Style

이 프로젝트에서 작업할 때:

1. **새 기능 추가 전**: 항상 `supabase/migrations/`에 마이그레이션부터 작성
2. **LLM 프롬프트**: 인라인 X. 무조건 `prompts/*.md`로 분리
3. **타입**: Supabase 타입 자동 생성 (`supabase gen types typescript`) 후 `lib/database.types.ts`에 저장
4. **테스트**: 핵심 비즈니스 로직(검색/태깅/매칭)은 테스트 필수
5. **커밋 메시지**: `[F1] 자연어 검색 파서 구현` 형식 (F1~F10 = MVP 기능 번호)
6. **작업 단위**: PR/커밋은 Week별 task 단위로. 한 번에 한 가지만.

## 🆘 막힐 때

- 한승수 대표 결정 필요: TODO 주석 + 알림
- 기술 결정 막힘: `docs/decisions/` 폴더에 ADR (Architecture Decision Record) 작성
