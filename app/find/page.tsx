"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  Suspense,
  FormEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TenantListingCard,
  type TenantListing,
} from "@/components/tenant/listing-card";
import { getAnonToken } from "@/lib/tenant/anon";

interface SearchResponse {
  query: string;
  parsed: {
    region?: { dong?: string | null };
    building_type?: string | null;
    transaction_type?: string | null;
  };
  results: TenantListing[];
  count: number;
  response_time_ms: number;
}

const POPULAR = [
  "강남 카페 30평 1억 이하",
  "역삼동 사무실 즉시입주",
  "신사동 1층 미용실",
  "압구정 의원 통유리",
  "잠실 학원 메인도로",
];

export default function FindPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FindInner />
    </Suspense>
  );
}

function PageSkeleton() {
  return <main className="min-h-screen bg-boopick-cream" />;
}

function FindInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastRanQuery = useRef<string>("");

  // URL ?q= 들어오면 자동 검색
  useEffect(() => {
    const q = sp.get("q") ?? "";
    if (q && q !== lastRanQuery.current) {
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    lastRanQuery.current = q;
    setLoading(true);
    setError(null);
    try {
      const anonToken =
        typeof window !== "undefined" ? getAnonToken() : undefined;
      const res = await fetch("/api/tenant/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, anon_token: anonToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "검색 실패");
      }
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    startTransition(() => {
      router.replace(`/find?q=${encodeURIComponent(query.trim())}`);
    });
    runSearch(query.trim());
  }

  function handlePopular(q: string) {
    setQuery(q);
    startTransition(() => {
      router.replace(`/find?q=${encodeURIComponent(q)}`);
    });
    runSearch(q);
  }

  return (
    <main className="min-h-screen bg-boopick-cream pb-12">
      {/* Sticky 검색 헤더 */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy hidden sm:inline">
              부픽
            </span>
          </Link>
          <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="강남 카페 30평 1억 이하"
              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-boopick-orange"
            />
            <button
              type="submit"
              disabled={loading || isPending || !query.trim()}
              className="h-10 px-4 rounded-lg bg-boopick-navy hover:bg-boopick-navy/90 text-white text-sm font-semibold disabled:opacity-50"
            >
              찾기
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* 인기 검색어 (결과 없거나 비었을 때만) */}
        {!response && !loading && !error && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">이런 식으로 검색해보세요</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((q) => (
                <button
                  key={q}
                  onClick={() => handlePopular(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-boopick-orange hover:text-boopick-orange text-slate-600"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <div className="inline-block w-7 h-7 border-2 border-boopick-orange border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">AI가 매물을 찾고 있습니다…</p>
            </CardContent>
          </Card>
        )}

        {/* 에러 */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-red-700">
                ❌ 검색을 진행할 수 없습니다
              </p>
              <p className="text-xs text-red-600 mt-1 break-words">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 결과 */}
        {response && !loading && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <strong className="text-boopick-navy">{response.count}개</strong>{" "}
                매물 매칭
                {response.parsed.region?.dong && (
                  <>
                    {" · "}
                    <Badge variant="outline" className="ml-1">
                      {response.parsed.region.dong}
                    </Badge>
                  </>
                )}
                {response.parsed.building_type && (
                  <Badge variant="outline" className="ml-1">
                    {response.parsed.building_type}
                  </Badge>
                )}
              </p>
              <span className="text-xs text-slate-400">
                {(response.response_time_ms / 1000).toFixed(1)}s
              </span>
            </div>

            {response.count === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-base font-semibold text-boopick-navy mb-2">
                    조건에 맞는 매물이 없습니다
                  </p>
                  <p className="text-sm text-slate-500 mb-5">
                    조건을 더 넓히거나, 다른 표현으로 시도해보세요.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {POPULAR.slice(0, 3).map((q) => (
                      <button
                        key={q}
                        onClick={() => handlePopular(q)}
                        className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-boopick-orange"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {response.results.map((listing) => (
                  <TenantListingCard
                    key={listing.listing_id}
                    listing={listing}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
