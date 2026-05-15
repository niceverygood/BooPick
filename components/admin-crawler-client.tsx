"use client";

// 어드민 전용 네이버부동산 크롤러 UI
//
// 흐름:
//   1. 검색 URL 입력 (new.land.naver.com)
//   2. "미리보기" → /api/admin/crawler { action: "preview" }
//   3. 결과 테이블 확인
//   4. 데이터셋 이름 입력 + "데이터셋으로 저장" → /api/admin/crawler { action: "save" }

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PreviewListing {
  article_no: string | null;
  지역: string | null;
  공급_m2: number | null;
  전용_m2: number | null;
  해당층: string | null;
  전체층: string | null;
  보증금: number | null;
  월세: number | null;
  현재업종: string | null;
  간략설명: string | null;
  주소: string | null;
  중개사무소명: string | null;
}

interface CrawlSummary {
  url: string;
  totalFetched: number;
  pagesObserved: number;
  durationMs: number;
}

export function AdminCrawlerClient() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [cortarNoOverride, setCortarNoOverride] = useState("");
  const [name, setName] = useState("");
  const [listings, setListings] = useState<PreviewListing[]>([]);
  const [summary, setSummary] = useState<CrawlSummary | null>(null);
  const [savedDatasetId, setSavedDatasetId] = useState<string | null>(null);

  const [previewBusy, setPreviewBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function runPreview() {
    if (!url.trim()) {
      setErr("URL을 입력하세요");
      return;
    }
    setErr(null);
    setSavedDatasetId(null);
    setPreviewBusy(true);
    try {
      const res = await fetch("/api/admin/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          url: url.trim(),
          maxPages,
          cortarNoOverride: cortarNoOverride.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? "미리보기 실패");
      }
      setListings(data.listings ?? []);
      setSummary(data.summary ?? null);
      if ((data.listings ?? []).length === 0) {
        setErr("수집된 매물이 없습니다. URL을 다시 확인하세요.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "미리보기 실패");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function runSave() {
    if (listings.length === 0) {
      setErr("먼저 미리보기로 매물을 수집하세요");
      return;
    }
    if (!name.trim()) {
      setErr("데이터셋 이름을 입력하세요");
      return;
    }
    setErr(null);
    setSaveBusy(true);
    try {
      const res = await fetch("/api/admin/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          url: url.trim(),
          name: name.trim(),
          maxPages,
          cortarNoOverride: cortarNoOverride.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? "저장 실패");
      }
      setSavedDatasetId(data.dataset_id ?? null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div>
            <Label htmlFor="crawler-url" className="text-sm font-semibold">
              네이버부동산 검색 URL
            </Label>
            <Input
              id="crawler-url"
              placeholder="https://new.land.naver.com/offices?ms=37.5,127.04,16&a=SG:SMS&b=B1&e=RETAIL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              브라우저에서 네이버부동산 지도 검색 후 주소창 URL을 그대로
              붙여넣으세요. (new.land.naver.com / m.land.naver.com 만 허용)
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Label htmlFor="max-pages" className="text-sm">
              페이지 수
            </Label>
            <Input
              id="max-pages"
              type="number"
              min={1}
              max={10}
              value={maxPages}
              onChange={(e) =>
                setMaxPages(Math.max(1, Math.min(10, Number(e.target.value))))
              }
              className="w-20"
            />
            <span className="text-xs text-slate-500">
              1페이지 ≈ 20건 · 최대 10
            </span>
          </div>

          <div>
            <Label htmlFor="cortar-no" className="text-sm">
              cortarNo (선택 · 좌표 redirect 우회용)
            </Label>
            <Input
              id="cortar-no"
              placeholder="예: 1168010100 (강남구 역삼1동), 1168010500 (삼성2동)"
              value={cortarNoOverride}
              onChange={(e) =>
                setCortarNoOverride(e.target.value.replace(/[^\d]/g, ""))
              }
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              URL 의 좌표가 엉뚱한 지역으로 잡힐 때만 입력 (행정동 단위 8~10자리
              숫자). 비워두면 URL 의 cortarNo 사용.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={runPreview}
              disabled={previewBusy || saveBusy}
              className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
            >
              {previewBusy ? "수집 중…" : "미리보기"}
            </Button>
            {summary && (
              <span className="text-xs text-slate-500">
                {summary.totalFetched}건 · {summary.pagesObserved}회 응답 ·{" "}
                {(summary.durationMs / 1000).toFixed(1)}초
              </span>
            )}
          </div>

          {err && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-xs border border-red-200">
              {err}
            </div>
          )}
        </CardContent>
      </Card>

      {listings.length > 0 && (
        <>
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <Label htmlFor="ds-name" className="text-sm font-semibold">
                    데이터셋 이름
                  </Label>
                  <Input
                    id="ds-name"
                    placeholder="예: 강남구 사무실 2026-05 (네이버)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button
                  onClick={runSave}
                  disabled={saveBusy || previewBusy}
                  className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
                >
                  {saveBusy ? "저장 중…" : `${listings.length}건 데이터셋으로 저장`}
                </Button>
              </div>
              {savedDatasetId && (
                <div className="p-3 rounded-md bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                  저장 완료. 데이터셋 ID: {savedDatasetId} — 대시보드에서
                  분석 가능합니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-500 uppercase">
                      <th className="text-left py-2.5 px-3">매물번호</th>
                      <th className="text-left py-2.5 px-3">지역</th>
                      <th className="text-left py-2.5 px-3">업종</th>
                      <th className="text-right py-2.5 px-3">공급/전용</th>
                      <th className="text-center py-2.5 px-3">층</th>
                      <th className="text-right py-2.5 px-3">보증금</th>
                      <th className="text-right py-2.5 px-3">월세</th>
                      <th className="text-left py-2.5 px-3">중개사</th>
                      <th className="text-left py-2.5 px-3">메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.slice(0, 200).map((l) => (
                      <tr
                        key={l.article_no ?? Math.random()}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                          {l.article_no ? (
                            <a
                              href={`https://new.land.naver.com/?articleNo=${l.article_no}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-boopick-orange hover:underline"
                            >
                              {l.article_no}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {l.지역 ?? "—"}
                        </td>
                        <td className="py-2 px-3">
                          {l.현재업종 ? (
                            <Badge className="bg-slate-100 text-slate-700 border-none text-[10px]">
                              {l.현재업종}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                          {formatArea(l.공급_m2)} / {formatArea(l.전용_m2)}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {l.해당층 ?? "—"}
                          {l.전체층 ? `/${l.전체층}` : ""}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                          {formatWon(l.보증금)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                          {formatWon(l.월세)}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {l.중개사무소명 ?? "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-500 max-w-[260px] truncate">
                          {l.간략설명 ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listings.length > 200 && (
                  <div className="py-2 text-center text-[11px] text-slate-400">
                    … 표는 상위 200건만 표시 (저장 시 전체 {listings.length}건
                    반영)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function formatWon(n: number | null): string {
  if (n == null || n === 0) return "—";
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${eok.toFixed(eok % 1 === 0 ? 0 : 1).replace(/\.0$/, "")}억`;
  }
  return `${Math.round(n / 10_000).toLocaleString()}만`;
}

function formatArea(m2: number | null): string {
  if (m2 == null) return "—";
  const pyeong = m2 / 3.3058;
  return `${pyeong.toFixed(0)}평`;
}
