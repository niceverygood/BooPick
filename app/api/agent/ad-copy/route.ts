import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateAdCopy, type AdChannel, type AdTone } from "@/lib/agent/ad-copy";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHANNELS: AdChannel[] = ["naver", "instagram", "blog", "kakao"];
const TONES: AdTone[] = ["formal", "casual", "impact"];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const listingId = body.listing_id;
  const channel = body.channel as AdChannel;
  const tone = (body.tone ?? "casual") as AdTone;

  if (typeof listingId !== "string") {
    return NextResponse.json({ error: "listing_id 필요" }, { status: 400 });
  }
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel 미지정" }, { status: 400 });
  }
  if (!TONES.includes(tone)) {
    return NextResponse.json({ error: "tone 미지정" }, { status: 400 });
  }

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) {
    return NextResponse.json({ error: "agency 정보 없음" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: listing, error } = await admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, area_pyeong, floor, building_type,
       transaction_type, deposit, monthly_rent,
       description, short_description, ai_tags`
    )
    .eq("id", listingId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error || !listing) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다" }, { status: 404 });
  }

  try {
    const result = await generateAdCopy({
      listing,
      channel,
      tone,
      useHaiku: true,
    });

    // ad_copies 로그
    void admin
      .from("ad_copies")
      .insert({
        user_id: null, // Step 3 OAuth 후 auth.uid()로 변경
        listing_id: listing.id,
        channel,
        tone,
        content: JSON.stringify({
          title: result.title,
          body: result.body,
          hashtags: result.hashtags,
        }),
        tokens_used: result.tokens.input + result.tokens.output,
      })
      .then(() => {});

    return NextResponse.json({
      title: result.title,
      body: result.body,
      hashtags: result.hashtags,
      channel,
      tone,
      tokens: result.tokens,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "광고문구 생성 실패",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
