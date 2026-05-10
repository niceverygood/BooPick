// 부픽 V3 — 의뢰 조건 자연어 파싱 (Claude Sonnet 4.5)
//
// 핵심: 사장님이 카톡으로 받은 의뢰 메시지를 풍부한 구조 JSON으로 변환.
//
// 예: "결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) / 사무실 140-200평 연층도 /
//      월관 최대 3천 / 직원 50명 / 구축X 20년 이내 / 입주 6-7월"

import { callClaudeJSON } from "@/lib/claude";
import type { ParsedQuery as _ParsedQuery } from "@/lib/parsed-query-types";

// re-export for backwards compat (서버 코드용)
export { EMPTY_PARSED } from "@/lib/parsed-query-types";
export type { ParsedQuery } from "@/lib/parsed-query-types";

const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `너는 한국 부동산 의뢰 조건 파서다. 공인중개사 사장님이 카톡으로 받은 의뢰 메시지를 구조화 JSON으로 변환한다.

**출력은 JSON만. 다른 설명 텍스트, 마크다운 fence 일절 포함 금지.**

스키마:
{
  "industry": "string | null",                  // 명시 업종. 비표준어 표준화 ("결정사" → "결혼정보회사")
  "regions": ["string"],                        // 한국 지역명. "삼성역", "선릉역", "삼성동" 등 그대로
  "exclude_regions": ["string"],                // 제외 지역. "청담X" → ["청담동"]
  "area_min_평": "number | null",
  "area_max_평": "number | null",
  "area_연층_허용": "boolean",                  // "연층"·"2개층"·"3개층" 키워드면 true
  "rent_max_total_만원": "number | null",       // "월관" = 월세+관리비 합 (만원 단위)
  "rent_max_월세_만원": "number | null",        // 월세만 명시된 경우
  "deposit_max_억": "number | null",            // 보증금 (억 단위)
  "employee_count": "number | null",
  "max_age_year": "number | null",              // "20년 이내", "구축X" → 20
  "min_year": "number | null",                  // "신축", "2020년 이후" → 2020
  "move_in_month": "string | null",             // "YYYY-MM" 형식. "6월" → 다가오는 6월
  "parking_required": "boolean",
  "additional_notes": ["string"]                // 위에 안 들어간 모든 조건
}

규칙:
1. **industry**: "결정사", "결정", "결혼정보" → "결혼정보회사" / "음식점", "식당" / "병의원", "의원" 등 표준화.
2. **regions**: 한국식 지역명 그대로. "삼성동", "선릉역", "강남구" 등.
3. **exclude_regions**: "청담X", "청담제외" → ["청담동"]. "역삼X" → ["역삼동"].
4. **area**: 평 단위. ㎡ 입력 시 ÷ 3.3058 변환 (예: "463-661㎡" → min:140, max:200).
   "연층"·"2개층"·"3개층"·"여러층" 키워드 → area_연층_허용 = true.
5. **rent_max_total_만원**: "월관" / "월 관리비 포함" / "관리비 포함" → 월세+관리비 합. "월 3천" / "월 3000" / "월3000만" → 3000.
6. **deposit_max_억**: "보증금 1억" → 1, "보증금 5억 이하" → 5.
7. **max_age_year**: "20년 이내" / "구축X" → 20. "30년 이내" → 30.
8. **min_year**: "신축" → 현재년-5, "2020년 이후" → 2020.
9. **move_in_month**: "6월" → "2026-06" (오늘이 5월이면). "6-7월" → 빠른 쪽 "2026-06". 명시 안 되면 null.
10. **parking_required**: "주차 필수", "방문주차" → true.
11. **additional_notes**: 위에 안 들어간 모든 부가 조건. "상담실 15-20개", "OA존 별도" 등.
12. **모호하거나 명시 안 됨**: null 또는 빈 배열. 추측 금지.

예시 입력 1:
"결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) / 사무실 140-200평 연층도 / 월관 최대 3천 / 직원 50명 / 구축X 20년 이내 / 입주 6-7월 / 방문주차 잘되는 곳 / 상담실 15-20개"

예시 출력 1:
{
  "industry": "결혼정보회사",
  "regions": ["삼성역", "선릉역", "선정릉역", "삼성동"],
  "exclude_regions": ["청담동"],
  "area_min_평": 140,
  "area_max_평": 200,
  "area_연층_허용": true,
  "rent_max_total_만원": 3000,
  "rent_max_월세_만원": null,
  "deposit_max_억": null,
  "employee_count": 50,
  "max_age_year": 20,
  "min_year": null,
  "move_in_month": "2026-06",
  "parking_required": true,
  "additional_notes": ["상담실 15-20개"]
}

예시 입력 2:
"강남에 카페 25평쯤 보증금 5천 월세 300 즉시입주"

예시 출력 2:
{
  "industry": "카페",
  "regions": ["강남"],
  "exclude_regions": [],
  "area_min_평": 22,
  "area_max_평": 28,
  "area_연층_허용": false,
  "rent_max_total_만원": null,
  "rent_max_월세_만원": 300,
  "deposit_max_억": null,
  "employee_count": null,
  "max_age_year": null,
  "min_year": null,
  "move_in_month": null,
  "parking_required": false,
  "additional_notes": ["즉시입주", "보증금 5천"]
}`;

export interface ParseQueryResult {
  parsed: _ParsedQuery;
  tokens: { input: number; output: number };
}

export async function parseQuery(query: string): Promise<ParseQueryResult> {
  const result = await callClaudeJSON<Partial<_ParsedQuery>>({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: query,
    maxTokens: 1024,
    modelOverride: MODEL,
  });
  return { parsed: normalize(result.data), tokens: result.tokens };
}

function normalize(raw: Partial<_ParsedQuery>): _ParsedQuery {
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const strOrNull = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };
  const strArr = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  };

  return {
    industry: strOrNull(raw.industry),
    regions: strArr(raw.regions),
    exclude_regions: strArr(raw.exclude_regions),
    area_min_평: numOrNull(raw.area_min_평),
    area_max_평: numOrNull(raw.area_max_평),
    area_연층_허용: raw.area_연층_허용 === true,
    rent_max_total_만원: numOrNull(raw.rent_max_total_만원),
    rent_max_월세_만원: numOrNull(raw.rent_max_월세_만원),
    deposit_max_억: numOrNull(raw.deposit_max_억),
    employee_count: numOrNull(raw.employee_count),
    max_age_year: numOrNull(raw.max_age_year),
    min_year: numOrNull(raw.min_year),
    move_in_month: strOrNull(raw.move_in_month),
    parking_required: raw.parking_required === true,
    additional_notes: strArr(raw.additional_notes),
  };
}
