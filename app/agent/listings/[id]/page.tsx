import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";
import { ListingForm } from "@/components/agent/listing-form";
import {
  updateListing,
  archiveListing,
  toggleTenantPool,
} from "../actions";

export const dynamic = "force-dynamic";

interface ListingDetail {
  id: string;
  agency_id: string;
  address: string;
  dong: string | null;
  building_name: string | null;
  area_pyeong: number | null;
  floor: number | null;
  total_floors: number | null;
  building_type: string | null;
  transaction_type: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  premium: number | null;
  description: string | null;
  short_description: string | null;
  status: string;
  tenant_pool_enabled: boolean;
  tenant_views: number | null;
  tenant_clicks: number | null;
  tenant_inquiries_count: number | null;
  ai_processed_at: string | null;
}

async function fetchListing(
  id: string,
  agencyId: string
): Promise<ListingDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, building_name, area_pyeong, floor, total_floors,
       building_type, transaction_type, deposit, monthly_rent, premium,
       description, short_description, status, tenant_pool_enabled,
       tenant_views, tenant_clicks, tenant_inquiries_count, ai_processed_at`
    )
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  return (data as ListingDetail | null) ?? null;
}

export default async function EditListingPage({
  params,
}: {
  params: { id: string };
}) {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) notFound();

  const listing = await fetchListing(params.id, agencyId);
  if (!listing) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link
        href="/agent/listings"
        className="text-sm text-slate-500 hover:text-boopick-navy inline-flex items-center gap-1"
      >
        ← 매물 목록
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
            매물 수정
          </h1>
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
            {listing.short_description ?? listing.address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/find/${listing.id}`}>
            <Button variant="outline" size="sm">
              임차인 화면
            </Button>
          </Link>
        </div>
      </div>

      {/* 노출 상태 + 통계 카드 */}
      <Card>
        <CardContent className="p-5 grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-500">노출 상태</p>
            <div className="mt-1.5">
              {listing.tenant_pool_enabled ? (
                <Badge className="bg-boopick-green text-white border-none hover:bg-boopick-green">
                  ON · 임차인 풀 노출
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500">
                  OFF · 비공개
                </Badge>
              )}
            </div>
          </div>
          <Stat label="노출" value={listing.tenant_views ?? 0} />
          <Stat label="클릭" value={listing.tenant_clicks ?? 0} />
          <Stat label="컨택" value={listing.tenant_inquiries_count ?? 0} />
        </CardContent>
      </Card>

      {/* 노출 토글 */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-boopick-navy">
              임차인 풀 노출
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {listing.tenant_pool_enabled
                ? "임차인 검색 결과에 노출됩니다."
                : "비공개 상태 — 본인 백오피스에서만 보임."}
            </p>
          </div>
          <form action={toggleTenantPool}>
            <input type="hidden" name="id" value={listing.id} />
            <input
              type="hidden"
              name="enabled"
              value={(!listing.tenant_pool_enabled).toString()}
            />
            <Button
              type="submit"
              variant={listing.tenant_pool_enabled ? "outline" : "default"}
              className={
                listing.tenant_pool_enabled
                  ? ""
                  : "bg-boopick-orange hover:bg-boopick-orange/90 text-white"
              }
            >
              {listing.tenant_pool_enabled ? "노출 끄기" : "노출 켜기"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ListingForm
        mode="edit"
        initial={{
          id: listing.id,
          address: listing.address,
          dong: listing.dong ?? undefined,
          building_name: listing.building_name ?? undefined,
          area_pyeong: listing.area_pyeong,
          floor: listing.floor,
          total_floors: listing.total_floors,
          building_type: listing.building_type ?? undefined,
          transaction_type: listing.transaction_type ?? undefined,
          deposit: listing.deposit,
          monthly_rent: listing.monthly_rent,
          premium: listing.premium,
          description: listing.description ?? undefined,
          short_description: listing.short_description ?? undefined,
        }}
        onSubmit={updateListing}
      />

      {/* 위험 영역 */}
      <Card className="border-red-200">
        <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-red-700">매물 보관 처리</p>
            <p className="text-xs text-slate-500 mt-0.5">
              archived 상태로 변경되어 검색·통계에서 제외됩니다. 데이터는 유지.
            </p>
          </div>
          <form action={archiveListing}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="outline" className="text-red-600">
              매물 보관(archive)
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-400">
        AI 처리 시각:{" "}
        {listing.ai_processed_at
          ? new Date(listing.ai_processed_at).toLocaleString("ko-KR")
          : "—"}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-boopick-navy mt-1.5">{value}</p>
    </div>
  );
}
