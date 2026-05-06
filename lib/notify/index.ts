// 부픽 V2 알림 추상 레이어
//
// 사용법:
//   const result = await sendNotification({
//     to: { phone: '010-1234-5678', email: 'foo@bar.com' },
//     template: 'AGENT_NEW_INQUIRY',
//     vars: { listing_title: '...', tenant_query: '...', dashboard_url: '...' },
//     fallbackChannels: ['sms', 'email'],
//   });
//
// 채널 우선순위 (자동):
//   1. kakao_alimtalk (KAKAO_ALIMTALK_API_KEY 있으면 — 추후)
//   2. sms (SOLAPI_API_KEY 있으면)
//   3. email (RESEND_API_KEY 있으면)
//   4. console (모두 미설정 시 — 개발 fallback)

import { createAdminClient } from "@/lib/supabase/server";
import { renderTemplate } from "./templates";
import { sendSolapiSMS } from "./sms-solapi";
import { sendResendEmail } from "./email-resend";
import type {
  NotifyChannel,
  NotifyMessage,
  NotifyResult,
  NotifyAttempt,
} from "./types";

export type { NotifyChannel, NotifyMessage, NotifyResult, NotifyAttempt };

const DEFAULT_FALLBACK: NotifyChannel[] = [
  "kakao_alimtalk",
  "sms",
  "email",
  "console",
];

export async function sendNotification(
  msg: NotifyMessage
): Promise<NotifyResult> {
  const channels = msg.fallbackChannels ?? DEFAULT_FALLBACK;
  const tpl = renderTemplate(msg.template, msg.vars);
  const attempts: NotifyAttempt[] = [];

  for (const channel of channels) {
    const startedAt = new Date().toISOString();
    let result: NotifyResult;

    switch (channel) {
      case "kakao_alimtalk":
        // Phase 2 — 비즈센터 알림톡 발급 후 구현
        if (!process.env.KAKAO_ALIMTALK_API_KEY) {
          result = {
            success: false,
            channel,
            error: "알림톡 미설정 (Phase 2)",
          };
        } else {
          result = {
            success: false,
            channel,
            error: "알림톡 SDK 미구현 — Phase 2",
          };
        }
        break;

      case "sms":
        if (!msg.to.phone) {
          result = {
            success: false,
            channel,
            error: "SMS 발송 — 휴대폰 번호 없음",
          };
        } else {
          result = await sendSolapiSMS({ to: msg.to.phone, text: tpl.sms });
        }
        break;

      case "email":
        if (!msg.to.email || !tpl.email_subject || !tpl.email_html) {
          result = {
            success: false,
            channel,
            error: "이메일 발송 — 주소/제목/본문 누락",
          };
        } else {
          result = await sendResendEmail({
            to: msg.to.email,
            subject: tpl.email_subject,
            html: tpl.email_html,
          });
        }
        break;

      case "console":
        console.log(`[notify:${msg.template}]`, {
          to: msg.to,
          text: tpl.sms,
        });
        result = { success: true, channel };
        break;

      default:
        result = { success: false, channel, error: "알 수 없는 채널" };
    }

    attempts.push({ channel, result, startedAt });
    if (result.success) return result;
  }

  return {
    success: false,
    channel: attempts[attempts.length - 1]?.channel ?? "console",
    error: `모든 채널 실패: ${attempts.map((a) => `${a.channel}(${a.result.success ? "ok" : (a.result as { error: string }).error})`).join(" → ")}`,
  };
}

// ───────────────────────────────────────────────
// inquiry 발생 시 중개사·임차인 알림
// ───────────────────────────────────────────────
export async function notifyAgentOfInquiry(payload: {
  inquiry_id: string;
}): Promise<NotifyResult> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      success: false,
      channel: "console",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const { data, error } = await admin
    .from("tenant_inquiries")
    .select(
      `id, message, agency_id, listing_id,
       agency:agencies(name, agent_phone, email, notification_consent, kakao_channel_url),
       listing:listings(short_description, address, dong, area_pyeong, transaction_type, deposit, monthly_rent),
       tenant:tenants(name, phone, email, notify_consent)`
    )
    .eq("id", payload.inquiry_id)
    .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      channel: "console",
      error: error?.message ?? "inquiry not found",
    };
  }

  const agency =
    (data.agency as {
      name?: string;
      agent_phone?: string;
      email?: string;
      notification_consent?: boolean;
      kakao_channel_url?: string;
    } | null) ?? null;
  const listing =
    (data.listing as {
      short_description?: string;
      address?: string;
      dong?: string;
      area_pyeong?: number;
      transaction_type?: string;
      deposit?: number;
      monthly_rent?: number;
    } | null) ?? null;
  const tenant =
    (data.tenant as {
      name?: string;
      phone?: string;
      email?: string;
      notify_consent?: boolean;
    } | null) ?? null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://boo-pick-f52g.vercel.app";

  const listingTitle =
    listing?.short_description ?? listing?.address ?? "매물";
  const tenantQueryParts = [
    listing?.dong,
    listing?.area_pyeong ? `${listing.area_pyeong}평` : null,
    listing?.transaction_type,
  ].filter(Boolean);

  // 1. 중개사 알림 (consent 확인)
  let agentResult: NotifyResult = {
    success: false,
    channel: "console",
    error: "skipped",
  };
  if (agency?.notification_consent && agency.agent_phone) {
    agentResult = await sendNotification({
      to: { phone: agency.agent_phone, email: agency.email ?? null },
      template: "AGENT_NEW_INQUIRY",
      vars: {
        listing_title: listingTitle,
        tenant_query: tenantQueryParts.join(" · "),
        tenant_message: data.message ?? "(메시지 없음)",
        dashboard_url: `${siteUrl}/agent/leads/${data.id}`,
      },
      fallbackChannels: ["sms", "email", "console"],
    });
  } else {
    // 동의 없거나 번호 없음 — console에만 로그
    agentResult = await sendNotification({
      to: {},
      template: "AGENT_NEW_INQUIRY",
      vars: {
        listing_title: listingTitle,
        tenant_query: tenantQueryParts.join(" · "),
        tenant_message: data.message ?? "",
        dashboard_url: `${siteUrl}/agent/leads/${data.id}`,
      },
      fallbackChannels: ["console"],
    });
  }

  // 2. 임차인 알림 (전화 있을 때만)
  if (tenant?.phone) {
    void sendNotification({
      to: { phone: tenant.phone, email: tenant.email ?? null },
      template: "TENANT_INQUIRY_SENT",
      vars: {
        listing_title: listingTitle,
        channel_url: agency?.kakao_channel_url ?? siteUrl,
      },
      fallbackChannels: ["sms", "email", "console"],
    }).catch(() => {});
  }

  // 3. inquiry 테이블에 결과 기록
  await admin
    .from("tenant_inquiries")
    .update({
      notify_status: agentResult.success ? "sent" : "failed",
      notification_sent_at: agentResult.success
        ? new Date().toISOString()
        : null,
      notification_channel: agentResult.success ? agentResult.channel : null,
      notification_cost: agentResult.success
        ? (agentResult as { cost?: number }).cost ?? null
        : null,
      notified_at: agentResult.success ? new Date().toISOString() : null,
    })
    .eq("id", data.id);

  return agentResult;
}
