# BooPick (부픽) — Claude Code Memory · V3 (분석 SaaS)

> 이 파일은 Claude Code가 매 세션마다 자동으로 읽습니다.
> **V3 (2026-05-06~) — 매물 분석 SaaS로 피벗. V1·V2 가설 모두 폐기.**

## 🎯 프로젝트 한 줄 정의 (V3)

**부픽은 공인중개사가 매물 데이터셋(엑셀)을 업로드하면 AI가 조건에 맞는 자리를 분석해 업종별 추천 리포트(PDF)로 출력하는 SaaS다.**

핵심 가치 = **"매물 40,000건을 30초 안에 분석해 업종 맞춤 리포트로 받는다"**.

## 📜 V1 → V2 → V3 전환 (2026-05-06)

| 축 | V1 (폐기) | V2 (폐기) | V3 (현재) |
|---|---|---|---|
| 메인 사용자 | 중개사 (B2B 공동중개) | 임차인 (B2C 분배) | **공인중개사 (B2B 분석 도구)** |
| 핵심 가치 | 공동중개 풀 + 양타 | 임차인 acquisition + 카톡 분배 | **데이터셋 → 리포트 PDF** |
| 데이터 흐름 | 매물 등록·검색 | 임차인 검색 → 컨택 분배 | **xlsx 업로드 → AI 분석 → PDF** |
| 가격 | 49k/149k/390k | 99k/299k/990k + 성공보수 | **무료(월 3건) / Pro 49,000원** |
| 마이그레이션 | 0001~0007 | 0008~0011 | **0001_v2_schema (clean reset)** |
| 락인 | 약 | 임차인 풀 (강) | 약 (1회 리포트성) — Pro 가격 낮춤 |

**기존 V1·V2 코드 모두 폐기. DB 스키마 reset.** 살린 건:
- `lib/supabase/{server,client,middleware}.ts` — Supabase 클라이언트
- `lib/claude.ts`, `lib/openai.ts` — LLM 래퍼
- `components/ui/*` — shadcn 12개
- `public/img/*` — 부픽 아이콘 자산

## 👥 누가 만드나

- 회사: Bottle Inc. (주식회사 바틀)
- 대표: 한승수
- 위치: 판교 테크노밸리 스타트업 캠퍼스

## 🛠 기술 스택

| 레이어 | 선택 |
|---|---|
| Framework | Next.js 14 App Router + TypeScript strict |
| Styling | Tailwind v3 + shadcn 2.1.8 |
| DB | Supabase Postgres + RLS |
| Auth | Supabase Auth (이메일·비밀번호) |
| LLM | Claude Sonnet 4.6 (자연어 파싱) |
| 엑셀 | xlsx (sheetjs) |
| PDF | Puppeteer (headless Chrome) |
| QR | qrcode |
| 호스팅 | Vercel + Supabase |

## 📐 핵심 설계 원칙

1. **데이터셋 단위 격리**: 사용자별 datasets → listings 격리. RLS로 데이터 누수 차단.
2. **자연어 → 정형 → 분석**: 사용자가 평소 말투로 입력 → Claude로 정형 → 정형 필터 + 업종 가중치 점수.
3. **업종 특화**: 결혼식장·카페·학원·필라테스 등 업종별 가중치 별도. `lib/industries/*.ts`로 분리.
4. **Pro = 가성비**: 월 49,000원으로 진입장벽 낮춤. 기능 한계 → 사용량 한계로 차별화.
5. **PDF가 영업 자료**: 사장님이 임대인·잠재 임차인에게 "이 매물 좋아요" 영업 시 그대로 사용.

## 📁 프로젝트 구조 (V3)

