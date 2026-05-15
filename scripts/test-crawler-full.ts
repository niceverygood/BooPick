// 본격 크롤러 통합 테스트
//   1) 다양한 지역 cortarNo 로 매물 수집
//   2) 가격 파서 corner case (인라인)
//   3) 다중 페이지 페이지네이션 (isMoreData=true 케이스)

import { crawlNaver } from "../lib/naver-crawler";

const ENTRY_URL =
  "https://new.land.naver.com/offices?ms=37.5079,127.0617,17&a=SG:SMS&b=B1&e=RETAIL";

const REGIONS: Array<{ name: string; cortarNo: string }> = [
  { name: "강남구 역삼1동", cortarNo: "1168010100" },
  { name: "강남구 청담동", cortarNo: "1168010400" },
  { name: "강남구 삼성1동", cortarNo: "1168010600" },
  { name: "서초구 양재1동", cortarNo: "1165011300" },
];

(async () => {
  for (const r of REGIONS) {
    console.log(`\n══════════ ${r.name} (${r.cortarNo}) ══════════`);
    const t0 = Date.now();
    try {
      const result = await crawlNaver({
        url: ENTRY_URL,
        cortarNoOverride: r.cortarNo,
        maxPages: 5,
      });
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `매물 ${result.listings.length}건 / 페이지 ${result.summary.pagesFetched} / ${dt}초`
      );

      // 가격 파싱 분포 — 보증금/월세 null/존재
      const withDeposit = result.listings.filter((l) => l.보증금 != null).length;
      const withRent = result.listings.filter((l) => l.월세 != null).length;
      const withArea = result.listings.filter((l) => l.공급_m2 != null).length;
      const withFloor = result.listings.filter((l) => l.해당층 != null).length;
      const withRegion = result.listings.filter((l) => l.지역 != null).length;
      console.log(
        `필드 채움률 — 보증금:${withDeposit} 월세:${withRent} 면적:${withArea} 층:${withFloor} 지역:${withRegion}`
      );

      // dealOrWarrantPrc 패턴 샘플 (3건)
      const samplePrices = result.rawArticles
        .slice(0, 3)
        .map(
          (a) =>
            `[${a.tradeTypeName}] ${a.dealOrWarrantPrc ?? "-"} (월세: ${
              a.rentPrc ?? "-"
            })`
        );
      console.log("가격 샘플:", samplePrices.join(" | "));
    } catch (err) {
      console.error(`❌ 실패:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n══════════ 통합 테스트 완료 ══════════");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
