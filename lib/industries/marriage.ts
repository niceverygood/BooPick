// 결혼정보회사 산업 컨텍스트 + HTML 빌더
//
// 데이터 단일 소스: assets/industry_marriage.json (사용자 보유 자산)
// 이 파일은 JSON을 TS 모듈로 import해 메모리에 적재하고,
// PDF 페이지 2 (운영 특성) HTML을 사전 렌더한 결과를 export.

import data from "../../assets/industry_marriage.json";

export interface IndustryConfig {
  id: string;
  display_name: string;
  aliases: string[];
  context_page_html: string; // 페이지 2 전체 HTML (5 criteria 카드)
  analysis_prompt: string;   // Claude system prompt (LISTING_DATA / QUERY_DATA placeholder)
  icon_pool?: Record<string, string>;
}

export interface AnalysisPoint {
  icon: string;
  title: string;
  description: string;
}

// ============================================================
// HTML escape (industries 전역에서 공유)

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================
// 페이지 2: 운영 특성 (정적, JSON criteria 기반)

function renderContextPageHTML(): string {
  const cards = data.context_page.criteria
    .map(
      (c) => `
      <div class="criteria-card">
        <span class="criteria-label">${escapeHtml(c.label)}</span>
        <span class="criteria-title">${escapeHtml(c.title)}</span>
        <div class="criteria-body">${escapeHtml(c.body)}</div>
      </div>`
    )
    .join("");

  // page-num은 PDF 생성기가 마지막에 치환
  return `
  <section class="page">
    <header class="page-header">
      <h2>${escapeHtml(data.context_page.title)}</h2>
      <span class="page-num">{{INDUSTRY_PAGE_NUM}} / {{TOTAL_PAGES}}</span>
    </header>
    <p class="ctx-intro">${escapeHtml(data.context_page.intro)}</p>
    ${cards}
  </section>`;
}

// ============================================================
// 매물별 산업 분석 박스 HTML (Pro biz-analysis box)

export function renderPointsHTML(
  industryDisplay: string,
  headline: string,
  points: AnalysisPoint[]
): string {
  if (!Array.isArray(points) || points.length === 0) return "";

  const pointsHTML = points
    .slice(0, 4)
    .map(
      (p) => `
      <div class="biz-point">
        <div class="biz-icon">${escapeHtml(p.icon)}</div>
        <div class="biz-content">
          <div class="biz-title">${escapeHtml(p.title)}</div>
          <div class="biz-desc">${escapeHtml(p.description)}</div>
        </div>
      </div>`
    )
    .join("");

  return `
  <div class="biz-analysis">
    <div class="biz-analysis-header">○ ${escapeHtml(industryDisplay)} 운영 관점 분석</div>
    <div class="biz-analysis-headline">${escapeHtml(headline)}</div>
    ${pointsHTML}
  </div>`;
}

// 분석 미생성 / 실패 시 fallback (자리 채움 X — 빈 문자열)
export function emptyAnalysisHTML(): string {
  return "";
}

// ============================================================
// 결혼정보회사 export

export const MARRIAGE_INDUSTRY: IndustryConfig = {
  id: data.id,
  display_name: data.display_name,
  aliases: data.aliases,
  context_page_html: renderContextPageHTML(),
  analysis_prompt: data.analysis_prompt,
  icon_pool: data.icon_pool,
};
