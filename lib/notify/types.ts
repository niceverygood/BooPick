// 부픽 V2 알림 추상 레이어 타입

export type NotifyChannel =
  | "kakao_alimtalk"
  | "sms"
  | "email"
  | "console";

export type TemplateKey =
  | "AGENT_NEW_INQUIRY"
  | "TENANT_INQUIRY_SENT"
  | "AGENT_TRIAL_ENDING"
  | "ADMIN_DAILY_REPORT";

export interface NotifyTarget {
  phone?: string | null;
  email?: string | null;
  kakao_channel_token?: string | null; // 알림톡 발급 후
}

export interface NotifyMessage {
  to: NotifyTarget;
  template: TemplateKey;
  vars: Record<string, string>;
  fallbackChannels?: NotifyChannel[];
}

export type NotifyResult =
  | {
      success: true;
      channel: NotifyChannel;
      cost?: number;
      messageId?: string;
    }
  | { success: false; channel: NotifyChannel; error: string };

export interface NotifyAttempt {
  channel: NotifyChannel;
  result: NotifyResult;
  startedAt: string;
}
