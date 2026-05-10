// V3 Phase 4 — 의뢰 제안서 PDF 생성기
//
// 흐름:
//   1. lib/pdf-templates/proposal.html 템플릿 로드
//   2. Pro 티어면 매물 5건 QR 코드 생성 (data URL)
//   3. 모든 placeholder를 데이터로 치환
//   4. Puppeteer headless로 HTML → PDF
//   5. Buffer 반환
//
// 베이직 vs 프로 분기:
//   - 베이직: 페이지 2 (산업 컨텍스트) 통째 제거 → 8페이지
//   - 베이직: NAVER PROPERTY ID 박스 + 산업 분석 박스 모두 제거
//   - 프로: 9페이지 풀 + QR + 산업 분석 박스

import { readFile } from "fs/promises";
import { join } from "path";
import QRCode from "qrcode";
import type { ScoredListing } from "./scoring";
import type { ParsedQuery } from "./parsed-query-types";
import {
  loadIndustryContext,
  buildIndustryContextSectionHTML,
  escapeHtml,
} from "./industries/marriage-context";

export type Tier = "basic" | "pro";

export interface AnalysisPoint {
  icon: string;
  title: string;
  description: string;
}

export interface ListingAnalysis {
  listing_id: number;
  headline: string;
  points: AnalysisPoint[];
}

export interface PDFGenInput {
  title: string;                  // "사무실 임대 매물 제안서" 등
  subtitle?: string;              // "결혼정보회사 운영 관점 베스트 5건"
  date: Date;
  industry: string | null;
  tier: Tier;
  query: ParsedQuery;
  query_raw?: string;
  listings: ScoredListing[];
  agent_name?: string;            // 서명용 공인중개사 이름
  industry_analysis?: ListingAnalysis[]; // Pro: 매물별 산업 분석 (Phase 5에서 생성)
}

const NAVER_BASE = "https://new.land.naver.com/?articleNo=";

// ============================================================
// Public entry

