// V3 Phase 5 — 산업 관점 분석 오케스트레이터
//
// generateIndustryAnalysis(industry, listings, query):
//   1. INDUSTRIES 맵에서 config 찾기 (display_name + alias 모두 매칭)
//   2. 5개 매물 병렬 Claude 분석 (Promise.all)
//   3. context_page (정적) + per_listing[] (HTML string) 반환
//
// V1: 결혼정보회사만. V2부터 lib/industries/{id}.ts 추가.

import { callClaudeJSON } from "@/lib/claude";
import {
  MARRIAGE_INDUSTRY,
  renderPointsHTML,
  type IndustryConfig,
  type AnalysisPoint,
} from "./marriage";
import type { ScoredListing } from "../scoring";
import type { ParsedQuery } from "../parsed-query-types";

const MODEL = "claude-sonnet-4-5-20250929";

// ============================================================
// 공개 API

export interface IndustryAnalysisResult {
  context_page: string;       // page 2 HTML (industry config의 context_page_html)
  per_listing: string[];      // 5개 매물 biz-analysis 박스 HTML (실패한 슬롯은 빈 문자열)
}

export async function generateIndustryAnalysis(
  industry: string,
  listings: ScoredListing[],
  query: ParsedQuery
): Promise<IndustryAnalysisResult> {
  const cfg = getIndustryConfig(industry);
  if (!cfg) {
    return { context_page: "", per_listing: [] };
  }

  const top5 = listings.slice(0, 5);

  // 병렬 5건 (각 1500 토큰 max)
  const analyses = await Promise.all(
    top5.map((l) => analyzeListing(l, query, cfg).catch((e) => {
      console.error(`[industry] listing ${l.id} fail:`, e);
      return null;
    }))
  );

  const per_listing = analyses.map((a) => {
    if (!a) return "";
    return renderPointsHTML(cfg.display_name, a.headline, a.points);
  });

  return {
    context_page: cfg.context_page_html,
    per_listing,
  };
}

export function getIndustryConfig(name: string | null): IndustryConfig | null {
  if (!name) return null;
  return INDUSTRIES[name] ?? null;
}

export function isIndustrySupported(name: string | null): boolean {
  return getIndustryConfig(name) !== null;
}

export type { IndustryConfig, AnalysisPoint } from "./marriage";

// ============================================================
// 내부 — 매물 1건 분석

interface ParsedAnalysis {
  headline: string;
  points: AnalysisPoint[];
}

async function analyzeListing(
  listing: ScoredListing,
  query: ParsedQuery,
  cfg: IndustryConfig
): Promise<ParsedAnalysis | null> {
  const listingData = {
    매물번호: listing.article_no,
    면적_평: listing.공급_평,
    전용_평: listing.전용_평,
    위치: listing.지역,
    층: listing.해당층,
    전체층: listing.전체층,
    보증금_원: listing.보증금,
    월세_원: listing.월세,
    관리비_원: listing.관리비,
    준공: listing.사용승인일,
    주차_대수_추출: listing.parking_count,
    추천업종: listing.추천업종,
    간략설명: listing.간략설명,
    설명_요약: (listing.설명 ?? "").slice(0, 500),
    적합도_점수: listing.score,
    breakdown_요약: {
      면적: listing.breakdown.면적.reason,
      임대료: listing.breakdown.임대료.reason,
      연식: listing.breakdown.연식.reason,
      주차: listing.breakdown.주차.reason,
    },
  };

  const queryData = {
    industry: query.industry,
    regions: query.regions,
    exclude_regions: query.exclude_regions,
    면적_min_평: query.area_min_평,
    면적_max_평: query.area_max_평,
    연층_허용: query.area_연층_허용,
    rent_max_total_만원: query.rent_max_total_만원,
    deposit_max_억: query.deposit_max_억,
    employee_count: query.employee_count,
    max_age_year: query.max_age_year,
    move_in_month: query.move_in_month,
    parking_required: query.parking_required,
    additional_notes: query.additional_notes,
  };

  // 산업 prompt + LISTING_DATA / QUERY_DATA 치환 + 출력 형식 wrapper 추가
  const filled = cfg.analysis_prompt
    .replace("{LISTING_DATA}", JSON.stringify(listingData, null, 2))
    .replace("{QUERY_DATA}", JSON.stringify(queryData, null, 2));

  const systemPrompt =
    filled +
    `

## 출력 형식 (override)
반드시 다음 JSON 형식으로만 출력. 다른 텍스트·마크다운 fence 금지:
{
  "headline": "12~20자 한 줄 요약 (예: \\"신축 통사옥 = 이미지 메이킹 베스트\\")",
  "points": [
    { "icon": "이모지", "title": "9~14자 제목", "description": "100~150자 본문" },
    { "icon": "이모지", "title": "...", "description": "..." },
    { "icon": "이모지", "title": "...", "description": "..." },
    { "icon": "⚠️", "title": "약점/보완", "description": "..." }
  ]
}`;

  try {
    const r = await callClaudeJSON<unknown>({
      systemPrompt,
      userMessage: `위 매물에 대한 ${cfg.display_name} 운영 분석을 JSON으로 출력하세요.`,
      maxTokens: 1500,
      modelOverride: MODEL,
    });

    return normalizeAnalysis(r.data, listing, cfg);
  } catch (e) {
    console.error(`[industry] Claude call fail (${listing.article_no}):`, e);
    return null;
  }
}