```
boopick/
├── app/
│   ├── (marketing)/                    # 공개 (랜딩·가격)
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # / 랜딩
│   │   └── pricing/page.tsx            # /pricing
│   ├── (auth)/                         # 인증 (로그인·회원가입)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx              # /login
│   │   └── signup/page.tsx             # /signup
│   ├── (dashboard)/                    # 인증 후 화면
│   │   ├── layout.tsx                  # 사이드 네비
│   │   └── dashboard/
│   │       ├── page.tsx                # 홈 (데이터셋 + 리포트 목록)
│   │       ├── upload/page.tsx         # xlsx 업로드
│   │       ├── search/page.tsx         # 자연어 검색·분석
│   │       └── reports/
│   │           ├── page.tsx            # 리포트 목록
│   │           └── [id]/page.tsx       # 리포트 상세 + PDF 다운로드
│   ├── api/
│   │   ├── upload/route.ts             # POST: xlsx → datasets + listings
│   │   ├── parse-query/route.ts        # POST: 자연어 → 정형 (Claude)
│   │   ├── search/route.ts             # POST: 검색 + 스코어링
│   │   └── generate-pdf/route.ts       # POST: PDF 생성 + Storage 업로드 + reports row
│   ├── layout.tsx                      # 루트 레이아웃 (Inter 폰트, ko)
│   ├── globals.css                     # Tailwind + 부픽 컬러
│   └── sitemap.ts
│
├── components/
│   ├── ui/                             # shadcn (button, card, badge, ...)
│   ├── upload-dropzone.tsx             # xlsx 드래그&드롭
│   ├── query-input.tsx                 # 검색 입력 + 결과 통합
│   ├── parsed-conditions.tsx           # AI 파싱 결과 뱃지 표시
│   ├── results-table.tsx               # 매물 결과 테이블
│   └── industry-selector.tsx           # 업종 선택 chips
│
├── lib/
│   ├── supabase/{server,client,middleware,database.types}.ts
│   ├── claude.ts                       # Claude API 래퍼
│   ├── openai.ts                       # (현재 미사용 — V3에선 임베딩 X)
│   ├── excel-parser.ts                 # xlsx → ParsedListing[]
│   ├── query-parser.ts                 # 자연어 → ParsedCondition (Claude)
│   ├── scoring.ts                      # 매물별 score + reasons
│   ├── pdf-generator.ts                # Puppeteer로 HTML → PDF
│   ├── industries/
│   │   └── marriage.ts                 # 결혼식장 가중치
│   └── utils.ts                        # shadcn cn()
│
├── supabase/migrations/
│   └── 0001_v2_schema.sql               # profiles + datasets + listings + reports
│
├── docs/
│   └── (V1·V2 사용가이드 폐기)
│
└── public/img/                         # 부픽 아이콘 (유지)
```

## 💾 데이터 모델

`supabase/migrations/0001_v2_schema.sql` 참조.

| 테이블 | 역할 |
|---|---|
| `profiles` | 사용자 (auth.users 연결) — tier, reports_used_month |
| `datasets` | 사용자가 업로드한 매물 데이터셋 (xlsx 1건 = 1 dataset) |
| `listings` | 데이터셋 행 (지역·면적·금액·업종·설명 등) |
| `reports` | 분석 리포트 (query, parsed, selected_listings, pdf_url) |

RLS: 모든 테이블에 `auth.uid()` 기반 self 정책.

## 💰 가격

| 플랜 | 월 요금 | 핵심 |
|---|---|---|
| **Basic** | 무료 | 월 3건 / 데이터셋 1개 / 업종 4종 |
| **Pro** | 49,000원 | 무제한 / 데이터셋 무제한 / 업종 20종+ / 워터마크 X / QR 코드 |

베타 기간 모두 무료.

## 🤖 LLM 사용 패턴

| 용도 | 모델 | 위치 |
|---|---|---|
| 자연어 조건 → 정형 JSON | Sonnet 4.6 | `lib/query-parser.ts` |
| (Phase 2) 매물 추천 사유 생성 | Sonnet 4.6 | TBD |
| (Phase 2) 컬럼 자동 매핑 (오타·다른 이름 → 표준) | Haiku 4.5 | TBD |

