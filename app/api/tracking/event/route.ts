import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_EVENTS = [
  "landing_view",
  "search",
  "listing_view",
  "inquiry_click",
  "inquiry_submit",
  "agent_contacted",
  "meeting",
  "contracted",
  "chat_start",
  "guide_view",
];

// POST /api/tracking/event
//   body: { event_type, anon_token?, utm, device_type, referer, listing_id?, query?, ... }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = body.event_type;
  if (typeof eventType !== "string" || !ALLOWED_EVENTS.includes(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid event" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // tenant_id 매핑 — anon_token에서 시도
  const anonToken = typeof body.anon_token === "string" ? body.anon_token : null;
  let tenantId: string | null = null;
  if (anonToken) {
    const { data } = await admin
      .from("tenants")
      .select("id")
      .eq("anon_token", anonToken)
      .maybeSingle();
    tenantId = data?.id ?? null;
  }

  const utm = (body.utm ?? {}) as Record<string, string>;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  await admin.from("funnel_events").insert({
    tenant_id: tenantId,
    anon_token: anonToken,
    event_type: eventType,
    listing_id:
      typeof body.listing_id === "string" ? body.listing_id : null,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
    referer: typeof body.referer === "string" ? body.referer.slice(0, 500) : null,
    user_agent: userAgent,
    device_type:
      typeof body.device_type === "string" ? body.device_type : null,
    metadata: {
      ...(typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : {}),
      ...(typeof body.query === "string" ? { query: body.query } : {}),
      ...(typeof body.guide_slug === "string"
        ? { guide_slug: body.guide_slug }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
