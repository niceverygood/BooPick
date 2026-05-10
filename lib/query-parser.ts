// 자연어 조건 → 정형 필터 (Claude)
//
// V2 분석 SaaS — 사용자 입력 예:
//   "강남에 결혼식장으로 30평 이상, 보증금 1억 이하, 즉시 입주"

import { callClaudeJSON } from "@/lib/claude";

const SYSTEM_PROMPT = `너는 부동산 매물 분석가다. 사용자의 한 줄 조건을 구조화 JSON으로 변환한다.

**출력은 JSON만. 다른 설명 텍스트 금지.**

스키마:
{
  "지역": "string | null",                  // "강남구", "신사동" 등
  "industry": "string | null",              // 업종 — 결혼식장/카페/학원/필라테스/식당/미용실/병원/사무실 등
  "공급_m2_min": "number | null",
  "공급_m2_max": "number | null",
  "전용_m2_min": "number | null",
  "전용_m2_max": "number | null",
  "공급_평_min": "number | null",
  "공급_평_max": "number | null",
  "보증금_min": "number | null",
  "보증금_max": "number | null",
  "월세_min": "number | null",
  "월세_max": "number | null",
  "층_min": "number | null",
  "층_max": "number | null",
  "조건": ["string"]                         // 즉시입주, 권리금없음, 신축 등
}

규칙:
- 평수 → 평 / m² 둘 다 입력 받음. 1평 = 3.3058m²
- "30평 이상" → 공급_평_min: 30
- "1억" → 100000000, "5천" → 50000000, "300만" → 3000000
- 명시 안 된 필드는 null 또는 빈 배열
- 모호하면 null. 잘못 추측하지 말 것.`;

export interface ParsedCondition {
  지역: string | null;
  industry: string | null;
  공급_m2_min: number | null;
  공급_m2_max: number | null;
  전용_m2_min: number | null;
  전용_m2_max: number | null;
  공급_평_min: number | null;
  공급_평_max: number | null;
  보증금_min: number | null;
  보증금_max: number | null;
  월세_min: number | null;
  월세_max: number | null;
  층_min: number | null;
  층_max: number | null;
  조건: string[];
}

export async function parseQuery(query: string): Promise<{
  parsed: ParsedCondition;
  tokens: { input: number; output: number };
}> {
  const result = await callClaudeJSON<Partial<ParsedCondition>>({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: query,
    maxTokens: 500,
    useHaiku: false,
  });
  return { parsed: normalize(result.data), tokens: result.tokens };
}

function normalize(raw: Partial<ParsedCondition>): ParsedCondition {
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const strOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  return {
    지역: strOrNull(raw.지역),
    industry: strOrNull(raw.industry),
    공급_m2_min: numOrNull(raw.공급_m2_min),
    공급_m2_max: numOrNull(raw.공급_m2_max),
    전용_m2_min: numOrNull(raw.전용_m2_min),
    전용_m2_max: numOrNull(raw.전용_m2_max),
    공급_평_min: numOrNull(raw.공급_평_min),
    공급_평_max: numOrNull(raw.공급_평_max),
    보증금_min: numOrNull(raw.보증금_min),
    보증금_max: numOrNull(raw.보증금_max),
    월세_min: numOrNull(raw.월세_min),
    월세_max: numOrNull(raw.월세_max),
    층_min: numOrNull(raw.층_min),
    층_max: numOrNull(raw.층_max),
    조건: Array.isArray(raw.조건)
      ? raw.조건.filter((x): x is string => typeof x === "string")
      : [],
  };
}
