# lib/industries — 산업 관점 분석

PDF 리포트의 Pro 차별화 핵심: 매물별 "왜 이 산업에 좋은가" 분석.

## 구조

```
lib/industries/
├── index.ts            # INDUSTRIES 맵 + generateIndustryAnalysis() 오케스트레이터
├── marriage.ts         # 결혼정보회사 — V1 검증 완료
├── README.md           # 이 파일
└── (V2 예정) food.ts, bar.ts, clinic.ts, law.ts, academy.ts ...
```

데이터 소스: `assets/{industry_id}.json` — TS 모듈로 import.

## 핵심 타입

```ts
interface IndustryConfig {
  id: string;                  // 'marriage'
  display_name: string;        // '결혼정보회사'
  aliases: string[];           // ['결정사', '결혼중개업', ...]
  context_page_html: string;   // PDF 페이지 2 전체 HTML (5 criteria 카드)
  analysis_prompt: string;     // Claude system prompt with {LISTING_DATA}/{QUERY_DATA}
}

interface IndustryAnalysisResult {
  context_page: string;        // 페이지 2 HTML (PDF 직접 주입)
  per_listing: string[];       // 5개 매물 biz-analysis 박스 HTML
}
```

## 호출 흐름

```
api/generate-pdf
  └─ tier === 'pro' && industry 매칭
       └─ generateIndustryAnalysis(industry, listings, query)
            ├─ INDUSTRIES[industry] 조회 (id/display_name/alias 모두 매칭)
            ├─ Promise.all(5건 병렬 Claude 호출)
            │    └─ analyzeListing(l, q, cfg)
            │         ├─ analysis_prompt에 LISTING_DATA + QUERY_DATA JSON 치환
            │         ├─ + 출력 형식 wrapper 추가 ({headline, points})
            │         ├─ callClaudeJSON (sonnet-4-5, max 1500)
            │         └─ normalizeAnalysis: array/wrapper 모두 수용
            └─ renderPointsHTML(display_name, headline, points) → biz-analysis 박스
```

## 새 산업 추가 절차 (V2)

### 1. JSON 데이터 파일 생성

`assets/industry_{id}.json`:

```json
{
  "id": "food",
  "display_name": "음식점",
  "aliases": ["식당", "레스토랑", "외식업"],
  "context_page": {
    "title": "음식점 운영 관점 — 매물 평가 기준",
    "intro": "음식점은 일반 사무실과 달리 ...",
    "criteria": [
      { "label": "기준 1", "title": "유동인구 = 매출 직결",  "body": "..." },
      { "label": "기준 2", "title": "1층 유무 = 진입 장벽", "body": "..." },
      { "label": "기준 3", "title": "환기 + 가스 = 시공 가능성", "body": "..." },
      { "label": "기준 4", "title": "주차 + 발렛", "body": "..." },
      { "label": "기준 5", "title": "상권 시너지", "body": "..." }
    ]
  },
  "analysis_prompt": "...{LISTING_DATA}...{QUERY_DATA}..."
}
```

5 criteria 권장 (디자인 기준에 맞춤). 각 body는 80~150자.

### 2. TS 모듈 생성

`lib/industries/food.ts` — `marriage.ts`를 그대로 복사하고 import 경로만 변경:

```ts
import data from "../../assets/industry_food.json";
import { renderPointsHTML, escapeHtml, type IndustryConfig } from "./marriage";

function renderContextPageHTML(): string {
  // marriage.ts와 동일 로직 (criteria 카드 빌드)
}

export const FOOD_INDUSTRY: IndustryConfig = {
  id: data.id,
  display_name: data.display_name,
  aliases: data.aliases,
  context_page_html: renderContextPageHTML(),
  analysis_prompt: data.analysis_prompt,
};
```

→ 추후 리팩터: `marriage.ts`의 `renderContextPageHTML()`을 공통 helper로 빼서 재사용.

### 3. INDUSTRIES 맵 등록

`lib/industries/index.ts`:

```ts
import { FOOD_INDUSTRY } from "./food";

registerIndustry(FOOD_INDUSTRY);
SUPPORTED_INDUSTRIES.push("음식점");
```

### 4. UI 등록

`components/industry-selector.tsx`의 `INDUSTRIES` 배열에서 해당 항목 `available: true`로 변경.

### 5. 검증

- 5건 병렬 Claude 분석 30초 이내
- 4개 포인트 모두 매물 구체 정보 인용 (평수·층·주차 등)
- 마지막 포인트는 약점/보완 (⚠️)
- PDF 시각 검증 (page 2 + 매물별 박스)

## V2 후보 산업

| ID | 표시명 | 핵심 평가축 |
|----|------|----------|
| food | 음식점 | 유동인구·1층·환기·주차·상권 |
| bar | 술집/홀덤펍 | 심야영업·소음 격리·상권·접근성 |
| clinic | 병의원 | 환자 동선·실손24·주차·상층 (의원집적) |
| law | 법무법인 | 상담실·VIP 미팅·신뢰감·접근성 |
| academy | 학원 | 학부모 대기·면학환경·층고·소음 |
| beauty | 미용실/네일 | 1층·통창·환기·주차 |

각 산업 출시 시 v7 PDF 형식 케이스 1건으로 검증 후 등록.

## 디자인 시스템 연동

산업 분석 박스(`biz-analysis`)와 컨텍스트 페이지(`criteria-card`) CSS는
`lib/pdf-templates/proposal.html` 의 inline `<style>` 에 통합 정의.

새 산업 추가 시 CSS 변경 불필요 — 템플릿이 모든 산업에 공통 적용됨.

## 테스트 / 디버깅

```ts
import { _registerIndustryForTest } from "@/lib/industries";

// 테스트 도중 mock 산업 주입
_registerIndustryForTest({
  id: "test",
  display_name: "테스트",
  aliases: [],
  context_page_html: "<section>...</section>",
  analysis_prompt: "JSON: ...",
});
```

Claude 호출 비용이 부담되면 단위 테스트에선 `analyzeListing` mock 권장.
