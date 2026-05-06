// 임차인 컨택 발생 시 중개사에게 알림
//
// V2 Step 2 — 카카오 알림톡은 사업자 비즈채널 발급 필요(Phase 2).
// 현재는 console.log + Supabase tenant_inquiries.notify_status 업데이트.
//
// 추후 알림톡 SDK 연동 시 이 파일만 교체.

import { createAdminClient } from "@/lib/supabase/server";

export interface InquiryNotifyPayload {
  inquiry_id: string;
}

interface InquiryDetail {
  id: string;
  message: string | null;
  created_at: string;
  agency_id: string;
  agency_name: string | null;
  listing_id: string;
  listing_address: string | null;
  listing_short: string | null;
  tenant_phone: string | null;
}

export type NotifyResult =
  | { ok: true; channel: "console" | "sms" | "email" | "kakao_alimtalk" }
  | { ok: false; error: string };

export async function notifyAgentOfInquiry(
  payload: InquiryNotifyPayload
): Promise<NotifyResult> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // inquiry 상세 + 매물·중개사·임차인 정보
  const { data, error } = await admin
    .from("tenant_inquiries")
    .select(
      `id, message, created_at, agency_id, listing_id,
       agency:agencies(name),
       listing:listings(address, short_description),
       tenant:tenants(phone)`
    )
    .eq("id", payload.inquiry_id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "inquiry not found" };
  }

  const detail: InquiryDetail = {
    id: data.id,
    message: data.message,
    created_at: data.created_at,
    agency_id: data.agency_id,
    agency_name:
      ((data.agency as { name?: string } | null) ?? null)?.name ?? null,
    listing_id: data.listing_id,
    listing_address:
      ((data.listing as { address?: string } | null) ?? null)?.address ?? null,
    listing_short:
      ((data.listing as { short_description?: string } | null) ?? null)
        ?.short_description ?? null,
    tenant_phone:
      ((data.tenant as { phone?: string } | null) ?? null)?.phone ?? null,
  };

  // ────────────────────────────────────────────────
  // 알림 발송 — 현재는 console.log
  // ────────────────────────────────────────────────
  console.log(
    "[notify] 새 임차인 컨택:",
    JSON.stringify(
      {
        inquiry_id: detail.id,
        to_agency: detail.agency_name ?? detail.agency_id,
        listing: detail.listing_short ?? detail.listing_address,
        tenant_phone: detail.tenant_phone
          ? maskPhone(detail.tenant_phone)
          : null,
        message: detail.message,
      },
      null,
      2
    )
  );

  // notify_status 업데이트
  await admin
    .from("tenant_inquiries")
    .update({
      notify_status: "sent",
      notified_at: new Date().toISOString(),
    })
    .eq("id", detail.id);

  // TODO Step 2 후반:
  //   - 카카오 알림톡 (사업자 비즈채널 + 사전 승인 템플릿 필요)
  //   - 이메일 fallback (Resend/SendGrid)
  //   - SMS fallback (Twilio/NHN Cloud)

  return { ok: true, channel: "console" };
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 8) return "****";
  return digits.slice(0, 3) + "-****-" + digits.slice(-4);
}
