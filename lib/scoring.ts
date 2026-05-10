// V3 Phase 3 — 매물 적합도 0-100 점수화
//
// 6개 차원 합산 (총 100점):
//   면적   30 — 의뢰 면적 정확 부합 / 연층 허용 시 ±30%
//   임대료 20 — 월세+관리비 합 vs rent_max
//   연식   20 — 사용승인일 기준 (신축 5년 이내 만점)
//   주차   15 — "자주식 N대" 본문 추출
//   업종   10 — 업종 키워드 매칭
//   기타    5 — 통사옥/통임대/렌트프리 등 보너스

import type { ParsedQuery } from "./parsed-query-types";

export interface ListingRow {
  id: number;
  article_no?: string | null;
  dataset_id?: string;
  지역: string | null;
  공급_m2: number | null;
  전용_m2: number | null;
  공급_평: number | null;
  전용_평: number | null;
  해당층: string | null;
  전체층: string | null;
  보증금: number | null;
  월세: number | null;
  관리비: number | null;
  현재업종: string | null;
  추천업종: string | null;
  간략설명: string | null;
  설명: string | null;
  주소: string | null;
  사용승인일: string | null;
  중개사무소명?: string | null;
}

export type ScoreLevel = "⭐" | "✅" | "△" | "✕";

export interface DimensionScore {
  score: number;
  max: number;
  reason: string;
  level: ScoreLevel;
}

export interface ScoreBreakdown {
  면적: DimensionScore;
  임대료: DimensionScore;
  연식: DimensionScore;
  주차: DimensionScore;
  업종: DimensionScore;
  기타: DimensionScore;
}

export interface ScoredListing extends ListingRow {
  score: number;            // 0-100
  breakdown: ScoreBreakdown;
  reasons: string[];        // PDF·legacy 호환 (breakdown.reason 모음)
  parking_count: number | null;
}

// IndustryWeights는 더 이상 사용 안 함. 대신 차원 점수 + 업종 키워드.
// (Phase 2 호환을 위해 빈 export 유지)
export interface IndustryWeights {
  area: number;
  floor: number;
  rent: number;
  deposit: number;
  age: number;
  industry_match: number;
  region: number;
  parking: number;
}

// 업종별 키워드 (현재업종 / 추천업종 / 설명 / 간략설명 에서 매칭)
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  결혼정보회사: ["상담", "룸", "폰부스", "병원", "의원", "학원", "사무실", "오피스", "OA"],
  결혼식장: ["웨딩", "예식", "행사", "연회", "리셉션"],
  사무실: ["사무실", "오피스", "OA", "임대"],
  카페: ["카페", "커피", "베이커리", "디저트"],
  학원: ["학원", "교육", "스터디", "교습", "과외"],
  필라테스: ["필라테스", "요가", "운동", "스튜디오", "헬스"],
  식당: ["식당", "음식점", "한식", "중식", "일식", "양식"],
  미용실: ["미용", "뷰티", "헤어", "네일", "에스테틱"],
  병원: ["병원", "의원", "진료", "한의원", "치과", "성형"],
};

// 보너스 키워드 (한 개라도 매칭 시 +5)
const BONUS_KEYWORDS = [
  "통사옥",
  "통임대",
  "단독사옥",
  "단독건물",
  "무권리",
  "렌트프리",
  "rent free",
];

const MAN_TO_KRW = 10_000;
const EOK_TO_KRW = 100_000_000;

// ============================================================
// Public: scoreListing / rankListings

export function scoreListing(
  listing: ListingRow,
  query: ParsedQuery,
  industry: string | null
): ScoredListing {
  const desc = combineText(listing);
  const parking_count = extractParkingCount(desc);

  const breakdown: ScoreBreakdown = {
    면적: scoreArea(listing, query),
    임대료: scoreRent(listing, query),
    연식: scoreAge(listing, query),
    주차: scoreParking(parking_count, query),
    업종: scoreIndustry(listing, industry, desc),
    기타: scoreBonus(desc),
  };

  // 합계 (소수점 절삭)
  const total =
    Math.round(
      breakdown.면적.score +
        breakdown.임대료.score +
        breakdown.연식.score +
        breakdown.주차.score +
        breakdown.업종.score +
        breakdown.기타.score
    );

  const reasons = (Object.values(breakdown) as DimensionScore[])
    .filter((d) => d.score > 0)
    .map((d) => d.reason);

  return {
    ...listing,
    score: total,
    breakdown,
    reasons,
    parking_count,
  };
}

