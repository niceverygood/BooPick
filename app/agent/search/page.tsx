"use client";

import { useState, useEffect, useRef, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  agency_id: string;
  address: string;
  dong: string | null;
  building_name: string | null;
  area_pyeong: number | null;
  floor: number | null;
  building_type: string | null;
  transaction_type: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  short_description: string | null;
  ai_tags: {
    industries?: string[];
    facilities?: string[];
    location_features?: string[];
    condition?: string[];
  } | null;
  similarity: number;
}

interface SearchResponse {
  query: string;
  parsed: unknown;
  results: SearchResult[];
  count: number;
  response_time_ms: number;
}

const EXAMPLES = [
  "신사동 25평 카페자리 보증금 1억 이하",
  "강남 사무실 30평 즉시입주",
  "역삼동 1층 미용실",
  "도산공원 카페 테라스",
  "압구정 1층 카페자리",
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-boopick-cream" />}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const sp = useSearchParams();
  const initialQuery = sp.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  // URL ?q= 으로 들어왔을 때 1회 자동 검색
  useEffect(() => {
    if (autoRan.current) return;
    if (initialQuery && initialQuery.trim().length > 0) {
      autoRan.current = true;
      runSearch(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error +
            (data.detail ? ` — ${data.detail}` : "") || "검색 실패"
        );
      }
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    runSearch(query.trim());
  }

  function handleExample(example: string) {
    setQuery(example);
    runSearch(example);
  }

  return (
    <main className="min-h-screen bg-boopick-cream">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-boopick-navy">부픽</span>
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">중개사 백오피스 · 매물 검색</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          ℹ️ 이 화면은 <strong>중개사용 내부 검색</strong>입니다. 임차인 검색은{" "}
          <Link href="/" className="underline text-boopick-orange">홈</Link> 또는 곧 출시될 <code>/find</code>에서.
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="신사동 25평 카페자리 보증금 1억 이하"
              className="flex-1 h-12 text-base"
              disabled={loading}
              autoFocus
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-6 bg-boopick-navy hover:bg-boopick-navy/90"
            >
              {loading ? "검색 중…" : "검색"}
            </Button>
          </div>
        </form>

        {/* Examples */}
        {!response && !loading && !error && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">예시 검색어 — 클릭하면 바로 실행</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-boopick-orange transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center text-slate-500">
              <div className="inline-block w-6 h-6 border-2 border-boopick-orange border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">AI 파싱 + 매물 검색 중… (보통 5~15초)</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-red-700 mb-1">
                ❌ 검색 실패
              </p>
              <p className="text-xs text-red-600 break-words">{error}</p>
              <p className="text-xs text-red-500 mt-3">
                Vercel 환경변수(NEXT_PUBLIC_SUPABASE_URL / ANTHROPIC_API_KEY /
                OPENAI_API_KEY)가 설정됐는지, /api/admin/seed로 매물이 등록됐는지
                확인해 보세요.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {response && (
          <>
            <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
              <p>
                <strong className="text-boopick-navy">{response.count}건</strong>{" "}
                매칭 ·{" "}
                {response.response_time_ms < 1000
                  ? `${response.response_time_ms}ms`
                  : `${(response.response_time_ms / 1000).toFixed(1)}s`}
              </p>
              <button
                onClick={() => {
                  setResponse(null);
                  setQuery("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                지우기 ✕
              </button>
            </div>

            {response.count === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-600">
                    조건에 맞는 매물이 없습니다.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    조건을 더 넓혀 보시거나, 데모 환경의 경우{" "}
                    <code className="px-1 py-0.5 bg-slate-100 rounded">
                      POST /api/admin/seed
                    </code>
                    로 매물을 먼저 등록하세요.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {response.results.map((r, idx) => (
                <ListingCard key={r.id} listing={r} rank={idx + 1} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ListingCard({
  listing,
  rank,
}: {
  listing: SearchResult;
  rank: number;
}) {
  const tags = listing.ai_tags ?? {};
  const allTags = [
    ...(tags.industries ?? []),
    ...(tags.facilities ?? []),
    ...(tags.location_features ?? []),
    ...(tags.condition ?? []),
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 mt-0.5">
            <span className="text-xs text-slate-400">#{rank}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {(listing.similarity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-base text-boopick-navy">
                {listing.short_description || listing.address}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {[
                listing.dong,
                listing.building_type,
                listing.area_pyeong ? `${listing.area_pyeong}평` : null,
                listing.floor != null ? `${listing.floor}층` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {formatPrice(listing)}
            </p>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {allTags.slice(0, 6).map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-xs font-normal"
                  >
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2 truncate">
              📍 {listing.address}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPrice(l: SearchResult): string {
  const dep = l.deposit;
  const rent = l.monthly_rent;
  const parts: string[] = [];
  if (l.transaction_type) parts.push(l.transaction_type);
  if (dep != null) parts.push(`보증금 ${formatKRW(dep)}`);
  if (rent != null && rent > 0) parts.push(`월세 ${formatKRW(rent)}`);
  return parts.join(" · ");
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) {
    const man = n / 10_000;
    return man % 1 === 0 ? `${man}만` : `${man.toFixed(0)}만`;
  }
  return n.toLocaleString();
}
