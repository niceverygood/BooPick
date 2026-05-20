// 카카오 알림톡 — 스텁 단계
//
// 실제 발송은 카카오 비즈메시지 템플릿 승인 후 활성화.
// 현재: PII 마스킹 → notification_logs 에 'queued' 로 기록 + 콘솔 로그만.
//
// charge.ts(cron) 와 /api/notifications/kakao-alimtalk(외부 인터페이스) 양쪽에서 사용.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AlimtalkPayload {
  /** 카카오 비즈메시지 템플릿 ID (승인 후 발급) */
  templateId: string;
  /** 수신자 — 전화번호 또는 이메일 (저장 시 마스킹) */
  recipient?: string | null;
  /** 템플릿 치환 변수 */
  variables?: Record<string, unknown>;
  /** 연결된 사용자 (RLS self 조회용) */
  userId?: string | null;
}

export interface AlimtalkResult {
  ok: boolean;
  status: "queued" | "sent" | "failed" | "skipped";
  detail?: string;
}

// 전화/이메일 마스킹 — 로그·DB 에 평문 PII 금지 (가드레일 #6)
export function maskRecipient(recipient?: string | null): string | null {
  if (!recipient) return null;
  const r = recipient.trim();
  if (!r) return null;

  // 이메일
  if (r.includes("@")) {
    const [local, domain] = r.split("@");
    const head = local.slice(0, 1);
    return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
  }

  // 전화번호 — 숫자만 추출 후 가운데 마스킹
  const digits = r.replace(/[^\d]/g, "");
  if (digits.length >= 8) {
    const head = digits.slice(0, 3);
    const tail = digits.slice(-4);
    return `${head}-****-${tail}`;
  }
  // 기타 — 앞 2자만
  return `${r.slice(0, 2)}${"*".repeat(Math.max(1, r.length - 2))}`;
}

// 알림톡 큐잉 — 스텁: notification_logs 기록 + 콘솔. 실제 발송 X.
// admin(service_role) 클라이언트를 넘겨받아 사용 (RLS 우회, 서버 전용).
export async function queueAlimtalk(
  admin: SupabaseClient,
  payload: AlimtalkPayload
): Promise<AlimtalkResult> {
  const recipientMasked = maskRecipient(payload.recipient);

  try {
    const { error } = await admin.from("notification_logs").insert({
      user_id: payload.userId ?? null,
      channel: "kakao_alimtalk",
      template_id: payload.templateId,
      recipient_masked: recipientMasked,
      variables: payload.variables ?? {},
      status: "queued", // 스텁 — 실제 발송 전
    });
    if (error) {
      console.error("[alimtalk] log insert fail:", error.message);
      return { ok: false, status: "failed", detail: error.message };
    }
    // 마스킹된 정보만 로그 (tid/sid/금액 OK, PII 마스킹)
    console.log(
      `[alimtalk:stub] template=${payload.templateId} to=${recipientMasked ?? "-"} (queued, 발송 비활성)`
    );
    return { ok: true, status: "queued" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[alimtalk] unexpected:", detail);
    return { ok: false, status: "failed", detail };
  }
}
