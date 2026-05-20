// 정기 차회 결제 실패 시 재시도 정책
//
// 카카오페이 subscribe() 실패 → 에러 코드 분류 → 다음 행동 결정.
//
// 정책:
//   - 일시 에러 (TIMEOUT / 5xx / 네트워크): 즉시 retry_later (1시간 뒤 — 단,
//     실제 재시도는 일 1회 cron 의 20h 게이트로 사실상 다음날)
//   - 잔액 부족 / 한도 초과: 3일 뒤 retry_later, 최대 3회 → 초과 시 inactive(+유예 7일)
//   - 카드 만료 / SID 무효 / 인증 만료: 즉시 inactive (재시도 불가, +유예 7일)
//   - 알 수 없는 에러: 보수적으로 3일 뒤 retry_later (최대 3회 동일 적용)
//
// 유예기간(grace_period_until): inactive 되어도 이 시점까지는 Pro 유지 후 강등.

export type RetryDecision =
  | { action: "retry_later"; nextAttemptAt: Date }
  | { action: "inactive"; gracePeriodUntil: Date; reason: string };

export const MAX_RETRIES = 3;
export const GRACE_DAYS = 7;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type ErrorCategory = "transient" | "funds" | "card_dead" | "unknown";

// 카카오페이 에러 코드/메시지 → 카테고리.
// 실제 코드 표기가 가맹점/버전마다 달라 키워드 매칭 + 보수적 fallback.
function classify(errorCode: string): ErrorCategory {
  const c = (errorCode || "").toUpperCase();

  // 카드/구독키 자체가 죽은 경우 — 재시도 무의미
  if (
    /SID|SUBSCRIPTION.*(INVALID|EXPIRE|INACTIVE)/.test(c) ||
    /CARD.*(EXPIRE|INVALID|LOST|STOLEN|SUSPEND)/.test(c) ||
    /AUTH.*(EXPIRE|FAIL)/.test(c) ||
    /UNREGISTERED|DEREGISTERED|NOT_FOUND_SID/.test(c)
  ) {
    return "card_dead";
  }

  // 잔액/한도 — 시간 두고 재시도 가치 있음
  if (
    /INSUFFICIENT|BALANCE|LIMIT|EXCEED|OVER_QUOTA|RESTRICT/.test(c)
  ) {
    return "funds";
  }

  // 일시 장애 — 곧 회복 가능
  if (
    /TIMEOUT|TIMED_OUT|TEMPORARK|TEMPORARY|UNAVAILABLE|INTERNAL|5\d\d|NETWORK|TRY_AGAIN|BUSY/.test(
      c
    )
  ) {
    return "transient";
  }

  return "unknown";
}

export function decideRetry(
  errorCode: string,
  currentRetryCount: number,
  now: Date = new Date()
): RetryDecision {
  const category = classify(errorCode);

  // 재시도 불가 — 즉시 비활성 + 유예
  if (category === "card_dead") {
    return {
      action: "inactive",
      gracePeriodUntil: new Date(now.getTime() + GRACE_DAYS * DAY_MS),
      reason: `card_dead:${errorCode}`,
    };
  }

  // 일시 장애 — 짧게 재시도 (재시도 횟수 소진 안 함)
  if (category === "transient") {
    return {
      action: "retry_later",
      nextAttemptAt: new Date(now.getTime() + 1 * HOUR_MS),
    };
  }

  // funds / unknown — 최대 횟수 체크
  const attempts = currentRetryCount + 1;
  if (attempts >= MAX_RETRIES) {
    return {
      action: "inactive",
      gracePeriodUntil: new Date(now.getTime() + GRACE_DAYS * DAY_MS),
      reason: `max_retries(${attempts}):${errorCode}`,
    };
  }
  return {
    action: "retry_later",
    nextAttemptAt: new Date(now.getTime() + 3 * DAY_MS),
  };
}

// 일시 에러는 재시도 횟수에 포함하지 않음 (charge 로직에서 사용)
export function countsTowardMax(errorCode: string): boolean {
  return classify(errorCode) !== "transient";
}