// 응답이 wrapper {headline, points} 또는 bare array인 경우 모두 받아들임.
function normalizeAnalysis(
  raw: unknown,
  listing: ScoredListing,
  cfg: IndustryConfig
): ParsedAnalysis | null {
  // wrapper 형식
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as { headline?: unknown; points?: unknown };
    if (Array.isArray(obj.points)) {
      const points = filterValidPoints(obj.points);
      if (points.length === 0) return null;
      const headline =
        typeof obj.headline === "string" && obj.headline.trim().length > 0
          ? obj.headline.trim()
          : deriveHeadline(listing, cfg.display_name);
      return { headline, points };
    }
  }
  // bare array (legacy prompt format)
  if (Array.isArray(raw)) {
    const points = filterValidPoints(raw);
    if (points.length === 0) return null;
    return {
      headline: deriveHeadline(listing, cfg.display_name),
      points,
    };
  }
  return null;
}

function filterValidPoints(arr: unknown[]): AnalysisPoint[] {
  return arr
    .filter((x): x is { icon: unknown; title: unknown; description: unknown } => {
      return !!x && typeof x === "object";
    })
    .map((x) => ({
      icon: typeof x.icon === "string" ? x.icon : "•",
      title: typeof x.title === "string" ? x.title : "",
      description: typeof x.description === "string" ? x.description : "",
    }))
    .filter((p) => p.title.length > 0 && p.description.length > 0)
    .slice(0, 4);
}

// 응답에 headline 누락 시 — score breakdown 기반 결정적 fallback.
function deriveHeadline(listing: ScoredListing, industryDisplay: string): string {
  const b = listing.breakdown;
  const tags: string[] = [];
  if (b.연식.level === "⭐") tags.push("신축");
  if (b.주차.level === "⭐") tags.push("주차");
  if (b.면적.level === "⭐") tags.push("면적 정확");
  if (b.기타.score >= 5) tags.push("통사옥/렌트프리");

  if (industryDisplay === "결혼정보회사") {
    if (tags.includes("주차") && tags.includes("신축"))
      return "주차 + 신축 = 운영 리스크 최소화";
    if (tags.includes("주차")) return "주차 안정성 = 회원 동시 방문 수용";
    if (tags.includes("신축")) return "신축 첫 입주 = 인테리어 자유도 100%";
    if (tags.includes("통사옥/렌트프리"))
      return "통사옥 = 결정사 단독 빌딩 이미지";
    if (tags.includes("면적 정확")) return "면적 정확 부합 = 평면 자유도";
    return "결정사 운영 적합 매물";
  }

  return tags.length > 0
    ? `${industryDisplay} — ${tags.join(" + ")}`
    : `${industryDisplay} 운영 적합 매물`;
}

// ============================================================
// INDUSTRIES 맵 (id + display_name + aliases 모두 매칭)

const INDUSTRIES: Record<string, IndustryConfig> = {};
function registerIndustry(cfg: IndustryConfig) {
  INDUSTRIES[cfg.id] = cfg;
  INDUSTRIES[cfg.display_name] = cfg;
  for (const a of cfg.aliases) INDUSTRIES[a] = cfg;
}
registerIndustry(MARRIAGE_INDUSTRY);

// 외부에서 신규 산업 등록 (테스트 / V2 핫스왑용 — 일반적으로 사용 안 함)
export function _registerIndustryForTest(cfg: IndustryConfig) {
  registerIndustry(cfg);
}

// V1 지원 산업 명단 (UI 노출 + 가용성 체크용)
export const SUPPORTED_INDUSTRIES = ["결혼정보회사"];

// V2 추가 예정 (UI에 "준비중"으로 표시)
export const COMING_SOON_INDUSTRIES = [
  "음식점",
  "술집",
  "병원",
  "학원",
  "법무법인",
  "미용실",
];