export async function generatePDF(input: PDFGenInput): Promise<Buffer> {
  const html = await buildHTML(input);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// 호환 — Phase 3까지 사용된 시그니처
export interface ReportData {
  title: string;
  query: string;
  industry: string | null;
  listings: ScoredListing[];
  generatedAt: Date;
}
export async function generateReportPDF(d: ReportData): Promise<Buffer> {
  return generatePDF({
    title: d.title,
    date: d.generatedAt,
    industry: d.industry,
    tier: "basic",
    query: { ...EMPTY_FOR_LEGACY },
    query_raw: d.query,
    listings: d.listings,
  });
}
const EMPTY_FOR_LEGACY: ParsedQuery = {
  industry: null,
  regions: [],
  exclude_regions: [],
  area_min_평: null,
  area_max_평: null,
  area_연층_허용: false,
  rent_max_total_만원: null,
  rent_max_월세_만원: null,
  deposit_max_억: null,
  employee_count: null,
  max_age_year: null,
  min_year: null,
  move_in_month: null,
  parking_required: false,
  additional_notes: [],
};

// ============================================================
// HTML 빌더 (placeholder 치환)

async function buildHTML(input: PDFGenInput): Promise<string> {
  const tplPath = join(process.cwd(), "lib", "pdf-templates", "proposal.html");
  let tpl = await readFile(tplPath, "utf-8");

  const isPro = input.tier === "pro";
  const listings = input.listings.slice(0, 5);

  // 페이지 번호 계산:
  //   Pro:   본문 8쪽 (industry, summary, 5 listings, next) → 분모 08
  //   Basic: 본문 7쪽 (summary, 5 listings, next)            → 분모 07
  const totalPages = isPro ? "08" : "07";
  const summaryPageNum = isPro ? "02" : "01";

  // Pro 산업 컨텍스트 페이지
  let industryContextSection = "";
  let industryCtxBuilt = false;
  if (isPro && input.industry) {
    const ctx = await loadIndustryContext(input.industry);
    if (ctx) {
      industryContextSection = buildIndustryContextSectionHTML(
        ctx,
        "01",
        totalPages
      );
      industryCtxBuilt = true;
    }
  }

  // QR 코드 생성 (Pro만)
  const qrMap = new Map<number, string>(); // listing.id -> data URL
  if (isPro) {
    for (const l of listings) {
      if (l.article_no) {
        try {
          const dataUrl = await QRCode.toDataURL(NAVER_BASE + l.article_no, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 200,
            color: { dark: "#0F172A", light: "#FFFBEB" },
          });
          qrMap.set(l.id, dataUrl);
        } catch (e) {
          console.error(`[pdf] QR generation failed for ${l.article_no}:`, e);
        }
      }
    }
  }

  // 표지 데이터
  const coverTitle = escapeHtml(input.title);
  const coverSubtitle = escapeHtml(
    input.subtitle ?? buildDefaultSubtitle(input.industry, isPro)
  );
  const coverDate = formatDateKo(input.date);
  const condMetaRows = buildCondMetaRows(input.query, input.query_raw);

  // 검토 요약
  const summaryHeadlineNum = `${listings.length}건 추천`;
  const summaryHeadlineDesc =
    input.query.regions.length > 0
      ? `의뢰 조건에 부합하는 ${input.query.regions[0]} 등 ${listings.length}건 ${
          input.industry ? input.industry + " 운영 적합도 점수순" : "적합도 점수순"
        }`
      : `의뢰 조건에 부합하는 매물 ${listings.length}건 적합도 점수순`;

  // 비교표
  const compareTableHTML = buildCompareTableHTML(listings, isPro);

  // 검토 의견 (Pro만 풍부, Basic은 간단)
  const reviewOpinionHTML = isPro
    ? buildReviewOpinionHTML(listings, input.industry, input.query)
    : buildBasicReviewHTML(listings);

  // 매물 페이지 5개
  const listingPagesHTML = listings
    .map((l, i) =>
      buildListingPage({
        listing: l,
        rank: i + 1,
        tier: input.tier,
        totalPages,
        bodyPageNum: pad2((isPro ? 3 : 2) + i), // Pro: 03~07, Basic: 02~06
        qrDataUrl: qrMap.get(l.id) ?? null,
        analysis: input.industry_analysis?.find((a) => a.listing_id === l.id),
        industry: input.industry,
        agentName: input.agent_name,
      })
    )
    .join("\n");

  // 다음 단계
  const nextSteps = buildNextSteps(input, listings);

  // 모든 placeholder 치환
  const replacements: Record<string, string> = {
    COVER_TITLE: coverTitle,
    COVER_SUBTITLE: coverSubtitle,
    COVER_DATE: coverDate,
    COND_META_ROWS: condMetaRows,
    INDUSTRY_CONTEXT_SECTION: industryContextSection,
    SUMMARY_PAGE_NUM: summaryPageNum,
    TOTAL_PAGES: totalPages,
    SUMMARY_HEADLINE_NUM: summaryHeadlineNum,
    SUMMARY_HEADLINE_DESC: summaryHeadlineDesc,
    COMPARE_TABLE_HTML: compareTableHTML,
    REVIEW_OPINION_HTML: reviewOpinionHTML,
    LISTING_PAGES_HTML: listingPagesHTML,
    NEXT_SCHEDULE_PRIMARY: nextSteps.primary,
    NEXT_SCHEDULE_ALT: nextSteps.alt,
    NEXT_SCHEDULE_NOTE: nextSteps.note,
    NEXT_PRIORITY: nextSteps.priority,
    NEXT_CHECKLIST: nextSteps.checklistHTML,
    NEXT_TOP_TITLE: nextSteps.topTitle,
    NEXT_STEPS_RECOMMENDATION: nextSteps.recommendation,
    AGENT_NAME: escapeHtml(input.agent_name ?? "공인중개사"),
    NEXT_FOOTER_DISCLAIMER: nextSteps.footer,
  };

  for (const [k, v] of Object.entries(replacements)) {
    tpl = tpl.split(`{{${k}}}`).join(v);
  }

  // 사용 안 한 placeholder 안전 제거 (혹시 모를 경우)
  tpl = tpl.replace(/\{\{[A-Z_0-9]+\}\}/g, "");

  // industryCtxBuilt false인데 isPro true인 케이스 — 1쪽 줄여야 하지만
  // 여기까지 오면 분모 totalPages는 industry context 있다고 가정한 값.
  // 실제로 ctx 못 찾으면 isPro=true여도 페이지 7쪽으로 떨어지므로
  // 분모를 한 번 더 보정.
  if (isPro && !industryCtxBuilt) {
    tpl = tpl
      .split("/ 08")
      .join("/ 07")
      .split(' / 08\n')
      .join(" / 07\n");
  }

  return tpl;
}

