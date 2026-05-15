// 어드민 크롤러 직접 호출 테스트
//
// 실행:
//   npx tsx scripts/test-naver-crawler.ts
//   npx tsx scripts/test-naver-crawler.ts "https://new.land.naver.com/..."

import { crawlNaver } from "../lib/naver-crawler";

const DEFAULT_URL =
  "https://new.land.naver.com/offices?ms=37.5079,127.0617,16&a=SG:SMS&b=B1&e=RETAIL";

const url = process.argv[2] ?? DEFAULT_URL;
const pages = process.argv[3] ? Number(process.argv[3]) : 3;
const cortarOverride = process.argv[4]; // 선택

(async () => {
  console.log(`[test] URL     : ${url}`);
  console.log(`[test] pages   : ${pages}`);
  console.log(`[test] cortarNo: ${cortarOverride ?? "(URL 기반)"}\n`);

  const t0 = Date.now();
  const result = await crawlNaver({
    url,
    maxPages: pages,
    cortarNoOverride: cortarOverride,
  });
  const t1 = Date.now();

  console.log("─── Summary ───");
  console.log(result.summary);
  console.log(`총 ${result.listings.length}건 / ${(t1 - t0) / 1000}초\n`);

  console.log("─── 상위 5건 (정규화) ───");
  for (const l of result.listings.slice(0, 5)) {
    console.log({
      article_no: l.article_no,
      지역: l.지역,
      공급_m2: l.공급_m2,
      전용_m2: l.전용_m2,
      해당층: l.해당층,
      전체층: l.전체층,
      보증금: l.보증금,
      월세: l.월세,
      현재업종: l.현재업종,
      중개사무소명: l.중개사무소명,
      간략설명: l.간략설명?.slice(0, 60) ?? null,
    });
  }

  console.log("\n─── 원본 article 1건 (raw 키 확인용) ───");
  if (result.rawArticles[0]) {
    const keys = Object.keys(result.rawArticles[0]).sort();
    console.log("keys:", keys.join(", "));
    console.log("sample:", JSON.stringify(result.rawArticles[0], null, 2).slice(0, 1200));
  }
})().catch((e) => {
  console.error("[test] FAILED:", e);
  process.exit(1);
});
