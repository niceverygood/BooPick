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

  const extracted = extractJSON(result.content);

  try {
    return {
      data: JSON.parse(extracted) as T,
      tokens: { input: result.inputTokens, output: result.outputTokens },
    };
  } catch {
    throw new Error(`Claude JSON 파싱 실패: ${extracted.slice(0, 200)}`);
  }
}

// LLM이 코드 블록 + 추가 설명을 섞어 응답할 때를 대비한 robust JSON 추출
// 우선순위: ```json ... ``` 블록 → ``` ... ``` 블록 → 첫 { 부터 균형 맞는 } 까지
function extractJSON(text: string): string {
  const fenced =
    text.match(/```json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  if (start === -1) return text.trim();

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start).trim();
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
