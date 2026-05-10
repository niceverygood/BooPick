// 매물 스코어링 — 업종별 가중치 + V3 ParsedQuery 풍부 스키마 대응
//
// DB 단위:
//   보증금/월세/관리비 → 원 (KRW)
//   공급_평/전용_평 → 평
//
// ParsedQuery 단위:
//   area_*_평 → 평
//   rent_max_total_만원 / rent_max_월세_만원 → 만원
//   deposit_max_억 → 억

import type { ParsedQuery } from "./query-parser";
import { MARRIAGE_WEIGHTS } from "./industries/marriage";

export interface ListingRow {
  id: number;
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
}

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

const DEFAULT_WEIGHTS: IndustryWeights = {
  area: 0.2,
  floor: 0.05,
  rent: 0.15,
  deposit: 0.1,
  age: 0.1,
  industry_match: 0.15,
  region: 0.2,
  parking: 0.05,
};

const INDUSTRY_WEIGHT_MAP: Record<string, IndustryWeights> = {
  결혼정보회사: {
    ...MARRIAGE_WEIGHTS,
    region: 0.2,
    parking: 0.1,
  },
  결혼식장: {
    ...MARRIAGE_WEIGHTS,
    region: 0.15,
    parking: 0.1,
  },
};

export interface ScoredListing extends ListingRow {
  score: number;
  reasons: string[];
}

const MAN_TO_KRW = 10_000;
const EOK_TO_KRW = 100_000_000;

function regionMatches(listingRegion: string | null, regions: string[]): boolean {
  if (regions.length === 0) return true;
  if (!listingRegion) return false;
  return regions.some((r) => listingRegion.includes(r));
}

function regionExcluded(
  listingRegion: string | null,
  excludes: string[]
): boolean {
  if (excludes.length === 0) return false;
  if (!listingRegion) return false;
  return excludes.some((r) => listingRegion.includes(r));
}

export function scoreListing(
  listing: ListingRow,
  parsed: ParsedQuery,
  industry: string | null
): ScoredListing {
  const w = (industry && INDUSTRY_WEIGHT_MAP[industry]) || DEFAULT_WEIGHTS;
  const reasons: string[] = [];
  let score = 0;

  // 지역
  if (parsed.regions.length > 0) {
    if (regionMatches(listing.지역, parsed.regions)) {
      score += w.region;
      reasons.push(`지역 매칭 (${listing.지역 ?? "—"})`);
    }
  } else {
    score += w.region * 0.5;
  }

  // 면적
  if (listing.공급_평 != null) {
    const min = parsed.area_min_평;
    const max = parsed.area_max_평;
    const okMin = min == null || listing.공급_평 >= min;
    const okMax = max == null || listing.공급_평 <= max;
    if (okMin && okMax) {
      score += w.area;
      reasons.push(`면적 ${listing.공급_평.toFixed(1)}평 — 조건 일치`);
    } else if (min != null || max != null) {
      // partial credit: 범위 근처면 0.4 가중
      const close =
        (min != null && listing.공급_평 >= min * 0.9) ||
        (max != null && listing.공급_평 <= max * 1.1);
      if (close) score += w.area * 0.3;
    }
  }

  // 월세 / 관리비 합
  if (parsed.rent_max_total_만원 != null) {
    const maxKrw = parsed.rent_max_total_만원 * MAN_TO_KRW;
    const monthly = (listing.월세 ?? 0) + (listing.관리비 ?? 0);
    if (monthly > 0 && monthly <= maxKrw) {
      score += w.rent;
      reasons.push(`월관 ${formatMan(monthly)} ≤ ${parsed.rent_max_total_만원}만`);
    }
  } else if (parsed.rent_max_월세_만원 != null && listing.월세 != null) {
    const maxKrw = parsed.rent_max_월세_만원 * MAN_TO_KRW;
    if (listing.월세 <= maxKrw) {
      score += w.rent;
      reasons.push(`월세 ${formatMan(listing.월세)} 이내`);
    }
  }

  // 보증금
  if (parsed.deposit_max_억 != null && listing.보증금 != null) {
    const maxKrw = parsed.deposit_max_억 * EOK_TO_KRW;
    if (listing.보증금 <= maxKrw) {
      score += w.deposit;
      reasons.push(`보증금 ${formatEok(listing.보증금)} 이내`);
    }
  }

  // 추천업종 매칭
  if (industry && listing.추천업종) {
    if (listing.추천업종.includes(industry)) {
      score += w.industry_match;
      reasons.push(`추천업종 매칭 (${industry})`);
    }
  } else if (!industry) {
    score += w.industry_match * 0.3;
  }

  // 건물 연식
  if (listing.사용승인일) {
    const year = new Date(listing.사용승인일).getFullYear();
    const now = new Date().getFullYear();
    const age = now - year;
    let agePass = true;
    if (parsed.max_age_year != null && age > parsed.max_age_year) agePass = false;
    if (parsed.min_year != null && year < parsed.min_year) agePass = false;
    if (agePass) {
      score += w.age;
      reasons.push(`준공 ${year}년 (연식 ${age}년)`);
    }
  }

  // 층
  if (listing.해당층) {
    const f = listing.해당층.trim();
    if (f === "1") {
      score += w.floor;
      reasons.push("1층 노출 좋음");
    } else if (parsed.area_연층_허용 && /\d+~\d+|연층/.test(f)) {
      score += w.floor * 0.8;
      reasons.push(`연층 (${f})`);
    }
  }

  // 주차
  if (parsed.parking_required) {
    const desc = `${listing.설명 ?? ""} ${listing.간략설명 ?? ""}`;
    if (/주차/.test(desc)) {
      score += w.parking;
      reasons.push("주차 가능 (설명 매치)");
    }
  } else {
    score += w.parking * 0.5;
  }

  // 제외 지역 — 강한 페널티
  if (regionExcluded(listing.지역, parsed.exclude_regions)) {
    score -= 0.5;
    reasons.push(`⚠ 제외 지역 (${listing.지역})`);
  }

  return { ...listing, score, reasons };
}

export function rankListings(
  listings: ListingRow[],
  parsed: ParsedQuery,
  industry: string | null,
  topN = 20
): ScoredListing[] {
  return listings
    .map((l) => scoreListing(l, parsed, industry))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

function formatMan(n: number): string {
  return `${Math.round(n / 10_000).toLocaleString()}만`;
}
function formatEok(n: number): string {
  if (n >= EOK_TO_KRW)
    return `${(n / EOK_TO_KRW).toFixed(1).replace(/\.0$/, "")}억`;
  return formatMan(n);
}