// ============================================================
// 표지 — 의뢰 조건 메타 행

function buildCondMetaRows(q: ParsedQuery, raw?: string): string {
  const rows: { label: string; value: string }[] = [];

  if (q.regions.length || q.exclude_regions.length) {
    let v = q.regions.join(" / ");
    if (q.exclude_regions.length) {
      v += ` (${q.exclude_regions.map((r) => `${r} 제외`).join(", ")})`;
    }
    rows.push({ label: "지역", value: v });
  }
  if (q.area_min_평 != null || q.area_max_평 != null) {
    const min = q.area_min_평 ?? "?";
    const max = q.area_max_평 ?? "?";
    const yeon = q.area_연층_허용 ? " (연층 검토 가능)" : "";
    rows.push({ label: "면적", value: `${min} ~ ${max}평${yeon}` });
  }
  if (q.rent_max_total_만원 != null) {
    rows.push({
      label: "임대료",
      value: `월세 + 관리비 최대 ${q.rent_max_total_만원.toLocaleString()}만`,
    });
  } else if (q.rent_max_월세_만원 != null) {
    rows.push({
      label: "임대료",
      value: `월세 최대 ${q.rent_max_월세_만원.toLocaleString()}만`,
    });
  }
  if (q.deposit_max_억 != null) {
    rows.push({ label: "보증금", value: `최대 ${q.deposit_max_억}억` });
  }
  if (q.employee_count != null) {
    const notes = q.additional_notes.length
      ? ` + ${q.additional_notes.join(" + ")}`
      : "";
    rows.push({
      label: "인원",
      value: `${q.employee_count}명${notes}`,
    });
  } else if (q.additional_notes.length) {
    rows.push({ label: "비고", value: q.additional_notes.join(" / ") });
  }
  if (q.max_age_year != null) {
    const parking = q.parking_required ? " / 방문주차 잘 되는 곳" : "";
    rows.push({
      label: "건물",
      value: `준공 ${q.max_age_year}년 이내${parking}`,
    });
  } else if (q.parking_required) {
    rows.push({ label: "주차", value: "방문주차 잘 되는 곳" });
  }
  if (q.move_in_month) {
    rows.push({ label: "입주", value: q.move_in_month });
  }

  if (rows.length === 0 && raw) {
    rows.push({ label: "조건", value: raw.slice(0, 80) });
  }

  return rows
    .map(
      (r) => `
      <div class="cond-meta-row">
        <strong>${escapeHtml(r.label)}</strong>
        <span>${escapeHtml(r.value)}</span>
      </div>`
    )
    .join("");
}

// ============================================================
// 비교표

