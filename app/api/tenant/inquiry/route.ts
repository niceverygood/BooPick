import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyAgentOfInquiry } from "@/lib/notify";

export const runtime = "nodejs";

// POST /api/tenant/inquiry
//   body: { listing_id, anon_token, message?, contact_phone? }
//   - tenants upsert (anon_token 기준)
//   - tenant_inquiries insert (status=pending, notify_status=pending)
//   - listings.tenant_inquiries_count 증가
//   - 카카오 알림톡은 Step 2에서 (지금은 notify_status='pending'으로 큐에 적재)
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const listingId = body.listing_id;
  const anonToken = body.anon_token;
  if (typeof listingId !== "string") {
    return NextResponse.json({ error: "listing_id가 필요합니다" }, { status: 400 });
  }
  if (typeof anonToken !== "string" || !anonToken.startsWith("anon_")) {
    return NextResponse.json({ error: "anon_token이 필요합니다" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.slice(0, 1000) : null;
  const contactPhone =
    typeof body.contact_phone === "string" ? body.contact_phone.slice(0, 30) : null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: "DB 연결 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }

  // 1. 매물 + agency 확인 (분배 대상 결정)
  const { data: listing, error: lErr } = await admin
    .from("listings")
    .select("id, agency_id, status, tenant_pool_enabled, short_description, address, dong")
    .eq("id", listingId)
    .single();

  if (lErr || !listing) {
    return NextResponse.json({ error: "매물을 찾을 수 없습니다" }, { status: 404 });
  }
  if (listing.status !== "active") {
    return NextResponse.json({ error: "이미 종료된 매물입니다" }, { status: 410 });
  }
  if (!listing.tenant_pool_enabled) {
    return NextResponse.json({ error: "현재 비공개 매물입니다" }, { status: 403 });
  }

  // 2. tenant upsert (anon_token으로)
  let tenantId: string;
  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("anon_token", anonToken)
    .maybeSingle();

  if (existing?.id) {
    tenantId = existing.id;
  } else {
    const { data: created, error: tErr } = await admin
      .from("tenants")
      .insert({ anon_token: anonToken, phone: contactPhone })
      .select("id")
      .single();
    if (tErr || !created) {
      return NextResponse.json(
        { error: "임차인 생성 실패", detail: tErr?.message },
        { status: 500 }
      );
    }
    tenantId = created.id;
  }

  // 전화번호가 새로 들어왔으면 업데이트
  if (contactPhone) {
    await admin
      .from("tenants")
      .update({ phone: contactPhone })
      .eq("id", tenantId);
  }

  // 3. inquiry insert
  const { data: inquiry, error: iErr } = await admin
    .from("tenant_inquiries")
    .insert({
      tenant_id: tenantId,
      listing_id: listing.id,
      agency_id: listing.agency_id,
      message,
      status: "pending",
      notify_status: "pending",
    })
    .select("id, created_at")
    .single();

  if (iErr || !inquiry) {
    return NextResponse.json(
      { error: "문의 생성 실패", detail: iErr?.message },
      { status: 500 }
    );
  }

  // 4. listings.tenant_inquiries_count 증가
  void admin.rpc("increment_listing_inquiries", { p_listing_id: listing.id }).then(
    () => {},
    () => {
      // RPC가 없으면 update로 fallback
      void admin
        .from("listings")
        .update({
          tenant_inquiries_count: (
            (listing as { tenant_inquiries_count?: number }).tenant_inquiries_count ?? 0
          ) + 1,
        })
        .eq("id", listing.id);
    }
  );

  // 5. 중개사 알림 (현재 console.log + notify_status='sent', Phase 2에서 알림톡 연동)
  void notifyAgentOfInquiry({ inquiry_id: inquiry.id }).catch(() => {});

  return NextResponse.json({
    inquiry_id: inquiry.id,
    status: "pending",
    listing: {
      id: listing.id,
      address: listing.address,
      dong: listing.dong,
      short_description: listing.short_description,
    },
    message: "문의가 접수됐습니다. 등록 중개사가 곧 연락드릴 예정입니다.",
  });
}
