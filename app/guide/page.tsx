import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "강남권 상가·사무실 가이드 | 부픽",
  description:
    "강남권 상가·사무실 매물 분석 + 상권·추천업종 가이드. 카페·미용실·사무실 창업 자리 추천.",
};

interface Guide {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  topic: string | null;
  hashtags: string[] | null;
  view_count: number;
  published_at: string | null;
}

async function fetchGuides(): Promise<Guide[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guides")
    .select(
      "id, slug, title, meta_description, topic, hashtags, view_count, published_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return (data ?? []) as Guide[];
}

export default async function GuidesIndexPage() {
  const guides = await fetchGuides();

  return (
    <main className="min-h-screen bg-boopick-cream">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy">부픽</span>
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">매물 가이드</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          강남권 상가·사무실 가이드
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          매물별 상권 분석·추천 업종·주의사항. AI가 매일 새로 작성합니다.
        </p>

        {guides.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-8 text-center text-slate-500">
              <p className="text-sm">아직 게시된 가이드가 없습니다.</p>
              <p className="text-xs mt-2 text-slate-400">
                매일 자정 cron으로 30건씩 자동 생성됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <Link
                key={g.id}
                href={`/guide/${g.slug}`}
                className="block group"
                prefetch={false}
              >
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="p-5">
                    {g.topic && (
                      <Badge variant="outline" className="mb-2">
                        {g.topic}
                      </Badge>
                    )}
                    <h2 className="text-base font-bold text-boopick-navy line-clamp-2 leading-snug">
                      {g.title}
                    </h2>
                    {g.meta_description && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {g.meta_description}
                      </p>
                    )}
                    {g.hashtags && g.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {g.hashtags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-boopick-cream text-slate-500 border border-slate-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="px-4 py-8 mt-8 border-t border-slate-200 text-center text-xs text-slate-500">
        Bottle Inc. · 부픽 — 강남권 상가·사무실 임차인 매칭 인프라
      </footer>
    </main>
  );
}