function buildCompareTableHTML(
  listings: ScoredListing[],
  isPro: boolean
): string {
  if (listings.length === 0) {
    return `<p style="color:#94A3B8; text-align:center; padding:40pt 0;">비교할 매물이 없습니다.</p>`;
  }

  // 헤더 — 1·2·3순위(점수 ≥ 85)는 best 컬러
  const headerCells = listings
    .map((l, i) => {
      const isBest = l.score >= 85;
      const sub = bestSubtitle(l, i);
      const cls = isBest ? "col-best" : "";
      return `<th class="${cls}">매물 ${i + 1}<span class="col-sub">${escapeHtml(sub)}</span></th>`;
    })
    .join("");

  // 매물번호 행 — Pro: 클릭 가능 링크 / Basic: 텍스트
  const articleNoRow = listings
    .map((l) => {
      const isBest = l.score >= 85;
      const cellCls = isBest ? "cell-best" : "";
      if (!l.article_no) return `<td class="${cellCls}">—</td>`;
      if (isPro) {
        return `<td class="${cellCls}"><a href="${NAVER_BASE}${escapeHtml(l.article_no)}">${escapeHtml(l.article_no)}</a></td>`;
      }
      return `<td class="${cellCls}">${escapeHtml(l.article_no)}</td>`;
    })
    .join("");

  // 일반 셀 빌더
  const cell = (val: string, l: ScoredListing, isPriceCell = false): string => {
    const best = l.score >= 85;
    const cls = [best ? "cell-best" : "", isPriceCell ? "cell-price" : ""]
      .filter(Boolean)
      .join(" ");
    return `<td${cls ? ` class="${cls}"` : ""}>${val}</td>`;
  };

  const row = (
    label: string,
    sub: string | null,
    cells: ((l: ScoredListing) => string)[]
  ): string => {
    const labelHTML = sub
      ? `${escapeHtml(label)}<span class="row-label-sub">${escapeHtml(sub)}</span>`
      : escapeHtml(label);
    const cellsHTML = listings
      .map((l) => {
        const v = cells[0](l);
        return cell(v, l, label === "보증금" || label === "월세");
      })
      .join("");
    return `<tr><td class="row-label">${labelHTML}</td>${cellsHTML}</tr>`;
  };

  return `
  <table class="compare-table">
    <thead>
      <tr>
        <th class="row-label" style="width:14%">구분</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="row-label">매물번호<span class="row-label-sub">(네이버부동산)</span></td>
        ${articleNoRow}
      </tr>
      ${row("위치", null, [(l) => escapeHtml(l.지역 ?? "—")])}
      ${row("면적", null, [(l) => `${l.공급_평?.toFixed(0) ?? "—"}평<br/>전용 ${l.전용_평?.toFixed(0) ?? "—"}`])}
      ${row("층", null, [(l) => `${escapeHtml(l.해당층 ?? "—")}층<br/>${l.전체층 ? "총 " + escapeHtml(l.전체층) + "층" : "—"}`])}
      ${row("보증금", null, [(l) => formatPrice(l.보증금)])}
      ${row("월세", null, [(l) => formatPrice(l.월세, true)])}
      ${row("지정 주차", null, [
        (l) =>
          l.parking_count != null
            ? `자주식 ${l.parking_count}대${l.breakdown.주차.level === "⭐" ? '<br/><span style="color:#16A34A">★ 베스트</span>' : ""}`
            : "—",
      ])}
      ${row("준공", null, [
        (l) =>
          l.사용승인일
            ? `${formatYearDot(l.사용승인일)}<br/><span style="color:${l.breakdown.연식.level === "⭐" ? "#16A34A" : "#64748B"}">${l.breakdown.연식.reason.replace(/.*\(|\)/g, "").trim() || ""}</span>`
            : "—",
      ])}
    </tbody>
  </table>`;
}

function bestSubtitle(l: ScoredListing, rank: number): string {
  if (rank === 0 && l.score >= 90) return "(베스트)";
  if (l.breakdown.주차.level === "⭐") return "(주차)";
  if (l.breakdown.연식.level === "⭐") return "(신축)";
  if (l.breakdown.업종.score >= 10) return "(업종 매칭)";
  if (l.score >= 75) return "(주요)";
  return "(가성비)";
}

// ============================================================
// 검토 의견

function buildReviewOpinionHTML(
  listings: ScoredListing[],
  industry: string | null,
  q: ParsedQuery
): string {
  const top = listings[0];
  if (!top) return "";

  const area = q.area_min_평 != null && q.area_max_평 != null
    ? `${q.area_min_평}~${q.area_max_평}평`
    : "조건";
  const stars = listings
    .map((l, i) => {
      const star = l.score >= 90 ? "★★★" : l.score >= 80 ? "★★" : "★";
      return `${i + 1}번(${star})`;
    })
    .join(", ");

  return `
  <div class="review-opinion">
    <h3>${escapeHtml(industry ?? "매물")} 운영 관점 검토 의견</h3>
    <p><strong>면적 · 연식 · 임대료</strong>: ${listings.length}건 모두 의뢰 조건에 정확히 부합합니다.</p>
    <p><strong>적합도 분석</strong>: ${escapeHtml(stars)}. 1순위 ${top.지역 ? `${escapeHtml(top.지역)} ` : ""}매물이 가장 균형잡힌 선택입니다.</p>
    <p><strong>운영 핵심 우선순위 추천</strong>: 면적 ${area} 정확 부합 + 점수 상위 매물(${listings.slice(0, Math.min(3, listings.length)).map((_, i) => i + 1 + "번").join(" / ")})을 우선 답사 권장합니다.</p>
  </div>`;
}

function buildBasicReviewHTML(listings: ScoredListing[]): string {
  if (listings.length === 0) return "";
  return `
  <div class="review-opinion" style="background:#F8FAFC;border-left-color:#94A3B8;">
    <h3 style="color:#475569;">검토 의견</h3>
    <p>의뢰 조건에 부합하는 매물 ${listings.length}건을 적합도 점수순으로 추천합니다. 1순위는 매물 1번 (${listings[0].score}점)이며, 답사 시 면적·임대료·주차를 현장에서 함께 확인하시기 바랍니다.</p>
  </div>`;
}

// ============================================================
// 매물 상세 페이지 빌더

interface ListingPageOpts {
  listing: ScoredListing;
  rank: number;
  tier: Tier;
  totalPages: string;
  bodyPageNum: string;
  qrDataUrl: string | null;
  analysis: ListingAnalysis | undefined;
  industry: string | null;
  agentName?: string;
}

function buildListingPage(opts: ListingPageOpts): string {
  const { listing: l, rank, tier, totalPages, bodyPageNum, qrDataUrl, analysis, industry, agentName } = opts;
  const isPro = tier === "pro";

  // 헤더 제목 — 지역 / 층 / 면적
  const title = `${l.지역 ?? "—"} / ${l.해당층 ?? "—"}층 / ${l.공급_평?.toFixed(0) ?? "—"}평`;

  // 배지
  const badges = buildBadgesHTML(l);

  // NAVER ID 박스 (Pro만)
  const naverBox = isPro && l.article_no ? buildNaverBoxHTML(l, qrDataUrl) : "";

  // 정보 그리드 (3x2)
  const infoGrid = buildInfoGridHTML(l);

  // 산업 분석 박스 (Pro + analysis)
  const bizBox = isPro && industry
    ? buildBizAnalysisHTML(analysis, industry)
    : "";

  // 체크리스트
  const checklist = buildChecklistHTML(l);

  // agency
  const agency = `<div class="agency-info">등록 부동산 · <strong>${escapeHtml(agentName ?? "공인중개사")}</strong></div>`;

  return `
  <section class="page">
    <header class="page-header">
      <span></span>
      <span class="page-num">${bodyPageNum} / ${totalPages}</span>
    </header>

    <div class="listing-page-header">
      <div class="listing-num-big">${pad2(rank)}</div>
      <div class="listing-head-text">
        <div class="listing-title">${escapeHtml(title)}</div>
        <div class="listing-badges">${badges}</div>
      </div>
    </div>

    ${naverBox}
    ${infoGrid}
    ${bizBox}
    ${checklist}
    ${agency}
  </section>`;
}

function buildBadgesHTML(l: ScoredListing): string {
  const badges: string[] = [];
  if (l.score >= 95) badges.push(`<span class="badge badge-100">100% 적합</span>`);
  else if (l.score >= 85) badges.push(`<span class="badge badge-90">90% 적합</span>`);

  if (l.breakdown.연식.level === "⭐") {
    const yr = formatYearDot(l.사용승인일);
    badges.push(`<span class="badge badge-new">${yr} 신축</span>`);
  }
  if (l.breakdown.주차.level === "⭐") {
    badges.push(`<span class="badge badge-area">자주식 ${l.parking_count}대 ★</span>`);
  }
  if (l.breakdown.기타.score >= 5) {
    badges.push(`<span class="badge badge-area">${escapeHtml(l.breakdown.기타.reason.split(",")[0].trim())}</span>`);
  }
  if (badges.length === 0) {
    badges.push(`<span class="badge badge-area">매물 #${l.score}</span>`);
  }
  return badges.join("");
}

