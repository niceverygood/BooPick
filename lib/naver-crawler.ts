// 어드민 전용 — 네이버부동산 크롤러
//
// 동작:
//   1. Puppeteer 로 사용자가 준 검색 URL 을 직접 열고
//   2. 페이지가 첫 매물 리스트를 호출하는 /api/articles 요청을 `request` 이벤트에서 가로채
//      해당 요청의 URL 과 Authorization Bearer JWT 헤더를 캡처
//   3. 캡처된 토큰으로 page.evaluate 안에서 page=1..N 명시적 fetch 반복
//      → 응답 body 캐시/preflight 이슈 없이 결정론적으로 수집
//   4. 수집된 article 들을 V3 ParsedListing 형태로 정규화
//
// Puppeteer 런처는 lib/pdf-generator.ts 의 패턴 재사용 (Vercel: @sparticuz/chromium).

import type { ParsedListing } from "./excel-parser";

const ALLOWED_HOSTS = new Set([
  "new.land.naver.com",
  "m.land.naver.com",
  "land.naver.com",
]);

export interface CrawlOptions {
  url: string;
  /** 최대 페이지네이션 수 (1페이지 ≈ 20건). 기본 5. */
  maxPages?: number;
  /**
   * URL 의 ms 좌표가 redirect 로 엉뚱한 지역으로 잡힐 때 강제할 cortarNo.
   * 예: 강남구 역삼1동 1168010100, 삼성2동 1168010500.
   * 지정하면 토큰만 URL 페이지에서 캡처하고 articles 호출 시 cortarNo 를 이걸로 교체.
   */
  cortarNoOverride?: string;
  timeoutMs?: number;
}

export interface CrawlSummary {
  url: string;
  totalFetched: number;
  pagesFetched: number;
  durationMs: number;
  cortarNo?: string | null;
}

export interface CrawlResult {
  summary: CrawlSummary;
  listings: ParsedListing[];
  rawArticles: NaverArticle[];
}

// 네이버부동산 articles 응답 스키마 (실제 호출에서 관찰된 주요 필드)
export interface NaverArticle {
  articleNo: string;
  articleName?: string;
  articleStatus?: string;
  realEstateTypeCode?: string;
  realEstateTypeName?: string;
  tradeTypeCode?: string;
  tradeTypeName?: string;
  verificationTypeCode?: string;
  floorInfo?: string; // "3/15"
  rentPrc?: number; // 월세 (만원 단위)
  dealOrWarrantPrc?: string; // "1억 5,000" or "5,000"
  area1?: number; // 공급 m²
  area2?: number; // 전용 m²
  direction?: string;
  articleConfirmYmd?: string; // 매물 확인일 YYYYMMDD
  representativeImgUrl?: string;
  articleFeatureDesc?: string;
  tagList?: string[];
  buildingName?: string;
  sameAddrCnt?: number;
  sameAddrDirectCnt?: number;
  cpid?: string;
  cpName?: string;
  cpPcArticleUrl?: string;
  realtorName?: string;
  detailAddress?: string;
  dongName?: string;
}

interface RawArticlesResponse {
  articleList?: NaverArticle[];
  isMoreData?: boolean;
}

export async function crawlNaver(opts: CrawlOptions): Promise<CrawlResult> {
  const { url, maxPages = 5, timeoutMs = 45_000, cortarNoOverride } = opts;
  validateUrl(url);

  const startedAt = Date.now();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );

    // 첫 articles 요청에서 URL + Authorization 캡처
    let capturedAuth: string | null = null;
    let capturedArticlesUrl: string | null = null;

    page.on("request", (req) => {
      const u = req.url();
      if (capturedArticlesUrl) return;
      if (!isArticlesEndpoint(u)) return;
      const auth = req.headers()["authorization"];
      if (!auth) return;
      capturedArticlesUrl = u;
      capturedAuth = auth;
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
    // SPA가 articles 호출까지 가는 데 약간의 시간 필요
    await sleep(2500);

    // 스크롤 한 번 — 매물 리스트 패널을 열어 articles 호출 트리거
    await page.evaluate(() => window.scrollBy(0, 2000)).catch(() => {});
    await sleep(1500);

    if (!capturedAuth || !capturedArticlesUrl) {
      throw new Error(
        "네이버 매물 API 호출을 가로채지 못했습니다. URL이 매물 검색 페이지인지 확인하세요."
      );
    }

    const baseUrl = cortarNoOverride
      ? setQueryParam(capturedArticlesUrl, "cortarNo", cortarNoOverride)
      : capturedArticlesUrl;
    const cortarNo = extractCortarNo(baseUrl);

    // 토큰 + base URL로 명시적 페이지네이션
    const collected = new Map<string, NaverArticle>();
    let pagesFetched = 0;
    for (let p = 1; p <= maxPages; p++) {
      const pageUrl = setQueryParam(baseUrl, "page", String(p));
      const json = await page
        .evaluate(
          async ({ u, a }: { u: string; a: string }) => {
            const res = await fetch(u, {
              headers: { Authorization: a, Accept: "application/json" },
              credentials: "include",
            });
            const status = res.status;
            const text = await res.text();
            return { status, text };
          },
          { u: pageUrl, a: capturedAuth }
        )
        .catch((err: unknown) => {
          return {
            status: -1,
            text: err instanceof Error ? err.message : String(err),
          };
        });

      if (json.status !== 200) {
        if (p === 1) {
          throw new Error(
            `articles API ${json.status}: ${json.text.slice(0, 200)}`
          );
        }
        // 중간 페이지 실패면 거기서 중단
        break;
      }

      let parsed: RawArticlesResponse;
      try {
        parsed = JSON.parse(json.text) as RawArticlesResponse;
      } catch {
        break;
      }

      pagesFetched += 1;
      const list = parsed.articleList ?? [];
      for (const a of list) {
        if (!a?.articleNo) continue;
        if (!collected.has(a.articleNo)) collected.set(a.articleNo, a);
      }

      if (!parsed.isMoreData || list.length === 0) break;
      // 매너 — 페이지 간 간격
      await sleep(400);
    }

    const allArticles = Array.from(collected.values());
    const listings: ParsedListing[] = allArticles.map(toParsedListing);

    return {
      summary: {
        url,
        totalFetched: collected.size,
        pagesFetched,
        durationMs: Date.now() - startedAt,
        cortarNo,
      },
      listings,
      rawArticles: allArticles,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ============================================================
// URL 검증 & 유틸

function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("올바른 URL 형식이 아닙니다");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("http/https URL 만 허용됩니다");
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `허용되지 않은 호스트: ${parsed.hostname} (네이버부동산 URL 만 가능)`
    );
  }
}

function isArticlesEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    if (!ALLOWED_HOSTS.has(u.hostname)) return false;
    return /\/api\/articles(\/|\?|$)/.test(u.pathname + u.search);
  } catch {
    return false;
  }
}

function setQueryParam(url: string, key: string, value: string): string {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function extractCortarNo(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("cortarNo");
  } catch {
    return null;
  }
}

// ============================================================
// Puppeteer 런처 — pdf-generator 와 동일 패턴

async function launchBrowser() {
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    return puppeteerCore.default.launch({
      args: [...chromium.args, "--font-render-hinting=none"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// ============================================================
// 정규화 — NaverArticle → ParsedListing (V3 listings 스키마 호환)

function toParsedListing(a: NaverArticle): ParsedListing {
  const [haedang, jeonche] = splitFloorInfo(a.floorInfo);
  const deposit = parseDealOrWarrantPrice(a.dealOrWarrantPrc);
  const monthly = parseRentPrc(a.rentPrc);
  // dongName 또는 detailAddress 에서만 신뢰. 다른 자유 텍스트(설명·중개사명)는
  // "사거리" → "~리" 같은 false-positive 가 잦아 fallback 에서 제외.
  const region =
    nonEmpty(a.dongName) ?? extractDongFromAddress(a.detailAddress) ?? null;
  const brief = a.articleFeatureDesc?.trim() ?? null;
  const tags = a.tagList?.join(", ") ?? "";
  const desc = brief || tags ? [brief, tags].filter(Boolean).join(" | ") : null;

  return {
    article_no: a.articleNo,
    지역: region,
    공급_m2: typeof a.area1 === "number" ? a.area1 : null,
    전용_m2: typeof a.area2 === "number" ? a.area2 : null,
    해당층: haedang,
    전체층: jeonche,
    보증금: deposit,
    월세: monthly,
    관리비: null,
    현재업종: a.realEstateTypeName ?? null,
    추천업종: null,
    간략설명: brief,
    설명: desc,
    주소: a.detailAddress ?? null,
    사용승인일: null, // 상세 페이지에서만 노출 — 추후 확장
    중개사무소명: a.realtorName ?? a.cpName ?? null,
    raw_data: { source: "naver", ...a } as Record<string, unknown>,
  };
}

function splitFloorInfo(info?: string): [string | null, string | null] {
  if (!info) return [null, null];
  const m = info.match(/^(.+?)\/(.+?)$/);
  if (!m) return [info, null];
  return [m[1].trim(), m[2].trim()];
}

// "1억", "1억 5,000", "5,000", "3억 200" → 원 단위 정수 (만원 단위 × 10,000)
function parseDealOrWarrantPrice(s?: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, "");
  if (!cleaned) return null;
  let eok = 0;
  let man = 0;
  const eokMatch = cleaned.match(/(\d+(?:[,.]\d+)?)억/);
  if (eokMatch) eok = parseFloat(eokMatch[1].replace(/,/g, ""));
  const manMatch = cleaned.replace(/\d+(?:[,.]\d+)?억/, "").match(/(\d[\d,]*)/);
  if (manMatch) man = parseInt(manMatch[1].replace(/,/g, ""), 10) || 0;
  if (!eok && !man) return null;
  const total = Math.round(eok * 100_000_000 + man * 10_000);
  return total > 0 ? total : null;
}

// rentPrc: number(만원 단위) → 원 단위
function parseRentPrc(n?: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 10_000);
}

// "서울특별시 강남구 삼성동 ..." → "삼성동"
//   - "동" 으로 끝나고 단어 경계가 명확한 경우만. "사거리" 같은 노이즈 차단.
function extractDongFromAddress(addr?: string | null): string | null {
  if (!addr) return null;
  // 행정구역 단위 + 단어 경계 (공백/숫자/문장 끝/구두점)
  const m = addr.match(/([가-힣]{2,}(?:동|가|읍|면))(?:[\s,0-9.]|$)/);
  return m ? m[1] : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function nonEmpty(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}
