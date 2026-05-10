// 분석 리포트 PDF 생성 (Puppeteer headless Chrome)
//
// 사용 예:
//   const pdfBuffer = await generateReportPDF({
//     title: "강남 결혼식장 자리 분석",
//     query: "강남에 결혼식장으로 30평 이상...",
//     listings: [...],
//     industry: "결혼식장",
//   });
//
// Vercel serverless에선 puppeteer가 무거워 issue 가능 — Phase 2에서
// puppeteer-core + @sparticuz/chromium 으로 교체 권장.

import type { ScoredListing } from "./scoring";

export interface ReportData {
  title: string;
  query: string;
  industry: string | null;
  listings: ScoredListing[];
  generatedAt: Date;
  qrUrl?: string;
}

export function buildReportHtml(data: ReportData): string {
  const rows = data.listings
    .map(
      (l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${l.지역 ?? "—"}</td>
          <td>${l.공급_평?.toFixed(1) ?? "—"}평</td>
          <td>${l.해당층 ?? "—"}</td>
          <td>${l.보증금 ? formatKRW(l.보증금) : "—"}</td>
          <td>${l.월세 ? formatKRW(l.월세) : "—"}</td>
          <td>${l.추천업종 ?? "—"}</td>
          <td><strong>${(l.score * 100).toFixed(0)}점</strong></td>
        </tr>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.title)}</title>
  <style>
    body { font-family: -apple-system, "Apple SD Gothic Neo", sans-serif; padding: 40px; color: #1A2E4C; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    .meta { color: #64748B; font-size: 12px; margin-bottom: 24px; }
    .query { background: #F8FAFC; border-left: 3px solid #FF7849; padding: 12px 16px; font-style: italic; margin: 16px 0 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #E2E8F0; padding: 8px; text-align: left; }
    th { background: #1A2E4C; color: white; font-weight: bold; }
    tr:nth-child(even) td { background: #F8FAFC; }
    .footer { margin-top: 40px; font-size: 10px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <div class="meta">
    ${data.industry ? `업종: <strong>${escapeHtml(data.industry)}</strong> · ` : ""}
    매물 ${data.listings.length}건 · 생성 ${data.generatedAt.toLocaleString("ko-KR")}
  </div>
  <div class="query">${escapeHtml(data.query)}</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>지역</th><th>면적</th><th>층</th>
        <th>보증금</th><th>월세</th><th>추천업종</th><th>점수</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">부픽 · Bottle Inc. · 자동 생성 리포트</div>
</body>
</html>`;
}

function formatKRW(n: number): string {
  if (n >= 100_000_000)
    return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000)
    return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateReportPDF(data: ReportData): Promise<Buffer> {
  const html = buildReportHtml(data);

  // Puppeteer 동적 import — 빌드 시점에 chrome 다운로드 회피
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
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
