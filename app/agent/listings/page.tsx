import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

export const dynamic = "force-dynamic";

interface ListingRow {
  id: string;
  address: string;
  dong: string | null;
  short_description: string | null;
  area_pyeong: number | null;
  floor: number | null;
  building_type: string | null;
  transaction_type: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  status: string;
  tenant_pool_enabled: boolean;
  tenant_views: number | null;
  tenant_clicks: number | null;
  tenant_inquiries_count: number | null;
  created_at: string;
}

async function fetchListings(agencyId: string): Promise<ListingRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select(
      `id, address, dong, short_description, area_pyeong, floor,
       building_type, transaction_type, deposit, monthly_rent,
       status, tenant_pool_enabled, tenant_views, tenant_clicks,
       tenant_inquiries_count, created_at`
    )
    .eq("agency_id", agencyId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (data ?? []) as ListingRow[];
}

export default async function ListingsPage() {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) {
    return <p className="text-sm text-slate-500">agency 정보가 없습니다.</p>;
  }
  const listings = await fetchListings(agencyId);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
            내 매물
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {listings.length}건 — 등록 즉시 임차인 검색에 노출됩니다 (Pro 플랜).
          </p>
        </div>
        <Button
          asChild
          className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
        >
          <Link href="/agent/listings/new">+ 매물 등록</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-base font-semibold text-boopick-navy mb-2">
              등록된 매물이 없습니다
            </p>
            <p className="text-sm text-slate-500 mb-5">
              첫 매물을 등록하면 AI가 자동 태깅 + 임베딩을 처리해 30초 내 검색 가능 상태가 됩니다.
            </p>
            <Button
              asChild
              className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
            >
              <Link href="/agent/listings/new">+ 매물 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {listings.map((l) => (
            <ListingRowCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingRowCard({ listing }: { listing: ListingRow }) {
  return (
    <Link
      href={`/agent/listings/${listing.id}`}
      className="block group focus:outline-none focus:ring-2 focus:ring-boopick-orange rounded-lg"
    >
      <Card className="transition-all group-hover:shadow-md group-hover:border-boopick-orange/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {listing.tenant_pool_enabled ? (
                  <Badge className="bg-boopick-green text-white border-none hover:bg-boopick-green">
                    임차인 풀 노출
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500">
                    비공개
                  </Badge>
                )}
                {listing.transaction_type && (
                  <Badge variant="outline">{listing.transaction_type}</Badge>
                )}
              </div>
              <h3 className="font-bold text-base text-boopick-navy line-clamp-1">
                {listing.short_description ?? listing.address}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                📍 {listing.address}
                {" · "}
                {[
                  listing.building_type,
                  listing.area_pyeong ? `${listing.area_pyeong}평` : null,
                  listing.floor != null ? `${listing.floor}층` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-2">
                {priceLabel(listing)}
              </p>
            </div>
            <div className="text-xs text-slate-500 sm:text-right shrink-0 flex sm:flex-col gap-3 sm:gap-1">
              <span>👀 {listing.tenant_views ?? 0}</span>
              <span>🖱️ {listing.tenant_clicks ?? 0}</span>
              <span>💬 {listing.tenant_inquiries_count ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function priceLabel(l: ListingRow): string {
  const parts: string[] = [];
  if (l.deposit) parts.push(`보증금 ${formatKRW(l.deposit)}`);
  if (l.monthly_rent && l.monthly_rent > 0)
    parts.push(`월세 ${formatKRW(l.monthly_rent)}`);
  return parts.join(" · ") || "협의";
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}
