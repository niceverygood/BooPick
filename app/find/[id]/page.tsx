import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TenantListingCard,
  type TenantListing,
  formatPrice,
  formatKRW,
} from "@/components/tenant/listing-card";
import { InquiryButton } from "./inquiry-button";
import { TrackPageView } from "@/components/tracking/track-page-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

interface ListingDetail extends TenantListing {
  description: string | null;
  premium: number | null;
  total_floors: number | null;
  building_name: string | null;
  area_sqm: number | null;
  source: string | null;
  external_id: string | null;
}

async function fetchListing(id: string): Promise<ListingDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, building_name, area_pyeong, area_sqm,
       floor, total_floors, building_type, transaction_type,
       deposit, monthly_rent, premium,
       short_description, description, photo_urls, ai_tags,
       status, tenant_pool_enabled, source, external_id,
       agency:agencies(name, business_registration_number)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "active" || !data.tenant_pool_enabled) return null;

  const agency = (data.agency as { name?: string } | null) ?? null;

  return {
    listing_id: data.id,
    address: data.address,
    dong: data.dong,
    building_name: data.building_name,
    area_pyeong: data.area_pyeong,
    area_sqm: data.area_sqm,
    floor: data.floor,
    total_floors: data.total_floors,
    building_type: data.building_type,
    transaction_type: data.transaction_type,
    deposit: data.deposit,
    monthly_rent: data.monthly_rent,
    premium: data.premium,
    short_description: data.short_description,
    description: data.description,
    photo_urls: data.photo_urls,
    ai_tags: data.ai_tags,
    agency_name: agency?.name ?? null,
    source: data.source,
    external_id: data.external_id,
  };
}

async function fetchSimilar(
  listing: ListingDetail,
  limit = 5
): Promise<TenantListing[]> {
  const admin = createAdminClient();
  let q = admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, building_name, area_pyeong,
       floor, building_type, transaction_type,
       deposit, monthly_rent, short_description, ai_tags, photo_urls,
       agency:agencies(name)`
    )
    .eq("status", "active")
    .eq("tenant_pool_enabled", true)
    .neq("id", listing.listing_id)
    .limit(limit);

  if (listing.dong) q = q.eq("dong", listing.dong);
  else if (listing.building_type) q = q.eq("building_type", listing.building_type);

  const { data } = await q;
  if (!data) return [];

  return data.map((d) => ({
    listing_id: d.id,
    address: d.address,
    dong: d.dong,
    building_name: d.building_name,
    area_pyeong: d.area_pyeong,
    floor: d.floor,
    building_type: d.building_type,
    transaction_type: d.transaction_type,
    deposit: d.deposit,
    monthly_rent: d.monthly_rent,
    short_description: d.short_description,
    ai_tags: d.ai_tags,
    photo_urls: d.photo_urls,
    agency_name:
      ((d.agency as { name?: string } | null) ?? null)?.name ?? null,
  }));
}

export default async function ListingDetailPage({ params }: PageProps) {
  const listing = await fetchListing(params.id);
  if (!listing) notFound();

  const similar = await fetchSimilar(listing);

  return (
    <main className="min-h-screen bg-boopick-cream pb-32 sm:pb-16">
      <TrackPageView event="listing_view" listingId={listing.listing_id} />
      {/* 헤더 */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
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
            href="/find"
            className="text-sm text-slate-500 hover:text-boopick-navy"
          >
            ← 검색 결과로
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* 큰 이미지 */}
        <div className="relative aspect-[4/3] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-boopick-navy via-slate-700 to-boopick-orange/40 mb-6">
          {listing.photo_urls && listing.photo_urls.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photo_urls[0]}
              alt={listing.short_description ?? listing.address}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-4xl sm:text-6xl font-bold drop-shadow">
                  {listing.dong ?? listing.building_type ?? "매물"}
                </div>
                {listing.area_pyeong && (
                  <div className="mt-2 text-lg sm:text-xl opacity-90">
                    {listing.area_pyeong}평
                  </div>
                )}
              </div>
            </div>
          )}
          {listing.transaction_type && (
            <Badge className="absolute top-4 left-4 bg-white text-boopick-navy hover:bg-white border-none shadow">
              {listing.transaction_type}
            </Badge>
          )}
        </div>

        {/* 핵심 정보 */}
        <div className="mb-2 text-sm text-slate-500">
          {[
            listing.dong,
            listing.building_type,
            listing.area_pyeong ? `${listing.area_pyeong}평` : null,
            listing.floor != null
              ? listing.floor < 0
                ? `지하${-listing.floor}층`
                : `${listing.floor}층`
              : null,
            listing.total_floors ? `(전체 ${listing.total_floors}층)` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy leading-tight mb-3">
          {listing.short_description ?? listing.address}
        </h1>

        <div className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
          {formatPrice(listing)}
          {listing.premium != null && listing.premium > 0 && (
            <span className="ml-2 text-base text-boopick-orange">
              · 권리금 {formatKRW(listing.premium)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-5">📍 {listing.address}</p>

        {/* 태그 */}
        {listing.ai_tags &&
          [
            ...(listing.ai_tags.industries ?? []),
            ...(listing.ai_tags.facilities ?? []),
            ...(listing.ai_tags.location_features ?? []),
            ...(listing.ai_tags.condition ?? []),
          ].length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {[
                ...(listing.ai_tags.industries ?? []),
                ...(listing.ai_tags.facilities ?? []),
                ...(listing.ai_tags.location_features ?? []),
                ...(listing.ai_tags.condition ?? []),
              ].map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

        <Separator className="my-6" />

        {/* 매물 설명 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold text-boopick-navy mb-3">매물 설명</h2>
          <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
            {listing.description ?? "(설명이 등록되지 않은 매물입니다)"}
          </p>
        </section>

        {/* 등록 중개사 정보 */}
        <section className="mb-8">
          <Card className="bg-white">
            <CardContent className="p-4 sm:p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-boopick-cream flex items-center justify-center text-boopick-navy font-bold text-sm shrink-0">
                {(listing.agency_name ?? "부픽").slice(0, 1)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-boopick-navy">
                  {listing.agency_name ?? "부픽 가입 중개사"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  부픽에 매물을 등록한 공인중개사입니다. 문의 시 직접 카톡으로 연락드립니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 유사 매물 */}
        {similar.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-boopick-navy mb-4">
              비슷한 매물
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {similar.map((s) => (
                <TenantListingCard key={s.listing_id} listing={s} />
              ))}
            </div>
          </section>
        )}
      </article>

      {/* 하단 sticky CTA (모바일 우선) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:static sm:bg-transparent sm:border-none sm:shadow-none sm:max-w-3xl sm:mx-auto sm:px-4 sm:pb-8 sm:backdrop-blur-none">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:p-0">
          <InquiryButton
            listingId={listing.listing_id}
            shortDescription={listing.short_description}
          />
        </div>
      </div>
    </main>
  );
}
