import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://boo-pick-f52g.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
