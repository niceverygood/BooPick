// 카카오페이 결제 API 래퍼 (서버 전용)
//
// 사용 도메인: https://open-api.kakaopay.com
// 인증: Authorization: SECRET_KEY {KAKAOPAY_SECRET_KEY}
//
// API 흐름:
//   READY      → 결제창 redirect URL + tid 발급
//   APPROVE    → pg_token 으로 최종 승인 (정기결제 첫 결제 시 sid 발급)
//   SUBSCRIBE  → sid 사용해서 정기결제 차회 결제 (사용자 인증 없이)
//   INACTIVE   → 정기결제 해지
//   CANCEL     → 결제 취소·환불
//
// 모든 함수는 서버 사이드에서만 호출. NEXT_PUBLIC_ 접두사 키 사용 금지.

const API_BASE = "https://open-api.kakaopay.com";

function getSecret(): string {
  const key = process.env.KAKAOPAY_SECRET_KEY;
  if (!key) {
    throw new Error(
      "KAKAOPAY_SECRET_KEY 환경변수가 설정되지 않았습니다 (서버 전용 키)"
    );
  }
  return key;
}

function authHeader(): Record<string, string> {
  return {
    Authorization: `SECRET_KEY ${getSecret()}`,
    "Content-Type": "application/json",
  };
}

export function getCid(type: "onetime" | "subscription"): string {
  if (type === "onetime") {
    return process.env.KAKAOPAY_CID_ONETIME ?? "TC0ONETIME";
  }
  return process.env.KAKAOPAY_CID_SUBSCRIPTION ?? "TCSUBSCRIP";
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

// ============================================================
// READY — 결제 준비

export interface ReadyParams {
  type: "onetime" | "subscription";
  partnerOrderId: string;
  partnerUserId: string;
  itemName: string;
  totalAmount: number;
  taxFreeAmount?: number;
  quantity?: number;
}

export interface ReadyResponse {
  tid: string;
  next_redirect_pc_url: string;
  next_redirect_mobile_url: string;
  next_redirect_app_url: string;
  android_app_scheme: string;
  ios_app_scheme: string;
  created_at: string;
}

export async function ready(params: ReadyParams): Promise<ReadyResponse> {
  const cid = getCid(params.type);
  const site = getSiteUrl();
  const body = {
    cid,
    partner_order_id: params.partnerOrderId,
    partner_user_id: params.partnerUserId,
    item_name: params.itemName,
    quantity: params.quantity ?? 1,
    total_amount: params.totalAmount,
    tax_free_amount: params.taxFreeAmount ?? 0,
    approval_url: `${site}/api/payment/kakao/approve?type=${params.type}&order=${encodeURIComponent(params.partnerOrderId)}`,
    cancel_url: `${site}/api/payment/kakao/cancel?order=${encodeURIComponent(params.partnerOrderId)}`,
    fail_url: `${site}/api/payment/kakao/fail?order=${encodeURIComponent(params.partnerOrderId)}`,
  };

  const res = await fetch(`${API_BASE}/online/v1/payment/ready`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ReadyResponse & { error_code?: string; error_message?: string };
  if (!res.ok) {
    throw new KakaoPayError(
      `READY 실패: ${json.error_message ?? res.statusText}`,
      json.error_code,
      res.status
    );
  }
  return json;
}

// ============================================================
// APPROVE — 결제 승인 (사용자 인증 후 pg_token 수신)

export interface ApproveParams {
  type: "onetime" | "subscription";
  tid: string;
  partnerOrderId: string;
  partnerUserId: string;
  pgToken: string;
}

export interface ApproveResponse {
  aid: string;
  tid: string;
  cid: string;
  sid?: string;                       // 정기결제 첫 결제 승인 시에만
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: "MONEY" | "CARD";
  item_name: string;
  quantity: number;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  card_info?: {
    purchase_corp?: string;
    purchase_corp_code?: string;
    issuer_corp?: string;
    issuer_corp_code?: string;
    kakaopay_purchase_corp?: string;
    bin?: string;
    card_type?: string;
    install_month?: string;
    approved_id?: string;
    card_mid?: string;
    interest_free_install?: string;
    card_item_code?: string;
  };
  created_at: string;
  approved_at: string;
}

export async function approve(params: ApproveParams): Promise<ApproveResponse> {
  const cid = getCid(params.type);
  const res = await fetch(`${API_BASE}/online/v1/payment/approve`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      cid,
      tid: params.tid,
      partner_order_id: params.partnerOrderId,
      partner_user_id: params.partnerUserId,
      pg_token: params.pgToken,
    }),
  });
  const json = (await res.json()) as ApproveResponse & {
    error_code?: string;
    error_message?: string;
  };
  if (!res.ok) {
    throw new KakaoPayError(
      `APPROVE 실패: ${json.error_message ?? res.statusText}`,
      json.error_code,
      res.status
    );
  }
  return json;
}

