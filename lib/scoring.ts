// 매물 스코어링 — 업종별 가중치 적용
//
// 사용 예:
//   const score = scoreListing(listing, parsed, "결혼식장");

import type { ParsedCondition } from "./query-parser";
import { MARRIAGE_WEIGHTS } from "./industries/marriage";

export interface ListingRow {
  id: number;
  지역: string | null;
  공급_m2: number | null;
  전용_m2: number | null;
  공급_평: number | null;
  전용_평: number | null;
  해당층: string | null;
  보증금: number | null;
  월세: number | null;
  현재업종: string | null;
  추천업종: string | null;
  설명: string | null;
  사용승인일: string | null;
}

export interface IndustryWeights {
  area: number;        // 면적 가중치
  floor: number;       // 층 가중치
  rent: number;        // 월세 가중치
  deposit: number;     // 보증금 가중치
  age: number;         // 건물 연식
  industry_match: number; // 추천업종 매칭
}

const DEFAULT_WEIGHTS: IndustryWeights = {
  area: 0.25,
  floor: 0.1,
  rent: 0.2,
  deposit: 0.15,
  age: 0.1,
  industry_match: 0.2,
};

const INDUSTRY_WEIGHT_MAP: Record<string, IndustryWeights> = {
  결혼식장: MARRIAGE_WEIGHTS,
  // 추후 카페/학원/필라테스 등 추가
};

export interface ScoredListing extends ListingRow {
  score: number;
  reasons: string[];
}

export function scoreListing(
  listing: ListingRow,
  parsed: ParsedCondition,
  industry: string | null
): ScoredListing {
  const w =
    (industry && INDUSTRY_WEIGHT_MAP[industry]) || DEFAULT_WEIGHTS;
  const reasons: string[] = [];
  let score = 0;

  // 면적 fit
  if (listing.공급_평 != null) {
    const min = parsed.공급_평_min ?? parsed.공급_m2_min ?? null;
    const max = parsed.공급_평_max ?? parsed.공급_m2_max ?? null;
    if (
      (min == null || listing.공급_평 >= min) &&
      (max == null || listing.공급_평 <= max)
    ) {
      score += w.area;
      reasons.push(`면적 ${listing.공급_평.toFixed(1)}평 — 조건 일치`);
    }
  }

  // 월세 fit
  if (listing.월세 != null && parsed.월세_max != null) {
    if (listing.월세 <= parsed.월세_max) {
      score += w.rent;
      reasons.push("월세 예산 이내");
    }
  }

  // 보증금 fit
  if (listing.보증금 != null && parsed.보증금_max != null) {
    if (listing.보증금 <= parsed.보증금_max) {
      score += w.deposit;
      reasons.push("보증금 예산 이내");
    }
  }

  // 추천업종 매칭
  if (industry && listing.추천업종) {
    if (listing.추천업종.includes(industry)) {
      score += w.industry_match;
      reasons.push(`추천업종 매칭 (${industry})`);
    }
  }

  // 건물 연식 (오래된 건물 감점은 업종 따라)
  if (listing.사용승인일 && w.age > 0) {
    const year = new Date(listing.사용승인일).getFullYear();
    if (year >= 2010) {
      score += w.age;
      reasons.push(`준공 ${year}년`);
    }
  }

  // 층 가중치 (간단하게 1층/지하 따라 차등)
  if (listing.해당층 === "1") {
    score += w.floor;
    reasons.push("1층 노출 좋음");
  }

  return { ...listing, score, reasons };
}

export function rankListings(
  listings: ListingRow[],
  parsed: ParsedCondition,
  industry: string | null,
  topN = 20
): ScoredListing[] {
  return listings
    .map((l) => scoreListing(l, parsed, industry))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