function buildNaverBoxHTML(l: ScoredListing, qrDataUrl: string | null): string {
  const url = NAVER_BASE + l.article_no;
  return `
  <div class="naver-id-box">
    <div class="naver-id-text">
      <div class="naver-id-label">NAVER PROPERTY ID</div>
      <div class="naver-id-num">${escapeHtml(l.article_no!)}</div>
      <a href="${escapeHtml(url)}" class="naver-id-url">new.land.naver.com/?articleNo=${escapeHtml(l.article_no!)}</a>
    </div>
    ${
      qrDataUrl
        ? `<div class="naver-id-qr">
             <img src="${qrDataUrl}" alt="QR" />
             <div class="naver-id-qr-caption">↑ 모바일 스캔</div>
           </div>`
        : ""
    }
  </div>`;
}

function buildInfoGridHTML(l: ScoredListing): string {
  const cells: { label: string; value: string; sub: string }[] = [
    {
      label: "면적",
      value: `${l.공급_평?.toFixed(0) ?? "—"}평`,
      sub: l.전용_평 ? `전용 ${l.전용_평.toFixed(0)}평` : "",
    },
    {
      label: "위치",
      value: `${l.해당층 ?? "—"}층`,
      sub: l.전체층 ? `총 ${l.전체층}층 빌딩` : "",
    },
    {
      label: "준공일",
      value: formatYearDot(l.사용승인일),
      sub: ageText(l.사용승인일),
    },
    {
      label: "보증금",
      value: formatPrice(l.보증금),
      sub: "협의 가능",
    },
    {
      label: "월세",
      value: formatPrice(l.월세, true),
      sub: l.관리비 ? `관리비 ${formatPrice(l.관리비)} 별도` : "관리비 별도 (협의)",
    },
    {
      label: "지정 주차",
      value: l.parking_count != null ? `법정 자주식 ${l.parking_count}대` : "—",
      sub:
        l.breakdown.주차.level === "⭐"
          ? "회원 동시 방문 수용 가능"
          : l.breakdown.주차.level === "✕"
          ? "방문 주차 보강 필요"
          : "방문 주차 협의 필요",
    },
  ];

  // 3x2 그리드
  return `
  <table class="info-grid">
    <tr>
      ${cells.slice(0, 3).map((c) => `
        <td>
          <div class="info-label">${escapeHtml(c.label)}</div>
          <div class="info-value">${c.value}</div>
          ${c.sub ? `<div class="info-sub">${escapeHtml(c.sub)}</div>` : ""}
        </td>`).join("")}
    </tr>
    <tr>
      ${cells.slice(3, 6).map((c) => `
        <td>
          <div class="info-label">${escapeHtml(c.label)}</div>
          <div class="info-value">${c.value}</div>
          ${c.sub ? `<div class="info-sub">${escapeHtml(c.sub)}</div>` : ""}
        </td>`).join("")}
    </tr>
  </table>`;
}

