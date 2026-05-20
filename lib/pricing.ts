// 부픽 가격 정책 (V3) — 정기구독 중심
//
// 단일 소스 — 가격·할인·주기는 모두 여기서. UI/API/약관 어디서나 import.
//
// 메인 흐름:
//   - Basic: 무료 (체험·진입)
//   - Pro 월간: 49,000원/월 (기본)
//   - Pro 연간: 470,000원/년 (20% 할인 ≒ 2.4개월 무료, 권장)
//   - 단건:    9,900원/1회 (정기 부담 X, 보조 옵션)

export type BillingCycle = "monthly" | "yearly" | "onetime";

export interface PricingOption {
  cycle: BillingCycle;
  /** 1회 청구 금액 (원) */
  amount: number;
  /** 월 환산 금액 (원) — 비교용 */
  perMonth: number;
  /** 카카오페이 item_name */
  itemName: string;
  /** 사용자 노출 라벨 */
  label: string;
  /** 사용자 노출 부제 */
  sub: string;
  /** 정기구독 여부 */
  isSubscription: boolean;
  /** 다음 결제 주기 — 정기일 때만 (개월 단위) */
  monthsPerCycle: number;
  /** UI 강조도 */
  highlight?: "recommended" | "best_value";
  /** 정기→정기로 갈아탈 때 안내 */
  savingText?: string;
}

// 가격표 (원)
export const PRICING: Record<BillingCycle, PricingOption> = {
  monthly: {
    cycle: "monthly",
    amount: 49_000,
    perMonth: 49_000,
    itemName: "부픽 Pro 월간 구독",
    label: "월간",
    sub: "매월 자동 결제",
    isSubscription: true,
    monthsPerCycle: 1,
    highlight: "recommended",
  },
  yearly: {
    cycle: "yearly",
    amount: 470_000,
    perMonth: Math.round(470_000 / 12), // 39,167원
    itemName: "부픽 Pro 연간 구독",
    label: "연간",
    sub: "1년 자동 결제 · 2.4개월 무료",
    isSubscription: true,
    monthsPerCycle: 12,
    highlight: "best_value",
    savingText: "월간 대비 약 20% 절약",
  },
  onetime: {
    cycle: "onetime",
    amount: 9_900,
    perMonth: 9_900,
    itemName: "부픽 단건 리포트 결제",
    label: "단건",
    sub: "1회 한정 · 자동 갱신 없음",
    isSubscription: false,
    monthsPerCycle: 0,
  },
};

// 연간 할인율 계산 — 사용자 노출용
export const YEARLY_DISCOUNT_PERCENT = Math.round(
  ((PRICING.monthly.perMonth * 12 - PRICING.yearly.amount) /
    (PRICING.monthly.perMonth * 12)) *
    100
); // 약 20

// 연간 절약 금액 (원) — 월간 12개월 - 연간 1회
export const YEARLY_SAVINGS_WON =
  PRICING.monthly.amount * 12 - PRICING.yearly.amount; // 588,000 - 470,000 = 118,000

// 단건 결제 허용 범위 (서버 검증용)
export const ONETIME_MIN = 1_000;
export const ONETIME_MAX = 1_000_000;

// 정기구독 옵션만 (UI 토글용)
export const SUBSCRIPTION_OPTIONS: PricingOption[] = [
  PRICING.monthly,
  PRICING.yearly,
];

// 결제 종류 정규화 — UI/API 변환
//   "monthly" / "yearly" → ready API type=subscription, cycle 별도 보관
//   "onetime"            → ready API type=onetime
export function toKakaoType(cycle: BillingCycle): "subscription" | "onetime" {
  return cycle === "onetime" ? "onetime" : "subscription";
}

// 다음 결제일 계산 (정기구독)
export function nextChargeAt(
  cycle: BillingCycle,
  base: Date = new Date()
): Date {
  const next = new Date(base);
  const months = PRICING[cycle].monthsPerCycle;
  if (months === 0) return next;
  next.setMonth(next.getMonth() + months);
  return next;
}

// 사용자 노출용 금액 포맷 — "49,000원" / "470,000원"
export function formatPrice(amount: number, withWon = true): string {
  return withWon ? `${amount.toLocaleString()}원` : amount.toLocaleString();
}