## 🔐 보안 & 멀티테넌시

- **RLS 필수**: 모든 테이블에 `auth.uid() = user_id` 기반 정책
- **데이터셋 격리**: 사용자가 다른 사용자 매물·리포트 절대 못 봄
- **Storage**: 리포트 PDF는 `reports/{user_id}/{timestamp}.pdf` 경로 (사용자 폴더 격리)
- **service_role key**: 서버 사이드만

## ⚠️ 절대 하지 말 것

1. ❌ **다른 사용자 매물 노출** — RLS로 차단되지만 service_role 직접 사용 시 주의
2. ❌ **PDF에 임대인 PII (전화·이름) 포함** — 광고법·개인정보법
3. ❌ **광고법 위반** — PDF 하단에 "본 자료는 정보 분석 목적이며 매물번호·등록 중개사 정보는 별도 공식 채널 확인" 명시
4. ❌ **무단 매물 데이터 가공·재배포** — 사용자 본인 데이터셋만 처리

## 🚀 V3 로드맵

| Phase | 기간 | 핵심 |
|---|---|---|
| **Phase 1 (현재)** | 1주 | 셋업 + 마이그레이션 + 페이지 골격 + API 골격 |
| Phase 2 | 1주 | 결혼식장 외 업종 가중치 7종 + AI 추천 사유 생성 |
| Phase 3 | 1주 | PDF 디자인 고도화 (QR, 워터마크, 차트) + Storage 정책 |
| Phase 4 | 1주 | 컬럼 자동 매핑 (오타 보정) + 베타 사용자 5명 검증 |

## ✅ Definition of Done (각 Phase)

- [ ] 코드 작성 + 타입 안전 (TypeScript strict)
- [ ] 한국어 에러 메시지
- [ ] Supabase RLS 정책 검증
- [ ] 모바일 반응형 (대시보드는 데스크탑 우선이지만 깨지지 않게)
- [ ] 로컬 dev 검증 → push → Vercel 자동 배포 확인

## 🎨 UX 가이드라인

- **shadcn/ui 컴포넌트만 사용**
- **부픽 브랜드 컬러**:
  - `bg-boopick-cream` (배경)
  - `text-boopick-navy` (헤딩)
  - `text-boopick-orange` (액센트·CTA)
  - `text-boopick-green` (성공)
- **사장님 톤**: 정확하고 효율적 ("매물 40,000건을 30초 안에")

## 🎯 Claude Code Working Style (V3)

1. **새 기능 추가 전**: 마이그레이션부터 (필요 시 0002, 0003... 추가)
2. **LLM 프롬프트**: 인라인 X — 길어지면 `prompts/*.md`로 분리
3. **타입**: Supabase 타입 자동 생성 추후
4. **커밋 메시지**: `[v3-phase1] 마이그레이션 + 페이지 골격` 형식
5. **단계 단위 커밋**: 각 Phase의 sub-task별 commit + push

## 🆘 막힐 때

- 한승수 대표 결정 필요 (BM/가격): TODO 주석 + 알림
- 비대화형 자동 진행: 사용자에게 묻지 말고 합리적 가정으로 진행 후 보고

## 📝 V3 의사결정 기록

| 일자 | 결정 |
|---|---|
| 2026-05-06 | V1·V2 모두 폐기. 매물 분석 SaaS로 피벗. 사장님이 본인 매물 데이터셋 업로드 → AI 분석 → 리포트 PDF. |
| 2026-05-06 | DB 완전 reset. 0001~0011 마이그레이션 모두 삭제, 0001_v2_schema.sql만 유지. |
| 2026-05-06 | 가격 무료/49,000원 2단계. 진입장벽 낮춤. |
| 2026-05-06 | 카카오 OAuth/알림톡/SMS/PWA/funnel 트래킹 모두 제거. 단순 Supabase Auth (이메일/패스워드). |
