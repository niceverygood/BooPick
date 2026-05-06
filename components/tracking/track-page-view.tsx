"use client";

import { useEffect } from "react";
import { trackEvent, type FunnelEventType } from "@/lib/tracking/funnel";

interface Props {
  event: FunnelEventType;
  listingId?: string;
  guideSlug?: string;
  query?: string;
}

export function TrackPageView({ event, listingId, guideSlug, query }: Props) {
  useEffect(() => {
    trackEvent(event, {
      listing_id: listingId,
      guide_slug: guideSlug,
      query,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
