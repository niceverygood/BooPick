import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";
import { AdCopyTool } from "./ad-copy-tool";

export const dynamic = "force-dynamic";

interface ListingPick {
  id: string;
  short_description: string | null;
  address: string;
  dong: string | null;
}

async function fetchListings(agencyId: string): Promise<ListingPick[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select("id, short_description, address, dong")
    .eq("agency_id", agencyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as ListingPick[];
}

export default async function AutoContentPage() {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId)
    return <p className="text-sm text-slate-500">agency 정보가 없습니다.</p>;
  const listings = await fetchListings(agencyId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          광고문구 자동 생성
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          매물·채널·톤을 고르면 AI가 광고 카피를 작성합니다. 네이버부동산 / 인스타 / 블로그 / 카톡 4채널 지원.
        </p>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-slate-500">
            먼저{" "}
            <a className="text-boopick-orange underline" href="/agent/listings/new">
              매물을 등록
            </a>
            해주세요.
          </CardContent>
        </Card>
      ) : (
        <AdCopyTool listings={listings} />
      )}
    </div>
  );
}