function buildBizAnalysisHTML(
  analysis: ListingAnalysis | undefined,
  industry: string
): string {
  // analysis 미제공 → 박스 skeleton만 (Phase 5에서 채워질 자리)
  if (!analysis) {
    return `
    <div class="biz-analysis">
      <div class="biz-analysis-header">○ ${escapeHtml(industry)} 운영 관점 분석</div>
      <div class="biz-analysis-headline" style="color:#94A3B8;font-style:italic;">산업 분석은 다음 검색 시 자동 생성됩니다 (Phase 5)</div>
    </div>`;
  }

  const points = analysis.points
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
    <div class="biz-analysis-header">○ ${escapeHtml(industry)} 운영 관점 분석</div>
    <div class="biz-analysis-headline">${escapeHtml(analysis.headline)}</div>
    ${points}
  </div>`;
}

function buildChecklistHTML(l: ScoredListing): string {
  const rows: { label: string; mark: "★" | "✓" | "△"; value: string }[] = [];

  // 1. 지역
  const regionMatch = l.지역 ?? "—";
  rows.push({ label: "지역", mark: "✓", value: regionMatch });

  // 2. 면적 — breakdown.면적
  const areaIcon =
    l.breakdown.면적.level === "⭐"
      ? "★"
      : l.breakdown.면적.level === "✕"
      ? "△"
      : "✓";
  rows.push({
    label: "면적",
    mark: areaIcon,
    value: `${l.공급_평?.toFixed(0) ?? "—"}평${l.breakdown.면적.level === "⭐" ? " (의뢰 정확)" : ""}`,
  });

  // 3. 준공
  const ageIcon = l.breakdown.연식.level === "⭐" ? "★" : "✓";
  const ageText2 = l.사용승인일
    ? `${new Date(l.사용승인일).getFullYear()}년${
        l.breakdown.연식.level === "⭐" ? " 신축" : ""
      }`
    : "—";
  rows.push({ label: "준공", mark: ageIcon, value: ageText2 });

  // 4. 임대료
  const rentIcon =
    l.breakdown.임대료.level === "⭐"
      ? "★"
      : l.breakdown.임대료.level === "✕"
      ? "△"
      : "✓";
  const monthlyTotal = (l.월세 ?? 0) + (l.관리비 ?? 0);
  rows.push({
    label: "임대료",
    mark: rentIcon,
    value: monthlyTotal > 0 ? `${formatPrice(monthlyTotal, true)}` : "—",
  });

  // 5. 인테리어 자유
  const newish = l.breakdown.연식.level === "⭐";
  rows.push({
    label: "인테리어",
    mark: newish ? "★" : "✓",
    value: newish ? "신축 첫 입주" : "협의 가능",
  });

  // 6. 방문주차
  const parkingIcon =
    l.breakdown.주차.level === "⭐"
      ? "★"
      : l.breakdown.주차.level === "✕"
      ? "△"
      : "✓";
  rows.push({
    label: "방문주차",
    mark: parkingIcon,
    value:
      l.parking_count != null
        ? `자주식 ${l.parking_count}대${parkingIcon === "△" ? " — 보강 필요" : ""}`
        : "—",
  });

  const rowsHTML = rows
    .map((r) => {
      const cls =
        r.mark === "★" ? "check-star" : r.mark === "△" ? "check-warn" : "check-ok";
      return `
      <tr>
        <td>${escapeHtml(r.label)}</td>
        <td><span class="${cls}">${r.mark} ${escapeHtml(r.value)}</span></td>
      </tr>`;
    })
    .join("");

  return `
  <div class="checklist">
    <div class="checklist-title">의뢰 조건 적합도 체크</div>
    <table class="checklist-table">${rowsHTML}</table>
  </div>`;
}

// ============================================================
// 다음 단계

function buildNextSteps(input: PDFGenInput, listings: ScoredListing[]) {
  const top = listings[0];
  const top3 = listings.slice(0, 3).map((l, i) => `${i + 1}번`).join(" → ");

  return {
    primary: nextWeekday(input.date, 2, "오후 2시 ~ 5시"),
    alt: `또는 ${nextWeekday(input.date, 3, "오전 10시 ~ 1시")}`,
    note:
      "다섯 곳 답사 동선을 미리 짜두겠습니다. 편하신 시간 알려주시면 일정 확정 후 매물별 부동산과 예약 잡고 다시 안내드리겠습니다.",
    priority: input.industry
      ? `${escapeHtml(input.industry)} 운영 관점 추천 순위: ${escapeHtml(top3)}${listings.length > 3 ? ` → ${listings.slice(3).map((_, i) => `${i + 4}번`).join(" → ")}` : ""}`
      : `추천 순위: ${escapeHtml(top3)}${listings.length > 3 ? ` → ${listings.slice(3).map((_, i) => `${i + 4}번`).join(" → ")}` : ""}`,
    checklistHTML: buildNextChecklistHTML(input),
    topTitle: top
      ? `매물 1번 (${escapeHtml(top.지역 ?? "—")} / ${top.공급_평?.toFixed(0) ?? "—"}평)`
      : "1순위",
    recommendation: top
      ? `${escapeHtml(top.지역 ?? "1순위")} ${top.공급_평?.toFixed(0) ?? "—"}평 매물이 종합 적합도 ${top.score}점으로 가장 높은 점수를 기록했습니다. ${
          top.breakdown.연식.level === "⭐" ? "<strong>신축 첫 입주로 인테리어 자유도가 100%</strong>이며, " : ""
        }${
          top.breakdown.주차.level === "⭐" ? "<strong>주차 안정성</strong>까지 확보된 매물입니다. " : ""
        }답사 1순위로 추천드립니다.`
      : "추천할 매물이 없습니다.",
    footer: input.industry
      ? `본 자료는 ${escapeHtml(input.industry)} 의뢰 조건 + 운영 특성을 종합 반영해 강남권 매물 ${listings.length}건을 분석한 결과입니다. 매물 정보는 네이버부동산 등록 광고 기준이며, 각 매물 상세 페이지의 매물번호·QR 코드를 통해 원본 매물 정보를 직접 확인하실 수 있습니다. 정확한 관리비·주차 보강 방안·입주 시점은 답사 시 현장에서 함께 확인합니다.`
      : `본 자료는 의뢰 조건에 부합하는 매물 ${listings.length}건을 적합도 점수순으로 정리한 결과입니다. 매물 정보는 네이버부동산 등록 광고 기준이며, 정확한 관리비·주차·입주 시점은 답사 시 현장에서 함께 확인합니다.`,
  };
}

function buildNextChecklistHTML(input: PDFGenInput): string {
  const items: string[] = [];
  if (input.industry === "결혼정보회사") {
    items.push("<strong>회원 동선</strong>: 1층 입구 → 엘리베이터 → 사무실 진입까지 회원 노출 동선");
    items.push("<strong>상담실 평면</strong>: 상담실 18개 배치 가능성 + 방음·시선 차단 가능 여부");
  }
  items.push("<strong>주차 보강</strong>: 빌딩 발렛 서비스, 인근 공영주차장 월정액 계약 가능성");
  items.push("<strong>VIP 동선 분리</strong>: 일반 회원 동선과 다른 입구·엘리베이터 활용 가능성");
  if (input.query.move_in_month) {
    items.push(`<strong>입주 시점</strong>: ${escapeHtml(input.query.move_in_month)} 인테리어 시공 + 입주 가능 일정`);
  } else {
    items.push("<strong>입주 시점</strong>: 인테리어 시공 + 입주 가능 일정");
  }
  items.push("<strong>임대 조건</strong>: 정확한 관리비 / 렌트프리 협의 / 원상복구 의무 면제");

  return items.map((it) => `<li>${it}</li>`).join("");
}

// ============================================================
// 포맷 helpers

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatPrice(n: number | null | undefined, withAlpha = false): string {
  if (n == null || n === 0) return "—";
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${eok.toFixed(eok % 1 === 0 ? 0 : 1).replace(/\.0$/, "")}억`;
  }
  const man = Math.round(n / 10_000);
  return `${man.toLocaleString()}만${withAlpha ? "+α" : ""}`;
}

function formatYearDot(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 7);
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}.${mm}`;
}

function ageText(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const age = new Date().getFullYear() - d.getFullYear();
  if (age <= 1) return "신축 1년차";
  if (age <= 5) return `신축 ${age}년차`;
  if (age <= 10) return `${age}년차`;
  return `${age}년 경과`;
}

function formatDateKo(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function buildDefaultSubtitle(industry: string | null, isPro: boolean): string {
  if (industry && isPro) return `${industry} 운영 관점 베스트 5건`;
  if (industry) return `${industry} 추천 매물 5건`;
  return "추천 매물 5건";
}

// 다음 주 N요일 (date 기준 +N일) — 간단한 텍스트만
function nextWeekday(base: Date, daysAhead: number, time: string): string {
  const d = new Date(base);
  d.setDate(d.getDate() + daysAhead);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `다음 ${wd}요일 (${d.getMonth() + 1}/${d.getDate()}) ${time}`;
}
