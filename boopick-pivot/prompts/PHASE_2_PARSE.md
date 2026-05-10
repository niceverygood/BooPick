# Phase 2: 의뢰 조건 입력 + AI 파싱

> **목표**: 사용자가 자유 텍스트로 의뢰 조건 입력 → Claude가 구조화된 검색 조건으로 변환
> **소요 시간**: 1~2일
> **선행 조건**: Phase 1 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md 를 정독하고 시작해줘.

# Phase 2: 의뢰 조건 입력 + AI 파싱

## 핵심 시나리오

사용자가 자유 텍스트로 의뢰 조건을 입력:
"결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) /
사무실 140-200평 연층도 / 월관 최대 3천 / 직원 50명 /
구축X 20년 이내 / 입주 6-7월"

→ Claude API가 구조화된 JSON으로 파싱:
```json
{
  "industry": "결혼정보회사",
  "regions": ["삼성역", "선릉역", "선정릉역", "삼성동"],
  "exclude_regions": ["청담동"],
  "area_min_평": 140,
  "area_max_평": 200,
  "area_연층_허용": true,
  "rent_max_total_만원": 3000,
  "employee_count": 50,
  "max_age_year": 20,
  "move_in_month": "2026-06",
  "additional_notes": ["방문주차 잘 되는 곳", "상담실 15-20개 인테리어 가능"]
}
```

→ 사용자에게 파싱 결과 표시 + 수정 가능한 폼

## 작업 1: 조건 파싱 라이브러리 (lib/query-parser.ts)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ParsedQuery {
  industry?: string;                  // '결혼정보회사', '음식점' 등
  regions: string[];                  // ['삼성역', '선릉역']
  exclude_regions?: string[];         // ['청담동']
  area_min_평?: number;
  area_max_평?: number;
  area_연층_허용?: boolean;
  rent_max_total_만원?: number;       // 월세 + 관리비 합산
  rent_max_월세_만원?: number;        // 월세만
  deposit_max_억?: number;
  employee_count?: number;
  max_age_year?: number;              // 준공 N년 이내
  min_year?: number;                  // 준공 연도 이상
  move_in_month?: string;             // YYYY-MM
  parking_required?: boolean;
  additional_notes: string[];         // 기타 조건 (텍스트)
}

const PARSE_PROMPT = `당신은 한국 상업용 부동산 매물 의뢰 조건을 구조화된 JSON으로 파싱하는 전문가입니다.

다음 사용자 입력을 분석해 JSON으로 반환하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

## 파싱 규칙

1. **industry**: 명시된 업종을 그대로 사용 ("결혼정보회사", "음식점", "병원" 등). 없으면 null.
2. **regions**: 의뢰자가 원하는 지역. 역명·동명 모두 포함. 한국 지역명 정규화.
3. **exclude_regions**: 제외 지역 (예: "청담X" → ["청담동"])
4. **area**: 평 단위. ㎡로 입력되면 / 3.3058 변환. "140-200평" 같으면 min/max 둘 다 채움. "연층"·"2개층"·"3개층" 키워드 있으면 area_연층_허용=true.
5. **rent_max_total_만원**: "월관" = 월세+관리비 합. "월 3천" = 3000만. "월세 2천만" 같이 월세만 명시면 rent_max_월세_만원 사용.
6. **deposit_max_억**: "보증 3억" → 3.0
7. **max_age_year**: "20년 이내", "구축X" 같으면 20. "신축" → 5.
8. **move_in_month**: "6월", "6-7월" → 가장 빠른 시점 (YYYY-MM 형식). 연도 미명시 시 다음 6월.
9. **additional_notes**: 위에 들어가지 않은 모든 조건 (예: "방문주차 잘 되는 곳", "상담실 18개 가능")

## 입력
{INPUT}

## 출력
JSON만 반환:`;

export async function parseQuery(input: string): Promise<ParsedQuery> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: PARSE_PROMPT.replace('{INPUT}', input),
    }],
  });

  const text = (message.content[0] as any).text.trim();
  const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${cleaned}`);
  }
}
```

