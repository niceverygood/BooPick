// Resend 이메일 발송 (HTTP API)
//
// 환경변수:
//   RESEND_API_KEY        (Resend 콘솔 → API Keys)
//   RESEND_FROM           (예: "부픽 <noreply@boopick.com>")
//
// 문서: https://resend.com/docs/api-reference/emails/send-email

import type { NotifyResult } from "./types";

const ENDPOINT = "https://api.resend.com/emails";

export interface ResendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendResendEmail(input: ResendInput): Promise<NotifyResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return {
      success: false,
      channel: "email",
      error: "Resend 환경변수 미설정 (RESEND_API_KEY / RESEND_FROM)",
    };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!res.ok) {
      return {
        success: false,
        channel: "email",
        error: data.message ?? `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      channel: "email",
      messageId: data.id,
    };
  } catch (e) {
    return {
      success: false,
      channel: "email",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
