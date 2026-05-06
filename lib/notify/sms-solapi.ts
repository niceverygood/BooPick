// Solapi SMS/LMS 발송 (HMAC-SHA256 직접 인증)
//
// 환경변수:
//   SOLAPI_API_KEY        (Solapi 콘솔 → API Key)
//   SOLAPI_API_SECRET     (위와 함께 발급)
//   SOLAPI_FROM_NUMBER    (사전 등록한 발신 번호, 010-XXXX-XXXX 형식)
//
// 문서: https://docs.solapi.com/

import { createHmac, randomBytes } from "crypto";
import type { NotifyResult } from "./types";

const ENDPOINT = "https://api.solapi.com/messages/v4/send";

// LMS 자동 전환: 90byte 초과 (한글 ~45자) 시
function isLMS(text: string): boolean {
  // EUC-KR 기준 byte 수 — 한글 2byte, ASCII 1byte
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1;
    if (bytes > 90) return true;
  }
  return false;
}

function buildAuth(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export interface SolapiSendInput {
  to: string;
  text: string;
  subject?: string; // LMS 제목 (옵션)
}

export async function sendSolapiSMS(
  input: SolapiSendInput
): Promise<NotifyResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const fromNumber = process.env.SOLAPI_FROM_NUMBER;

  if (!apiKey || !apiSecret || !fromNumber) {
    return {
      success: false,
      channel: "sms",
      error: "Solapi 환경변수 미설정 (SOLAPI_API_KEY/SECRET/FROM_NUMBER)",
    };
  }

  const to = normalizePhone(input.to);
  if (!/^01\d{8,9}$/.test(to)) {
    return {
      success: false,
      channel: "sms",
      error: `유효하지 않은 휴대폰 번호: ${input.to}`,
    };
  }

  const lms = isLMS(input.text);
  const message: Record<string, string> = {
    to,
    from: normalizePhone(fromNumber),
    text: input.text,
    type: lms ? "LMS" : "SMS",
  };
  if (lms && input.subject) {
    message.subject = input.subject.slice(0, 40);
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildAuth(apiKey, apiSecret),
      },
      body: JSON.stringify({ message }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      messageId?: string;
      groupId?: string;
      statusCode?: string;
      statusMessage?: string;
      errorMessage?: string;
      errorCode?: string;
    };

    if (!res.ok || data.errorCode) {
      return {
        success: false,
        channel: "sms",
        error:
          data.errorMessage ?? data.statusMessage ?? `HTTP ${res.status}`,
      };
    }

    // Solapi 비용 추정 — SMS 9원 / LMS 33원 (실제 청구는 콘솔에서)
    const cost = lms ? 33 : 9;

    return {
      success: true,
      channel: "sms",
      cost,
      messageId: data.messageId ?? data.groupId,
    };
  } catch (e) {
    return {
      success: false,
      channel: "sms",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