// ============================================================
// SUBSCRIBE — 정기결제 차회 (사용자 인증 없이 sid 로 청구)

export interface SubscribeParams {
  sid: string;
  partnerOrderId: string;
  partnerUserId: string;
  itemName: string;
  totalAmount: number;
  taxFreeAmount?: number;
  quantity?: number;
}

export async function subscribe(
  params: SubscribeParams
): Promise<ApproveResponse> {
  const cid = getCid("subscription");
  const res = await fetch(`${API_BASE}/online/v1/payment/subscription`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      cid,
      sid: params.sid,
      partner_order_id: params.partnerOrderId,
      partner_user_id: params.partnerUserId,
      quantity: params.quantity ?? 1,
      item_name: params.itemName,
      total_amount: params.totalAmount,
      tax_free_amount: params.taxFreeAmount ?? 0,
    }),
  });
  const json = (await res.json()) as ApproveResponse & {
    error_code?: string;
    error_message?: string;
  };
  if (!res.ok) {
    throw new KakaoPayError(
      `SUBSCRIBE 실패: ${json.error_message ?? res.statusText}`,
      json.error_code,
      res.status
    );
  }
  return json;
}

// ============================================================
// INACTIVE — 정기결제 해지

export interface InactiveResponse {
  cid: string;
  sid: string;
  status: "INACTIVE";
  created_at: string;
  inactivated_at: string;
  last_approved_at?: string;
}

export async function inactiveSubscription(sid: string): Promise<InactiveResponse> {
  const cid = getCid("subscription");
  const res = await fetch(
    `${API_BASE}/online/v1/payment/manage/subscription/inactive`,
    {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ cid, sid }),
    }
  );
  const json = (await res.json()) as InactiveResponse & {
    error_code?: string;
    error_message?: string;
  };
  if (!res.ok) {
    throw new KakaoPayError(
      `INACTIVE 실패: ${json.error_message ?? res.statusText}`,
      json.error_code,
      res.status
    );
  }
  return json;
}

// ============================================================
// CANCEL — 결제 취소·환불

export interface CancelParams {
  type: "onetime" | "subscription";
  tid: string;
  cancelAmount: number;
  cancelTaxFreeAmount?: number;
  cancelVatAmount?: number;
}

export interface CancelResponse {
  aid: string;
  tid: string;
  cid: string;
  status: "CANCEL_PAYMENT" | "PART_CANCEL_PAYMENT";
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: "MONEY" | "CARD";
  item_name: string;
  quantity: number;
  amount: { total: number; tax_free: number; vat: number; point: number; discount: number };
  approved_cancel_amount: { total: number; tax_free: number; vat: number; point: number; discount: number };
  canceled_amount: { total: number; tax_free: number; vat: number; point: number; discount: number };
  cancel_available_amount: { total: number; tax_free: number; vat: number; point: number; discount: number };
  created_at: string;
  approved_at: string;
  canceled_at: string;
}

export async function cancelPayment(
  params: CancelParams
): Promise<CancelResponse> {
  const cid = getCid(params.type);
  const res = await fetch(`${API_BASE}/online/v1/payment/cancel`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      cid,
      tid: params.tid,
      cancel_amount: params.cancelAmount,
      cancel_tax_free_amount: params.cancelTaxFreeAmount ?? 0,
      cancel_vat_amount: params.cancelVatAmount,
    }),
  });
  const json = (await res.json()) as CancelResponse & {
    error_code?: string;
    error_message?: string;
  };
  if (!res.ok) {
    throw new KakaoPayError(
      `CANCEL 실패: ${json.error_message ?? res.statusText}`,
      json.error_code,
      res.status
    );
  }
  return json;
}

// ============================================================
// Error

export class KakaoPayError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "KakaoPayError";
    this.code = code;
    this.status = status;
  }
}
