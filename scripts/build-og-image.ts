// 부픽 OG image 생성 (1200x630)
//
// Twitter/카톡/페이스북 링크 공유 시 카드 이미지로 사용.
// HTML 템플릿 → Puppeteer screenshot → public/img/og-image.png 출력.
//
// 실행:
//   npx tsx scripts/build-og-image.ts

import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "img", "og-image.png");

async function buildHTML(): Promise<string> {
  // 아이콘을 base64 로 인라인 — 외부 자원 의존 제거
  const iconBuf = await readFile(join(ROOT, "public", "img", "icon-512.png"));
  const iconB64 = `data:image/png;base64,${iconBuf.toString("base64")}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1200px;
    height: 630px;
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
                 'Pretendard', 'Noto Sans KR', sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #1A2E4C;
  }
  body {
    /* 네이비 그라디언트 배경 + 우측 cream glow */
    background:
      radial-gradient(circle at 88% 110%, rgba(255, 120, 73, 0.18), transparent 50%),
      radial-gradient(circle at 16% -10%, rgba(255, 249, 245, 0.10), transparent 45%),
      linear-gradient(180deg, #243C60 0%, #1A2E4C 100%);
    color: #FFFAF3;
    display: grid;
    grid-template-columns: 1fr 380px;
    align-items: center;
    padding: 60px 80px;
    gap: 60px;
    position: relative;
    overflow: hidden;
  }

  /* 좌측 텍스트 */
  .left .badge {
    display: inline-block;
    padding: 8px 18px;
    border-radius: 999px;
    background: rgba(255, 120, 73, 0.18);
    color: #FF8E61;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.4px;
    margin-bottom: 30px;
  }
  .left h1 {
    font-size: 76px;
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -2px;
    margin-bottom: 24px;
  }
  .left h1 em {
    font-style: normal;
    color: #FF8E61;
  }
  .left p {
    font-size: 24px;
    line-height: 1.45;
    color: rgba(255, 250, 243, 0.78);
    font-weight: 500;
    max-width: 680px;
  }

  /* 하단 푸터 */
  .footer {
    position: absolute;
    left: 80px;
    bottom: 50px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 18px;
    color: rgba(255, 250, 243, 0.55);
    font-weight: 500;
  }
  .footer .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 250, 243, 0.35);
  }

  /* 우측 아이콘 */
  .right {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .right img {
    width: 360px;
    height: 360px;
    border-radius: 80px;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.4),
      0 10px 24px rgba(0, 0, 0, 0.25);
  }
</style>
</head>
<body>
  <div class="left">
    <span class="badge">PROPERTY ANALYTICS SAAS</span>
    <h1>매물 <em>40,000건</em><br/>30초에 분석</h1>
    <p>공인중개사 보유 매물 데이터를 의뢰 조건에 맞춰<br/>점수화하고 PDF 리포트로 출력하는 SaaS 도구.</p>
  </div>
  <div class="right">
    <img src="${iconB64}" alt="부픽" />
  </div>
  <div class="footer">
    <span>부픽 · BooPick</span>
    <span class="dot"></span>
    <span>boo-pick.vercel.app</span>
  </div>
</body>
</html>`;
}

(async () => {
  console.log("[og] building HTML…");
  const html = await buildHTML();

  console.log("[og] launching chromium…");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buf = await page.screenshot({ type: "png", fullPage: false });
    await writeFile(OUT, buf);
    console.log(`[og] wrote ${OUT} (${(buf.length / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("[og] failed:", e);
  process.exit(1);
});