## 작업 2: API 엔드포인트 (app/api/parse-query/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseQuery } from '@/lib/query-parser';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  try {
    const parsed = await parseQuery(query);
    return NextResponse.json({ parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## 작업 3: 조건 입력 페이지 UI

app/(dashboard)/dashboard/search/page.tsx:

```
┌─────────────────────────────────────┐
│  새 검색                             │
├─────────────────────────────────────┤
│  데이터셋: [260504_40795건.xlsx ▼]   │
├─────────────────────────────────────┤
│  의뢰 조건 (자유롭게 입력하세요)       │
│  ┌─────────────────────────────────┐│
│  │ 결혼정보회사 / 삼성역 선릉역      ││
│  │ 선정릉역 / 사무실 140~200평 /    ││
│  │ 월관 최대 3천 / 직원 50명         ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  💡 카톡으로 받은 의뢰 메시지를       │
│     그대로 붙여넣어도 됩니다           │
│                                     │
│  [AI로 조건 분석하기 →]              │
└─────────────────────────────────────┘
```

**입력 시 도움말 예시 텍스트** (placeholder):
```
예) "결혼정보회사 / 삼성역 선릉역 선정릉역 / 사무실 140-200평 연층도 OK / 월관 최대 3천 / 직원 50명 / 구축 X (20년 이내) / 입주 6-7월"
```

## 작업 4: 파싱 결과 검토 컴포넌트 (components/parsed-conditions.tsx)

파싱 후 사용자에게 표시:
```
┌──────────────────────────────────────┐
│  ✅ AI가 분석한 조건                   │
│  잘못된 부분이 있으면 수정해주세요       │
├──────────────────────────────────────┤
│  🏢 산업군: 결혼정보회사 [수정]         │
│  📍 지역: 삼성역, 선릉역, 선정릉역, 삼성동│
│  🚫 제외 지역: 청담동                   │
│  📐 면적: 140 ~ 200평 (연층 OK)        │
│  💰 임대료: 월관 3,000만 이내           │
│  👥 직원: 50명 + 상담실 18개            │
│  🏗️ 준공: 20년 이내                    │
│  📅 입주: 2026년 6월                    │
│  📝 기타: 방문주차 잘 되는 곳            │
├──────────────────────────────────────┤
│  [매물 검색하기 →]                     │
└──────────────────────────────────────┘
```

각 항목 옆에 "[수정]" 버튼. 클릭 시 인라인 편집 가능 (input/select).

산업군 드롭다운 옵션 (V1):
- 결혼정보회사 ✅ (Pro 분석 가능)
- 음식점 (V2 예정)
- 술집·바 (V2 예정)
- 병의원 (V2 예정)
- 학원 (V2 예정)
- 일반 사무실 (베이직만 가능)

V1에서는 결혼정보회사만 Pro 분석 작동, 나머지는 *"준비 중"* 표시.

## 작업 5: 입력 컴포넌트 (components/query-input.tsx)

```tsx
'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function QueryInput({ onParsed }: { onParsed: (parsed: any) => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleParse() {
    setLoading(true);
    try {
      const res = await fetch('/api/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });
      const data = await res.json();
      onParsed(data.parsed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="예) 결혼정보회사 / 삼성역 선릉역 / 사무실 140-200평 / 월관 최대 3천 / 직원 50명 / 구축 X..."
        className="min-h-[150px]"
      />
      <Button
        onClick={handleParse}
        disabled={loading || input.length < 10}
        className="w-full"
      >
        {loading ? <><Loader2 className="mr-2 animate-spin" />AI가 분석 중...</> : 'AI로 조건 분석하기'}
      </Button>
    </div>
  );
}
```

## 작업 6: 모바일 최적화

부픽 사용자는 카톡으로 PDF 받는 모바일 사용자가 많음. 검색 페이지도 모바일에서 잘 보여야 함:
- Textarea 키보드 자동 enable
- 파싱 결과 카드 모바일에서 세로 정렬
- "수정" 버튼 터치 영역 최소 44pt
- 매물 검색 결과 미리보기는 카드 형태

## 검증 체크리스트

- [ ] 사용자가 자유 텍스트 입력 가능
- [ ] Claude API 호출 정상 (5초 이내 응답)
- [ ] 결정사 의뢰 조건 정확히 파싱:
  - 산업군 = "결혼정보회사" ✅
  - 지역 = ["삼성역", "선릉역", "선정릉역", "삼성동"]
  - 제외 = ["청담동"]
  - 면적 140-200평
  - 월관 3000만
- [ ] ㎡로 입력 시 자동 평 변환 ("463-661㎡" → "140-200평")
- [ ] 사용자가 파싱 결과 모든 항목 수정 가능
- [ ] "결정사" 같은 비표준 단어도 → "결혼정보회사" 로 표준화 (LLM)
- [ ] 결과를 sessionStorage 또는 URL 쿼리스트링에 보관해 다음 단계 전달

위 통과하면 Phase 3 진행 가능.

진행해줘.
```

---

## ✅ 완료 후 다음 단계

→ `Phase 3: 매물 검색 + 점수화`
