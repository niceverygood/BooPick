// 부픽 V2 funnel 트래킹 (클라이언트)
//
// 사용:
//   import { trackEvent } from '@/lib/tracking/funnel';
//   useEffect(() => { trackEvent('landing_view'); }, []);

import { getAnonToken } from "@/lib/tenant/anon";

export type FunnelEventType =
  | "landing_view"
  | "search"
  | "listing_view"
  | "inquiry_click"
  | "inquiry_submit"
  | "agent_contacted"
  | "meeting"
  | "contracted"
  | "chat_start"
  | "guide_view";

interface UTM {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

interface TrackPayload {
  listing_id?: string;
  query?: string;
  guide_slug?: string;
  metadata?: Record<string, unknown>;
}

const UTM_STORAGE_KEY = "boopick_utm";

// URL → UTM 추출 + sessionStorage에 저장 (첫 방문 시)
function captureUTM(): UTM {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const fresh: UTM = {};
    let hasFresh = false;
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ] as const) {
      const v = params.get(k);
      if (v) {
        fresh[k] = v;
        hasFresh = true;
      }
    }
    if (hasFresh) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as UTM;
  } catch {}
  return {};
}

function detectDevice(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export async function trackEvent(
  eventType: FunnelEventType,
  payload?: TrackPayload
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const utm = captureUTM();
    const body = {
      event_type: eventType,
      anon_token: getAnonToken(),
      utm,
      device_type: detectDevice(),
      referer: document.referrer || null,
      listing_id: payload?.listing_id,
      query: payload?.query,
      guide_slug: payload?.guide_slug,
      metadata: payload?.metadata,
    };

    // sendBeacon 우선 (페이지 떠날 때도 발송 보장)
    const blob = new Blob([JSON.stringify(body)], {
      type: "application/json",
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/tracking/event", blob);
    } else {
      void fetch("/api/tracking/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // 트래킹 실패는 사용자 흐름에 영향 X
  }
}