export function rankListings(
  listings: ListingRow[],
  query: ParsedQuery,
  industry: string | null,
  topN = 5
): ScoredListing[] {
  return listings
    .map((l) => scoreListing(l, query, industry))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

// ============================================================
// 차원별 점수 함수

function scoreArea(l: ListingRow, q: ParsedQuery): DimensionScore {
  const max = 30;
  const 평 = l.공급_평;
  if (평 == null) {
    return { score: 0, max, reason: "면적 정보 없음", level: "✕" };
  }
  const min = q.area_min_평;
  const maxQ = q.area_max_평;

  if (min == null && maxQ == null) {
    return { score: 15, max, reason: `${평.toFixed(1)}평 (조건 없음)`, level: "△" };
  }

  const inRange = (min == null || 평 >= min) && (maxQ == null || 평 <= maxQ);
  if (inRange) {
    return {
      score: 30,
      max,
      reason: `${평.toFixed(1)}평 (의뢰 ${min ?? "?"}-${maxQ ?? "?"}평 정확)`,
      level: "⭐",
    };
  }

  // 경계 ±10%
  const closeMin = min != null ? 평 >= min * 0.9 : true;
  const closeMax = maxQ != null ? 평 <= maxQ * 1.1 : true;
  if (closeMin && closeMax) {
    return {
      score: 25,
      max,
      reason: `${평.toFixed(1)}평 (경계 부근)`,
      level: "✅",
    };
  }

  // 연층 허용 + ±30%
  if (q.area_연층_허용) {
    const okMin = min != null ? 평 >= min * 0.7 : true;
    const okMax = maxQ != null ? 평 <= maxQ * 1.3 : true;
    if (okMin && okMax) {
      return {
        score: 15,
        max,
        reason: `${평.toFixed(1)}평 (연층 허용 범위)`,
        level: "△",
      };
    }
  }

  return {
    score: 0,
    max,
    reason: `${평.toFixed(1)}평 (조건 벗어남)`,
    level: "✕",
  };
}

function scoreRent(l: ListingRow, q: ParsedQuery): DimensionScore {
  const max = 20;
  const monthly = (l.월세 ?? 0) + (l.관리비 ?? 0);

  // 월관 합 max 우선, 없으면 월세 단독 max
  const maxKrw =
    q.rent_max_total_만원 != null
      ? q.rent_max_total_만원 * MAN_TO_KRW
      : q.rent_max_월세_만원 != null
      ? q.rent_max_월세_만원 * MAN_TO_KRW
      : null;

  if (maxKrw == null) {
    if (monthly === 0)
      return { score: 0, max, reason: "임대료 정보 없음", level: "✕" };
    return {
      score: 10,
      max,
      reason: `${formatMan(monthly)}만 (조건 없음)`,
      level: "△",
    };
  }

  if (monthly === 0) {
    return { score: 5, max, reason: "임대료 정보 없음", level: "△" };
  }

  if (monthly <= maxKrw * 0.7) {
    return {
      score: 20,
      max,
      reason: `합 ${formatMan(monthly)}만 (예산 ${Math.round(
        (monthly / maxKrw) * 100
      )}%)`,
      level: "⭐",
    };
  }
  if (monthly <= maxKrw) {
    return {
      score: 15,
      max,
      reason: `합 ${formatMan(monthly)}만 (예산의 ${Math.round(
        (monthly / maxKrw) * 100
      )}%)`,
      level: "✅",
    };
  }
  if (monthly <= maxKrw * 1.1) {
    return {
      score: 8,
      max,
      reason: `합 ${formatMan(monthly)}만 (예산 ${Math.round(
        (monthly / maxKrw) * 100
      )}%, 살짝 초과)`,
      level: "△",
    };
  }
  return {
    score: 0,
    max,
    reason: `합 ${formatMan(monthly)}만 (예산 초과)`,
    level: "✕",
  };
}

function scoreAge(l: ListingRow, q: ParsedQuery): DimensionScore {
  const max = 20;
  if (!l.사용승인일) {
    return { score: 5, max, reason: "준공 정보 없음", level: "△" };
  }
  const year = new Date(l.사용승인일).getFullYear();
  const now = new Date().getFullYear();
  const age = now - year;

  if (Number.isNaN(year)) {
    return { score: 5, max, reason: "준공 파싱 실패", level: "△" };
  }

  const monthLabel = formatYearMonth(l.사용승인일);

  if (age <= 5) {
    return { score: 20, max, reason: `${monthLabel} 신축 ${age}년차`, level: "⭐" };
  }
  if (age <= 10) {
    return { score: 15, max, reason: `${monthLabel} 준신축 (${age}년)`, level: "✅" };
  }

  const limit = q.max_age_year ?? 30;
  if (age <= limit) {
    return { score: 10, max, reason: `${monthLabel} (${age}년)`, level: "△" };
  }
  if (age <= limit + 2) {
    return { score: 5, max, reason: `${monthLabel} 경계 (${age}년)`, level: "△" };
  }
  return { score: 0, max, reason: `${monthLabel} 노후 (${age}년)`, level: "✕" };
}

function scoreParking(
  parkingCount: number | null,
  q: ParsedQuery
): DimensionScore {
  const max = 15;
  if (parkingCount == null) {
    if (q.parking_required) {
      return { score: 0, max, reason: "주차 정보 없음 (필수 요청)", level: "✕" };
    }
    return { score: 5, max, reason: "주차 정보 없음", level: "△" };
  }
  if (parkingCount >= 8) {
    return {
      score: 15,
      max,
      reason: `자주식 ${parkingCount}대 (충분)`,
      level: "⭐",
    };
  }
  if (parkingCount >= 5) {
    return {
      score: 10,
      max,
      reason: `자주식 ${parkingCount}대`,
      level: "✅",
    };
  }
  if (parkingCount >= 3) {
    return {
      score: 5,
      max,
      reason: `자주식 ${parkingCount}대 (제한적)`,
      level: "△",
    };
  }
  return {
    score: 0,
    max,
    reason: `자주식 ${parkingCount}대 (부족)`,
    level: "✕",
  };
}

function scoreIndustry(
  l: ListingRow,
  industry: string | null,
  desc: string
): DimensionScore {
  const max = 10;
  if (!industry) {
    return { score: 5, max, reason: "업종 미선택", level: "△" };
  }
  const keywords = INDUSTRY_KEYWORDS[industry] ?? [];
  if (keywords.length === 0) {
    return { score: 5, max, reason: "업종 키워드 미정의", level: "△" };
  }

  const corpus = `${l.현재업종 ?? ""} ${l.추천업종 ?? ""} ${desc}`.toLowerCase();
  const hits = keywords.filter((k) => corpus.includes(k.toLowerCase()));

  if (hits.length >= 3) {
    return {
      score: 10,
      max,
      reason: `"${hits.slice(0, 3).join(", ")}" 매칭`,
      level: "⭐",
    };
  }
  if (hits.length >= 1) {
    return {
      score: 5,
      max,
      reason: `"${hits.join(", ")}" 매칭`,
      level: "✅",
    };
  }
  return { score: 0, max, reason: "키워드 매칭 없음", level: "✕" };
}

function scoreBonus(desc: string): DimensionScore {
  const max = 5;
  const lower = desc.toLowerCase();
  const hits = BONUS_KEYWORDS.filter((k) => lower.includes(k.toLowerCase()));
  if (hits.length === 0) {
    return { score: 0, max, reason: "보너스 키워드 없음", level: "✕" };
  }
  return {
    score: 5,
    max,
    reason: `${hits.slice(0, 3).join(", ")}`,
    level: "⭐",
  };
}

// ============================================================
// SQL filter builder

export interface SearchFilterParams {
  area_min_m2?: number;
  area_max_m2?: number;
  rent_max_월세_krw?: number;
  deposit_max_krw?: number;
  min_year?: number; // EXTRACT(YEAR FROM 사용승인일) >= this
}

// 의뢰 조건을 SQL pre-filter용 파라미터로 변환.
// 연층 허용 시 면적 ±50%, 아니면 ±20% (경계 여유).
export function buildSearchFilter(q: ParsedQuery): SearchFilterParams {
  const out: SearchFilterParams = {};

  // 면적 (공급_m2 기준 — 평 generated 컬럼이 있지만 m² 인덱스 사용)
  const areaTolerance = q.area_연층_허용 ? 0.5 : 0.2;
  if (q.area_min_평 != null) {
    out.area_min_m2 = q.area_min_평 * 3.3058 * (1 - areaTolerance);
  }
  if (q.area_max_평 != null) {
    out.area_max_m2 = q.area_max_평 * 3.3058 * (1 + areaTolerance);
  }

  // 보증금
  if (q.deposit_max_억 != null) {
    out.deposit_max_krw = q.deposit_max_억 * EOK_TO_KRW;
  }

  // 월세 단독 (월관 합은 JS-side)
  if (
    q.rent_max_월세_만원 != null &&
    q.rent_max_total_만원 == null
  ) {
    out.rent_max_월세_krw = q.rent_max_월세_만원 * MAN_TO_KRW;
  }

  // 사용승인일: 2026 - max_age_year - 2
  if (q.max_age_year != null) {
    const now = new Date().getFullYear();
    out.min_year = now - q.max_age_year - 2;
  } else if (q.min_year != null) {
    out.min_year = q.min_year - 2;
  }

  return out;
}

// ============================================================
// JS-side post-filter (지역 / 제외 지역 / 월관 합 / 연식 정확)

export function postFilter(
  rows: ListingRow[],
  q: ParsedQuery
): ListingRow[] {
  let out = rows;

  // 지역 (any 매칭 — 간략설명/설명/주소/지역 모두 검사)
  if (q.regions.length > 0) {
    out = out.filter((l) => {
      const corpus = combineText(l) + " " + (l.지역 ?? "");
      return q.regions.some((r) => corpus.includes(r));
    });
  }

  // 제외 지역
  if (q.exclude_regions.length > 0) {
    out = out.filter((l) => {
      const corpus = combineText(l) + " " + (l.지역 ?? "");
      return !q.exclude_regions.some((r) => corpus.includes(r));
    });
  }

  // 월관 합
  if (q.rent_max_total_만원 != null) {
    const maxKrw = q.rent_max_total_만원 * MAN_TO_KRW * 1.1; // 10% 경계
    out = out.filter((l) => {
      const total = (l.월세 ?? 0) + (l.관리비 ?? 0);
      return total === 0 || total <= maxKrw;
    });
  }

  return out;
}

// ============================================================
// Helpers

function combineText(l: ListingRow): string {
  return [
    l.간략설명 ?? "",
    l.설명 ?? "",
    l.주소 ?? "",
    l.현재업종 ?? "",
    l.추천업종 ?? "",
  ].join(" ");
}

export function extractParkingCount(desc: string): number | null {
  if (!desc) return null;
  const patterns = [
    /자주식\s*(\d+)\s*대/,
    /자주\s*(\d+)\s*대/,
    /기계식\s*(\d+)\s*대/,
    /주차\s*(\d+)\s*대/,
    /주차\s+(\d+)/,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function formatMan(n: number): string {
  return Math.round(n / 10_000).toLocaleString();
}

function formatYearMonth(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 7);
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}.${mm}`;
}

// 네이버 부동산 URL — Pro 티어에서 매물 상세 새 탭 열기용
export function naverPropertyUrl(article_no: string | null | undefined): string | null {
  if (!article_no) return null;
  return `https://m.land.naver.com/article/info/${article_no}`;
}
