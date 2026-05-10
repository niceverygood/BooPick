# Phase 5: 산업 관점 분석 (Pro 티어 핵심 차별화)

> **목표**: 매물별로 "왜 이 산업(예: 결혼정보회사)에 좋은가" 자동 분석 + PDF 통합
> **소요 시간**: 2일
> **선행 조건**: Phase 1~4 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md @assets/industry_marriage.json 두 파일을 정독해줘.

# Phase 5: 산업 관점 분석 (Pro 핵심 기능)

## 핵심 시나리오

베이직 사용자: 매물 정보만 표시
Pro 사용자: 매물별로 "왜 이 산업에 좋은가" 4가지 포인트 자동 분석

V1에서는 결혼정보회사 1개만 지원. V2부터 음식점·병원 등 점진 추가.

## 작업 1: 산업 메타데이터 (lib/industries/marriage.ts)

```typescript
export const MARRIAGE_INDUSTRY = {
  id: 'marriage',
  display_name: '결혼정보회사',
  aliases: ['결정사', '결혼중개업', '매칭'],

  // PDF에 들어갈 운영 특성 페이지 (정적 컨텐츠)
  context_page_html: `
    <div class="page biz-context-page">
      <div class="page-header">
        <h2>결혼정보회사 운영 관점 — 매물 평가 기준</h2>
        <div class="num">01 / 08</div>
      </div>
      <div class="biz-context-intro">
        결혼정보회사는 일반 사무실과 운영 특성이 크게 다릅니다.
        같은 면적·같은 임대료여도 <strong>회원 동선·프라이버시·주차·이미지</strong>
        측면에서 매물 적합도 차이가 큽니다. 본 자료는 결혼정보회사 운영 핵심
        5가지 기준을 바탕으로 매물별 적합도를 평가했습니다.
      </div>

      <div class="biz-context-card">
        <h3><span class="label">기준 1</span>회원 동선 = 비즈니스의 핵심</h3>
        <p>일반 사무실은 동선 1개면 충분하지만, 결혼정보회사는
        <strong>직원·회원(여)·회원(남)·매니저·외부 미팅 등 6개 동선이 분리</strong>되어야 합니다.
        회원이 같은 시간대 다른 회원과 마주치면 안 됩니다.</p>
      </div>

      <div class="biz-context-card">
        <h3><span class="label">기준 2</span>회원 프로필 = 절대 기밀</h3>
        <p>VIP 회원은 평균 연봉 1억 이상의 전문직·임원·자산가가 다수입니다.
        <strong>상담실 방음·시선 차단·다른 상담실과 분리된 입출구</strong>가 필수입니다.</p>
      </div>

      <div class="biz-context-card">
        <h3><span class="label">기준 3</span>주차 = 평일 저녁 동시 7~10대</h3>
        <p>피크 타임에 회원 6~8명 동시 방문 + 매니저·직원 차량 =
        <strong>최소 자주식 7~10대 빌딩 내 수용 필요</strong>합니다.</p>
      </div>

      <div class="biz-context-card">
        <h3><span class="label">기준 4</span>인테리어 = 첫 30초 신뢰의 실체</h3>
        <p>월 회비 300~500만원 비즈니스에서 회원이 \"신뢰할 만한 회사인가?\"
        판단하는 시간은 <strong>30초</strong>입니다.</p>
      </div>

      <div class="biz-context-card">
        <h3><span class="label">기준 5</span>입지 = 회원 평균 자산 시그널</h3>
        <p>강남 중심부 입지는 \"여기 다니는 회원 = 강남 들어올 수 있는 사람들\"이라는
        무언의 시그널이 됩니다.</p>
      </div>
    </div>
  `,

  // Claude API 프롬프트 (매물별 분석 생성)
  analysis_prompt: `당신은 결혼정보회사 사옥 입지 컨설턴트입니다.
부동산 사장님이 의뢰인(결혼정보회사 대표)에게 보낼 매물 제안서에 들어갈
"이 매물이 결혼정보회사 운영에 왜 좋은가" 분석을 작성하세요.

## 평가 기준 (5가지)
1. 회원 동선 분리: 통사옥 > 단독층 > 일반층 (회원이 다른 회사 직원과 안 마주치는가)
2. 회원 프라이버시: 빌딩 진입~상담실까지 노출 위험
3. 주차 (회원 동시 방문 7~10대 수용 필요)
4. 신축급 인테리어 (첫 30초 신뢰)
5. 입지 (강남 중심부 시그널)

