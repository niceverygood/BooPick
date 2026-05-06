import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/server";
import {
  TenantListingCard,
  type TenantListing,
} from "@/components/tenant/listing-card";

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface Guide {
  id: string;
  slug: string;
  title: string;
  body: string;
  meta_description: string | null;
  topic: string | null;
  hero_query: string | null;
  hashtags: string[] | null;
  listing_id: string | null;
  view_count: number;
  published_at: string | null;
}

interface PageProps {
  params: { slug: string };
}

async function fetchGuide(slug: string): Promise<Guide | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guides")
    .select(
      "id, slug, title, body, meta_description, topic, hero_query, hashtags, listing_id, view_count, published_at"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as Guide | null) ?? null;
}

async function fetchReferencedListing(
  listingId: string | null
): Promise<TenantListing | null> {
  if (!listingId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, building_name, area_pyeong, floor,
       building_type, transaction_type, deposit, monthly_rent,
       short_description, ai_tags, photo_urls,
       agency:agencies(name)`
    )
    .eq("id", listingId)
    .eq("status", "active")
    .eq("tenant_pool_enabled", true)
    .maybeSingle();
  if (!data) return null;
  return {
    listing_id: data.id,
    address: data.address,
    dong: data.dong,
    building_name: data.building_name,
    area_pyeong: data.area_pyeong,
    floor: data.floor,
    building_type: data.building_type,
    transaction_type: data.transaction_type,
    deposit: data.deposit,
    monthly_rent: data.monthly_rent,
    short_description: data.short_description,
    ai_tags: data.ai_tags,
    photo_urls: data.photo_urls,
    agency_name:
      ((data.agency as { name?: string } | null) ?? null)?.name ?? null,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const guide = await fetchGuide(params.slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | 부픽`,
    description: guide.meta_description ?? guide.title,
    keywords: guide.hashtags ?? undefined,
  };
}

export default async function GuidePage({ params }: PageProps) {
  const guide = await fetchGuide(params.slug);
  if (!guide) notFound();

  const listing = await fetchReferencedListing(guide.listing_id);

  // view_count 증가 (best-effort)
  void (async () => {
    try {
      const admin = createAdminClient();
      await admin
        .from("guides")
        .update({ view_count: guide.view_count + 1 })
        .eq("id", guide.id);
    } catch {
      // ignore
    }
  })();

  return (
    <main className="min-h-screen bg-boopick-cream">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
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
          <Link
            href="/guide"
            className="text-sm text-slate-500 hover:text-boopick-navy"
          >
            ← 가이드
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {guide.topic && (
          <Badge variant="outline" className="mb-3">
            {guide.topic}
          </Badge>
        )}
        <h1 className="text-2xl sm:text-4xl font-bold text-boopick-navy leading-tight">
          {guide.title}
        </h1>
        {guide.meta_description && (
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            {guide.meta_description}
          </p>
        )}

        {guide.hero_query && (
          <Link
            href={`/find?q=${encodeURIComponent(guide.hero_query)}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-boopick-orange hover:text-boopick-orange/80"
          >
            🔎 비슷한 매물 더 찾기 — &ldquo;{guide.hero_query}&rdquo;
          </Link>
        )}

        <div
          className="mt-8 prose prose-slate prose-base sm:prose-lg max-w-none
                     prose-headings:text-boopick-navy prose-headings:font-bold
                     prose-h2:mt-8 prose-h2:mb-3
                     prose-strong:text-boopick-navy
                     prose-a:text-boopick-orange prose-a:no-underline hover:prose-a:underline"
        >
          {/* Markdown을 단순 텍스트로 표시 (간단 처리) */}
          {renderMarkdown(guide.body)}
        </div>

        {/* 참조 매물 카드 */}
        {listing && (
          <section className="mt-10 pt-8 border-t border-slate-200">
            <p className="text-xs uppercase text-slate-500 tracking-wider mb-3">
              관련 매물
            </p>
            <TenantListingCard listing={listing} />
            <div className="mt-4 text-center">
              <Button
                asChild
                size="lg"
                className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
              >
                <Link href={`/find/${listing.listing_id}`}>
                  💬 이 자리 자세히 보고 문의하기
                </Link>
              </Button>
            </div>
          </section>
        )}

        {guide.hashtags && guide.hashtags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {guide.hashtags.map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* CTA 카드 */}
      <section className="px-4 py-10 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white border-none shadow-xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              찾는 자리를 한 줄로 말씀해보세요
            </h2>
            <p className="text-sm text-white/80 mb-5">
              부픽 AI가 강남권 매물 중 딱 맞는 자리를 30초 안에 찾아드립니다.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
            >
              <Link href="/find">🔎 매물 검색하기</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="px-4 py-8 border-t border-slate-200 text-center text-xs text-slate-500">
        Bottle Inc. · 부픽
      </footer>
    </main>
  );
}

// 매우 단순 markdown → JSX 변환 (h2, 리스트, 단락만)
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`}>{trimmed.slice(3)}</h2>
      );
    } else if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${elements.length}`}>{renderInline(trimmed)}</p>
      );
    }
  }
  flushList();
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // **bold** 만 처리
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
