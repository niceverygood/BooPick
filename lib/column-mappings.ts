// 부픽 V3 매물 엑셀 표준 컬럼 매핑
// boopick-pivot/assets/excel_column_mapping.json 기반.

export const STANDARD_COLUMNS = [
  "article_no",
  "지역",
  "공급_m2",
  "전용_m2",
  "해당층",
  "전체층",
  "보증금",
  "월세",
  "관리비",
  "현재업종",
  "추천업종",
  "간략설명",
  "설명",
  "주소",
  "사용승인일",
  "중개사무소명",
] as const;

export type StandardColumn = (typeof STANDARD_COLUMNS)[number];

export interface ColumnMapping {
  aliases: string[];
  type: "string" | "number" | "date";
  unit?: string;
  note?: string;
}

export const COLUMN_MAPPINGS: Record<StandardColumn, ColumnMapping> = {
  article_no: {
    aliases: ["매물번호", "매물 번호", "article_no", "no", "번호"],
    type: "string",
    note: "HYPERLINK 함수의 articleNo= 파라미터에서 추출",
  },
  지역: {
    aliases: ["지역", "동", "지역명", "동명"],
    type: "string",
  },
  공급_m2: {
    aliases: ["공급/계약/대지", "공급", "계약면적", "공급면적", "계약/공급"],
    type: "number",
    unit: "㎡",
  },
  전용_m2: {
    aliases: ["전용/연", "전용", "전용면적"],
    type: "number",
    unit: "㎡",
  },
  해당층: { aliases: ["해당층", "층"], type: "string" },
  전체층: { aliases: ["전체층", "총층", "건물층"], type: "string" },
  보증금: {
    aliases: ["전세금", "보증금", "전세"],
    type: "number",
    unit: "원",
  },
  월세: { aliases: ["월세", "임대료"], type: "number", unit: "원" },
  관리비: { aliases: ["관리비"], type: "number", unit: "원" },
  현재업종: { aliases: ["현재업종", "현재 업종"], type: "string" },
  추천업종: { aliases: ["추천업종", "추천 업종"], type: "string" },
  간략설명: { aliases: ["간략설명", "제목", "타이틀"], type: "string" },
  설명: { aliases: ["설명", "상세설명", "본문", "상세"], type: "string" },
  주소: { aliases: ["주소", "소재지", "위치"], type: "string" },
  사용승인일: {
    aliases: ["사용승인일", "준공일", "준공", "승인일"],
    type: "date",
  },
  중개사무소명: {
    aliases: ["중개사무소명", "부동산", "중개사", "부동산명"],
    type: "string",
  },
};

// 본문에서 정규식 추출
export const EXTRACTION_RULES = {
  관리비_from_설명: [
    /관리비\s*([\d,]+)\s*만/,
    /월\s*관리\s*([\d,]+)\s*만/,
    /월관\s*([\d,]+)\s*만/,
  ],
  주차_from_설명: [
    /자주식\s*(\d+)\s*대/,
    /기계식\s*(\d+)\s*대/,
    /주차\s*(\d+)\s*대/,
  ],
  지역_from_설명: [
    "삼성역",
    "삼성동",
    "선릉역",
    "선정릉역",
    "역삼역",
    "역삼동",
    "강남역",
    "청담동",
    "청담역",
    "논현동",
    "논현역",
    "신사동",
    "신사역",
    "압구정역",
    "압구정동",
    "도산공원",
    "가로수길",
    "잠실역",
    "잠실동",
    "삼전동",
    "방배동",
    "양재역",
    "양재동",
    "서초동",
    "교대역",
    "강남구청역",
    "사평역",
    "고속터미널",
  ],
};

// 헤더 → 표준 컬럼 자동 매핑
export function autoMapHeaders(
  headers: string[]
): Record<string, StandardColumn | null> {
  const result: Record<string, StandardColumn | null> = {};
  for (const header of headers) {
    if (!header) continue;
    const trimmed = header.trim();
    let mapped: StandardColumn | null = null;
    // 정확 일치 우선
    for (const std of STANDARD_COLUMNS) {
      if (COLUMN_MAPPINGS[std].aliases.includes(trimmed)) {
        mapped = std;
        break;
      }
    }
    // 부분 일치 (정확 일치 실패 시)
    if (!mapped) {
      for (const std of STANDARD_COLUMNS) {
        for (const alias of COLUMN_MAPPINGS[std].aliases) {
          if (
            trimmed.length >= 2 &&
            (alias.includes(trimmed) || trimmed.includes(alias))
          ) {
            mapped = std;
            break;
          }
        }
        if (mapped) break;
      }
    }
    result[header] = mapped;
  }
  return result;
}