## 출력 형식
JSON 배열, 4개의 분석 포인트:
[
  {
    "icon": "🏛️",  // 이모지 1개
    "title": "통사옥 = 결정사 단독 빌딩",  // 굵은 한 줄
    "description": "100~150자의 구체적 설명. 회원 입장에서 어떤 의미인지 풀어 설명. 매물의 구체 정보(평수·주차 대수·층 등)를 인용해 신뢰감."
  },
  ...
]

마지막 포인트는 약점이나 보완 사항 (있으면 ⚠️ 이모지 사용).
포인트가 4개여야 하며, 모두 결혼정보회사 운영 관점과 직접 연관되어야 합니다.
JSON만 출력. 다른 텍스트 X.

## 매물 정보
{LISTING_DATA}

## 의뢰 조건
{QUERY_DATA}
`,
};
```

## 작업 2: 산업 분석 생성기 (lib/industries/index.ts)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { MARRIAGE_INDUSTRY } from './marriage';
import { ScoredListing } from '@/lib/scoring';
import { ParsedQuery } from '@/lib/query-parser';

const INDUSTRIES: Record<string, typeof MARRIAGE_INDUSTRY> = {
  '결혼정보회사': MARRIAGE_INDUSTRY,
  '결정사': MARRIAGE_INDUSTRY,
  // V2: 음식점, 병원 추가
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface AnalysisPoint {
  icon: string;
  title: string;
  description: string;
}

export interface IndustryAnalysisResult {
  context_page: string;
  per_listing: string[];  // 5개 매물 각각의 HTML
}

export async function generateIndustryAnalysis(
  industry: string,
  listings: ScoredListing[],
  query: ParsedQuery
): Promise<IndustryAnalysisResult> {
  const config = INDUSTRIES[industry];
  if (!config) {
    return {
      context_page: '',
      per_listing: listings.map(() => ''),
    };
  }

  // 5개 매물 병렬 분석
  const perListing = await Promise.all(
    listings.map(async (l, i) => {
      const points = await analyzeListing(l, query, config);
      return renderPointsHTML(points);
    })
  );

  return {
    context_page: config.context_page_html,
    per_listing: perListing,
  };
}

async function analyzeListing(
  listing: ScoredListing,
  query: ParsedQuery,
  config: typeof MARRIAGE_INDUSTRY
): Promise<AnalysisPoint[]> {
  const listingData = {
    면적_평: Math.round(listing.공급_평),
    위치: listing.지역,
    층: `${listing.해당층}/${listing.전체층}층`,
    월세_만: Math.round(listing.월세 / 10000),
    준공: listing.사용승인일?.slice(0, 7),
    간략설명: listing.간략설명,
    설명_요약: listing.설명?.slice(0, 500),
  };

  const prompt = config.analysis_prompt
    .replace('{LISTING_DATA}', JSON.stringify(listingData, null, 2))
    .replace('{QUERY_DATA}', JSON.stringify(query, null, 2));

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as any).text.trim();
  const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

function renderPointsHTML(points: AnalysisPoint[]): string {
  if (points.length === 0) return '';

  const items = points.map(p => `
    <div class="biz-point">
      <div class="biz-icon">${p.icon}</div>
      <div class="biz-content">
        <div class="biz-title">${escapeHtml(p.title)}</div>
        <div class="biz-desc">${escapeHtml(p.description)}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="biz-analysis">
      <div class="biz-analysis-header">💍 결혼정보회사 운영 관점 분석</div>
      ${items}
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}
```

## 작업 3: PDF 템플릿 업데이트

`lib/pdf-templates/proposal.html` 의 산업 분석 박스 placeholder 위치 확인:

```html
<!-- 매물 1 페이지 -->
<div class="page">
  <!-- listing-page-header -->
  ...

  <!-- NAVER PROPERTY ID + QR -->
  <table>...</table>

  <!-- info-grid (면적/위치/준공 등) -->
  <table class="info-grid">...</table>

  <!-- 결혼정보회사 운영 관점 분석 (Pro만) -->
  {{LISTING_1_BIZ_ANALYSIS}}
  <!-- ↑ Phase 5에서 채움 -->

  <!-- checklist -->
  <div class="checklist">...</div>

  <!-- agency-info -->
</div>
```

CSS는 이미 v7 HTML에 정의되어 있음 (`.biz-analysis`, `.biz-point`, `.biz-icon`, `.biz-content`).

## 작업 4: 산업 선택 UI (components/industry-selector.tsx)

Phase 2 파싱 결과 검토 단계에서 산업군 선택 강화:

```tsx
'use client';

import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const INDUSTRIES_V1 = [
  { value: '결혼정보회사', label: '💍 결혼정보회사', supported: true },
  { value: '음식점', label: '🍽️ 음식점', supported: false },
  { value: '술집', label: '🍻 술집·바', supported: false },
  { value: '병원', label: '🏥 병의원', supported: false },
  { value: '학원', label: '📚 학원', supported: false },
  { value: '일반', label: '🏢 일반 사무실', supported: true, basicOnly: true },
];

export function IndustrySelector({
  value,
  onChange,
  userTier,
}: {
  value: string;
  onChange: (v: string) => void;
  userTier: 'basic' | 'pro';
}) {
  return (
    <div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="산업군 선택" />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRIES_V1.map(i => (
            <SelectItem
              key={i.value}
              value={i.value}
              disabled={!i.supported || (i.value !== '일반' && userTier === 'basic')}
            >
              {i.label}
              {!i.supported && <Badge variant="secondary" className="ml-2">준비중</Badge>}
              {i.value !== '일반' && userTier === 'basic' && (
                <Badge variant="outline" className="ml-2">Pro 전용</Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {userTier === 'basic' && value !== '일반' && (
        <p className="text-sm text-amber-700 mt-2">
          ⓘ 산업 관점 분석은 Pro 티어부터 이용 가능합니다. 베이직은 일반 매물 리스트로 생성됩니다.
        </p>
      )}
    </div>
  );
}
```

## 작업 5: V2 확장 가이드 (lib/industries/README.md)

새 산업 추가 시 절차:

```
1. lib/industries/{industry-id}.ts 새 파일 생성
2. context_page_html: 5가지 평가 기준 (해당 산업 특화)
3. analysis_prompt: 매물별 4개 포인트 생성 프롬프트
4. lib/industries/index.ts 의 INDUSTRIES 객체에 추가
5. components/industry-selector.tsx 의 INDUSTRIES_V1 에 supported: true
```

V2에서 추가 예정 산업:
- `food.ts` (음식점) — 유동인구·1층 노출·환기 시설
- `bar.ts` (술집·홀덤펍) — 심야 영업·소음 분쟁·상권 분위기
- `clinic.ts` (병의원) — 환자 동선·실손24·접수 동선
- `law.ts` (법무법인) — 상담실·서류 보관·VIP 미팅
- `academy.ts` (학원) — 학부모 대기·면학 환경

각 산업 도메인 전문가의 인사이트 1시간 인터뷰 후 작성 권장.

## 작업 6: 분석 결과 미리보기 (선택)

PDF 생성 전에 산업 분석 결과를 검색 결과 페이지에서 미리 보여주기 (선택):

```
매물 3번 (151평 통사옥 + 주차 11대)
🅿️ 자주식 11대 = 5건 중 주차 1위
   회원 동시 방문 7~10대 + 직원 차량 2~3대 = 빌딩 내 완전 수용 가능...
🏛️ 통사옥 = 결정사 본관 이미지
   지하1층~지상5층 단독 사용으로...
🏫 학원 라인 위치 = 칸막이 인테리어 적합
   ...
⚠️ S급 인테리어 = 재시공 협상 필요
   ...
```

이러면 사용자가 PDF 생성 전에 분석 품질 확인 가능. 마음에 안 들면 "다시 분석" 버튼으로 재생성.

## 검증 체크리스트

- [ ] 결혼정보회사 분석 정확도:
  - 매물 1번 (191평 신축 통사옥): "이미지 메이킹" 헤드라인 + 통사옥·신축·층별 분리·주차 보강 4개 포인트
  - 매물 2번 (148평 자주식 9대): "운영 안정성" + 자주식·2층·테라스·인테리어 4개 포인트
  - 매물 3번 (151평 통사옥 + 11대): "주차+통사옥 운영 리스크 최소화" 4개 포인트
- [ ] 매물 5건 병렬 분석 30초 이내
- [ ] 4개 포인트 모두 매물 구체 정보 (평수·주차·층 등) 인용
- [ ] 마지막 포인트는 약점/보완 사항 (⚠️)
- [ ] 베이직 티어는 분석 박스 보이지 않음
- [ ] 결혼정보회사 외 산업 선택 시 "준비중" 표시
- [ ] 일반 사무실 선택은 베이직도 가능 (분석은 없음)

위 통과하면 Phase 6 진행 가능.

진행해줘.
```

---

## ✅ 완료 후 다음 단계

→ `Phase 6: 인증 + 티어 시스템`
