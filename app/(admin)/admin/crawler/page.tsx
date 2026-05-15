import { AdminCrawlerClient } from "@/components/admin-crawler-client";

export const dynamic = "force-dynamic";

export default function AdminCrawlerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-boopick-navy">
          네이버부동산 크롤러
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          어드민 전용 — 네이버부동산 검색 결과를 직접 데이터셋으로 가져옵니다.
        </p>
        <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">⚠️ 내부 분석용 도구</p>
          <p>
            네이버부동산 자체 검색 결과를 가공해 분석에 사용합니다. 일반 사용자
            UI 에 노출되지 않으며, 결과를 외부 영업 자료로 재배포하지 마세요.
            과도한 호출은 IP 차단으로 이어질 수 있어 스크롤 횟수는 4 안팎이
            적당합니다.
          </p>
        </div>
      </div>

      <AdminCrawlerClient />
    </div>
  );
}
