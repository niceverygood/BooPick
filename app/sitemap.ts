import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://boo-pick-f52g.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/find`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/guide`, changeFrequency: "daily", priority: 0.8 },
  ];

  // 발행된 가이드 모두
  try {
    const admin = createAdminClient();
    const { data: guides } = await admin
      .from("guides")
      .select("slug, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(2000);

    for (const g of guides ?? []) {
      entries.push({
        url: `${BASE_URL}/guide/${g.slug}`,
        lastModified: g.published_at ? new Date(g.published_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    // 임차인 풀 노출 매물 (사이트맵엔 포함하되 변경 빈도 high)
    const { data: listings } = await admin
      .from("listings")
      .select("id, updated_at")
      .eq("status", "active")
      .eq("tenant_pool_enabled", true)
      .order("updated_at", { ascending: false })
      .limit(2000);

    for (const l of listings ?? []) {
      entries.push({
        url: `${BASE_URL}/find/${l.id}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : undefined,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  } catch {
    // env 미설정 시 base entries만
  }

  return entries;
}
