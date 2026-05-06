import { callClaudeJSON, loadPrompt } from "@/lib/claude";

export interface GuideInput {
  listing: {
    id: string;
    address: string;
    dong: string | null;
    area_pyeong: number | null;
    floor: number | null;
    building_type: string | null;
    transaction_type: string | null;
    deposit: number | null;
    monthly_rent: number | null;
    description: string | null;
    short_description: string | null;
    ai_tags: unknown;
  };
  topic?: string;
  useHaiku?: boolean;
}

export interface GuideContent {
  title: string;
  slug: string;
  meta_description: string;
  body: string;
  hero_query: string;
  hashtags: string[];
  tokens: { input: number; output: number };
}

export async function generateGuide(input: GuideInput): Promise<GuideContent> {
  const systemPrompt = await loadPrompt("seo-guide");

  const topic =
    input.topic ??
    `${input.listing.dong ?? "강남"} ${
      input.listing.ai_tags &&
      typeof input.listing.ai_tags === "object" &&
      Array.isArray(
        (input.listing.ai_tags as { industries?: string[] }).industries
      )
        ? (input.listing.ai_tags as { industries: string[] }).industries[0] ??
          "상가"
        : "상가"
    } 창업 자리`;

  const userMessage = JSON.stringify({
    listing: {
      id: input.listing.id,
      address: input.listing.address,
      dong: input.listing.dong,
      area_pyeong: input.listing.area_pyeong,
      floor: input.listing.floor,
      building_type: input.listing.building_type,
      transaction_type: input.listing.transaction_type,
      deposit: input.listing.deposit,
      monthly_rent: input.listing.monthly_rent,
      description: input.listing.description?.slice(0, 1500),
      short_description: input.listing.short_description,
      ai_tags: input.listing.ai_tags,
    },
    topic,
  });

  const result = await callClaudeJSON<{
    title?: unknown;
    slug?: unknown;
    meta_description?: unknown;
    body?: unknown;
    hero_query?: unknown;
    hashtags?: unknown;
  }>({
    systemPrompt,
    userMessage,
    maxTokens: 2400,
    useHaiku: input.useHaiku ?? false, // 기본 Sonnet (퀄리티)
  });

  const data = result.data;
  const slug = sanitizeSlug(
    typeof data.slug === "string" ? data.slug : "",
    input.listing.id
  );

  return {
    title: typeof data.title === "string" ? data.title : "",
    slug,
    meta_description:
      typeof data.meta_description === "string" ? data.meta_description : "",
    body: typeof data.body === "string" ? data.body : "",
    hero_query:
      typeof data.hero_query === "string" ? data.hero_query : topic,
    hashtags: Array.isArray(data.hashtags)
      ? data.hashtags.filter((x): x is string => typeof x === "string")
      : [],
    tokens: result.tokens,
  };
}

function sanitizeSlug(raw: string, fallbackId: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  if (cleaned.length < 5) {
    return `guide-${fallbackId.slice(0, 8)}`;
  }
  return cleaned;
}
