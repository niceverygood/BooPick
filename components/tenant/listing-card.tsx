// 임차인용 매물 카드 — V2
// 매칭 점수 노출 X, 큰 이미지/임차인 친화 가격 표기, "이 자리 문의하기" CTA

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TenantListing {
  listing_id: string;
  address: string;
  dong: string | null;
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
  photo_urls?: string[] | null;
  agency_name?: string | null;
}

interface Props {
  listing: TenantListing;
  href?: string;
  onView?: () => void;
}

export function TenantListingCard({ listing, href, onView }: Props) {
  const target = href ?? `/find/${listing.listing_id}`;
  const tags = listing.ai_tags ?? {};
  const topTags = [
    ...(tags.industries ?? []).slice(0, 2),
    ...(tags.facilities ?? []).slice(0, 2),
    ...(tags.location_features ?? []).slice(0, 1),
  ].slice(0, 4);

  return (
    <Link
      href={target}
      onClick={onView}
      className="group block focus:outline-none focus:ring-2 focus:ring-boopick-orange rounded-2xl"
      prefetch={false}
    >
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg group-hover:-translate-y-0.5">
        {/* 이미지 영역 — 사진 없으면 SVG 자동 placeholder */}
        <div
          className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-boopick-navy via-slate-700 to-boopick-orange/40"
          aria-hidden
        >
          {listing.photo_urls && listing.photo_urls.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photo_urls[0]}
              alt={listing.short_description ?? listing.address}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <PlaceholderTile listing={listing} />
          )}
          {listing.transaction_type && (
            <Badge className="absolute top-3 left-3 bg-white/95 text-boopick-navy hover:bg-white border-none shadow-sm">
              {listing.transaction_type}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <p className="text-xs text-slate-500 mb-1">
            {[
              listing.dong,
              listing.building_type,
              listing.area_pyeong ? `${listing.area_pyeong}평` : null,
              listing.floor != null
                ? listing.floor < 0
                  ? `지하${-listing.floor}층`
                  : `${listing.floor}층`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h3 className="font-bold text-base sm:text-lg text-boopick-navy line-clamp-2 leading-snug min-h-[3em]">
            {listing.short_description || listing.address}
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {formatPrice(listing)}
          </p>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {topTags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-boopick-cream text-slate-600 border border-slate-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function PlaceholderTile({ listing }: { listing: TenantListing }) {
  const big = listing.dong ?? listing.building_type ?? "매물";
  const small = listing.area_pyeong ? `${listing.area_pyeong}평` : "";
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow">
          {big}
        </div>
        {small && (
          <div className="mt-1 text-sm sm:text-base opacity-90">{small}</div>
        )}
      </div>
    </div>
  );
}

export function formatPrice(l: TenantListing): string {
  const dep = l.deposit ?? 0;
  const rent = l.monthly_rent ?? 0;
  const parts: string[] = [];
  if (dep > 0) parts.push(`보증금 ${formatKRW(dep)}`);
  if (rent > 0) parts.push(`월세 ${formatKRW(rent)}`);
  if (parts.length === 0) return "협의";
  return parts.join(" · ");
}

export function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) {
    const man = Math.round(n / 10_000);
    return `${man.toLocaleString()}만`;
  }
  return n.toLocaleString();
}
