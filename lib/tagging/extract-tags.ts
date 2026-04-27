import { callClaudeJSON, loadPrompt } from "@/lib/claude";

export interface ListingTags {
  industries: string[];
  facilities: string[];
  location_features: string[];
  condition: string[];
}

export interface ExtractTagsInput {
  description: string;
  shortDescription?: string;
  useHaiku?: boolean;
}

export interface ExtractTagsResult {
  tags: ListingTags;
  tokens: { input: number; output: number };
}

const EMPTY_TAGS: ListingTags = {
  industries: [],
  facilities: [],
  location_features: [],
  condition: [],
};

export async function extractTags(
  input: ExtractTagsInput
): Promise<ExtractTagsResult> {
  const systemPrompt = await loadPrompt("tag-listing");

  const userMessage = [
    `설명: ${input.description}`,
    input.shortDescription ? `간략설명: ${input.shortDescription}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callClaudeJSON<Partial<ListingTags>>({
    systemPrompt,
    userMessage,
    maxTokens: 500,
    useHaiku: input.useHaiku,
  });

  const tags: ListingTags = {
    industries: arrayOf(result.data.industries),
    facilities: arrayOf(result.data.facilities),
    location_features: arrayOf(result.data.location_features),
    condition: arrayOf(result.data.condition),
  };

  return { tags, tokens: result.tokens };
}

function arrayOf(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export { EMPTY_TAGS };
