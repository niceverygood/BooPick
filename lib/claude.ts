import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { join } from "path";

// Lazy init — 빌드 타임에 env undefined인 환경(Vercel "Collecting page data" 등)에서
// 모듈 top-level 평가만으로 throw되지 않도록.
let _client: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

const MODEL = "claude-sonnet-4-6";
const HAIKU = "claude-haiku-4-5";

export interface ClaudeCallOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  useHaiku?: boolean;
  jsonMode?: boolean;
}

export interface ClaudeCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callClaude(
  opts: ClaudeCallOptions
): Promise<ClaudeCallResult> {
  const model = opts.useHaiku ? HAIKU : MODEL;

  const response = await getAnthropic().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.systemPrompt,
    messages: [{ role: "user", content: opts.userMessage }],
  });

  const textContent = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return {
    content: textContent,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

export async function callClaudeJSON<T = unknown>(
  opts: ClaudeCallOptions
): Promise<{ data: T; tokens: { input: number; output: number } }> {
  const result = await callClaude({ ...opts, jsonMode: true });

  const cleaned = result.content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return {
      data: JSON.parse(cleaned) as T,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  } catch {
    throw new Error(`Claude JSON 파싱 실패: ${cleaned.slice(0, 200)}`);
  }
}

export type PromptName =
  | "parse-query"
  | "tag-listing"
  | "rank-results"
  | "ad-copy"
  | "voice-summary";

export async function loadPrompt(name: PromptName): Promise<string> {
  const path = join(process.cwd(), "prompts", `${name}.md`);
  return await readFile(path, "utf-8");
}
