// 알림 템플릿 — 채널별 본문
import type { TemplateKey } from "./types";

interface TemplatePayload {
  sms: string;       // SMS/LMS 본문
  email_subject?: string;
  email_html?: string;
  alimtalk?: {
    template_id: string;  // 카카오 비즈센터 등록 ID (발급 후)
    text: string;
  };
}

type TemplateMap = Record<TemplateKey, TemplatePayload>;

// 변수 치환: "{listing_title}" → vars.listing_title
function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "") + "");
}

export function renderTemplate(
  key: TemplateKey,
  vars: Record<string, string>
): TemplatePayload {
  const tpl = TEMPLATES[key];
  return {
    sms: fill(tpl.sms, vars),
    email_subject: tpl.email_subject
      ? fill(tpl.email_subject, vars)
      : undefined,
    email_html: tpl.email_html ? fill(tpl.email_html, vars) : undefined,
    alimtalk: tpl.alimtalk
      ? { ...tpl.alimtalk, text: fill(tpl.alimtalk.text, vars) }
      : undefined,
  };
}

const TEMPLATES: TemplateMap = {
  AGENT_NEW_INQUIRY: {
    sms: `[부픽] 매물 문의 도착 📩
{listing_title}
조건: {tenant_query}
확인: {dashboard_url}`,
    email_subject: "[부픽] 새 임차인 문의 — {listing_title}",
    email_html: `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#1A2E4C;font-size:20px;margin:0 0 12px">새 임차인 문의가 도착했습니다</h1>
  <p style="font-size:14px;color:#475569;margin:0 0 16px">
    <strong>{listing_title}</strong> 매물에 임차인이 컨택을 보냈습니다.
  </p>
  <div style="background:#F8FAFC;border-left:3px solid #FF7849;padding:12px 16px;margin:16px 0">
    <p style="margin:0;font-size:13px;color:#475569"><strong>임차인 메시지:</strong></p>
    <p style="margin:6px 0 0;font-size:14px;color:#1A2E4C">{tenant_message}</p>
  </div>
  <p style="margin:24px 0 0">
    <a href="{dashboard_url}" style="display:inline-block;background:#1A2E4C;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      부픽 대시보드에서 확인 →
    </a>
  </p>
  <p style="font-size:12px;color:#94A3B8;margin-top:32px">
    부픽 (Bottle Inc.) · 알림 수신 동의에 따라 발송됩니다.
  </p>
</div>`,
    alimtalk: {
      template_id: "BOOPICK_NEW_INQUIRY", // 추후 비즈센터에서 발급한 ID로 교체
      text: `매물 문의 도착!
{listing_title}
조건: {tenant_query}
부픽 대시보드에서 확인하세요.`,
    },
  },

  TENANT_INQUIRY_SENT: {
    sms: `[부픽] 문의가 전달됐어요 ✅
{listing_title}에 대한 컨택이 등록 중개사에게 전달됐습니다.
1시간 내 연락이 없으면 다시 문의해주세요.
부픽 채널: {channel_url}`,
    email_subject: "[부픽] 문의가 전달됐어요 — {listing_title}",
    email_html: `
<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#1A2E4C;font-size:20px;margin:0 0 12px">문의가 전달됐어요 ✅</h1>
  <p style="font-size:14px;color:#475569">
    <strong>{listing_title}</strong> 매물에 대한 컨택이 등록 중개사에게 전달됐습니다.
  </p>
  <p style="font-size:14px;color:#475569">
    중개사가 곧 연락드릴 예정입니다. 1시간 내 연락이 없으면 다시 문의해주세요.
  </p>
</div>`,
  },

  AGENT_TRIAL_ENDING: {
    sms: `[부픽] Pro 트라이얼이 {days_left}일 후 종료됩니다.
계속 임차인 풀 노출을 받으려면 구독 연장:
{billing_url}`,
  },

  ADMIN_DAILY_REPORT: {
    sms: `[부픽 일일] 어제 검색 {searches} / 컨택 {inquiries} / 성사 {contracted}. 알림 실패: {notify_failures}건.`,
  },
};
