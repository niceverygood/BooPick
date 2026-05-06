import { callClaudeJSON, loadPrompt } from "@/lib/claude";

export type AdChannel = "naver" | "instagram" | "blog" | "kakao";
export type AdTone = "formal" | "casual" | "impact";

export interface AdCopyInput {
  listing: {
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
  channel: AdChannel;
  tone: AdTone;
  useHaiku?: boolean;
}

export interface AdCopyResult {
  title: string;
  body: string;
  hashtags: string[];
  tokens: { input: number; output: number };
}

export async function generateAdCopy(input: AdCopyInput): Promise<AdCopyResult> {
  const systemPrompt = await loadPrompt("ad-copy");

  const userMessage = JSON.stringify({
    address: input.listing.address,
    dong: input.listing.dong,
    area_pyeong: input.listing.area_pyeong,
    floor: input.listing.floor,
    building_type: input.listing.building_type,
    transaction_type: input.listing.transaction_type,
    deposit: input.listing.deposit,
    monthly_rent: input.listing.monthly_rent,
    description: input.listing.description?.slice(0, 1500) ?? null,
    short_description: input.listing.short_description,
    ai_tags: input.listing.ai_tags,
    channel: input.channel,
    tone: input.tone,
  });

  const result = await callClaudeJSON<{
    title?: unknown;
    body?: unknown;
    hashtags?: unknown;
  }>({
    systemPrompt,
    userMessage,
    maxTokens: 800,
    useHaiku: input.useHaiku ?? true,
  });

  const data = result.data;

  return {
    title: typeof data.title === "string" ? data.title : "",
    body: typeof data.body === "string" ? data.body : "",
    hashtags: Array.isArray(data.hashtags)
      ? data.hashtags.filter((x): x is string => typeof x === "string")
      : [],
    tokens: result.tokens,
  };
}
