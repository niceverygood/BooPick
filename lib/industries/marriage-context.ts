// 결혼정보회사 산업 컨텍스트 로더
//
// assets/industry_marriage.json 을 읽어 PDF 페이지 2 (운영 특성)
// HTML 섹션을 빌드한다. Phase 5에서 매물별 분석 생성도 같은 JSON을 사용.

import { readFile } from "fs/promises";
import { join } from "path";

export interface IndustryCriterion {
  label: string;
  title: string;
  body: string;
}

export interface IndustryContext {
  id: string;
  display_name: string;
  aliases: string[];
  context_page: {
    title: string;
    intro: string;
    criteria: IndustryCriterion[];
  };
  analysis_prompt?: string;
  icon_pool?: Record<string, string>;
  validated_examples?: Record<
    string,
    {
      headline: string;
      points: { icon: string; title: string; description: string }[];
    }
  >;
}

const INDUSTRY_FILES: Record<string, string> = {
  결혼정보회사: "industry_marriage.json",
  marriage: "industry_marriage.json",
};

const _cache: Record<string, IndustryContext> = {};

export async function loadIndustryContext(
  industry: string
): Promise<IndustryContext | null> {
  const file = INDUSTRY_FILES[industry];
  if (!file) return null;
  if (_cache[industry]) return _cache[industry];

  const path = join(process.cwd(), "assets", file);
  try {
    const txt = await readFile(path, "utf-8");
    const ctx = JSON.parse(txt) as IndustryContext;
    _cache[industry] = ctx;
    return ctx;
  } catch (e) {
    console.error(`[industry] ${industry} load fail:`, e);
    return null;
  }
}

// 페이지 2: 운영 특성 페이지 HTML 빌더
//
// pageNum/totalPages는 표지/PDF 구조에 맞춰 호출자가 전달.
export function buildIndustryContextSectionHTML(
  ctx: IndustryContext,
  pageNum: string,
  totalPages: string
): string {
  const cards = ctx.context_page.criteria
    .map(
      (c) => `
      <div class="criteria-card">
        <span class="criteria-label">${escapeHtml(c.label)}</span>
        <span class="criteria-title">${escapeHtml(c.title)}</span>
        <div class="criteria-body">${escapeHtml(c.body)}</div>
      </div>`
    )
    .join("");

  return `
  <section class="page">
    <header class="page-header">
      <h2>${escapeHtml(ctx.context_page.title)}</h2>
      <span class="page-num">${pageNum} / ${totalPages}</span>
    </header>
    <p class="ctx-intro">${escapeHtml(ctx.context_page.intro)}</p>
    ${cards}
  </section>`;
}

// 라이트 export — 호출자에서도 escape에 일관된 헬퍼 쓰도록
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
