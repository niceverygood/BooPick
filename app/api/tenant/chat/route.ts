import { NextRequest, NextResponse } from "next/server";
import { callClaudeJSON, loadPrompt } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ChatExtracted {
  dong?: string | null;
  building_type?: string | null;
  transaction_type?: string | null;
  area_pyeong_min?: number | null;
  area_pyeong_max?: number | null;
  deposit_max?: number | null;
  monthly_rent_max?: number | null;
  industries?: string[];
}

// POST /api/tenant/chat
//   body: { history: ChatTurn[], message: string }
//   returns: { reply, intent, extracted, ready_to_recommend }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message : "";
  const history = Array.isArray(body.history) ? body.history : [];

  // 대화 히스토리를 user message 안에 직렬화 (Claude 단일 턴 호출)
  const conversation = (history as ChatTurn[])
    .filter((t) => t && (t.role === "user" || t.role === "assistant"))
    .map((t) => `[${t.role === "user" ? "임차인" : "부픽"}] ${t.content}`)
    .join("\n");

  const userMessage =
    conversation.length > 0
      ? `이전 대화:\n${conversation}\n\n[임차인 새 메시지] ${message}`
      : `[임차인 첫 메시지] ${message || ""}`;

  try {
    const systemPrompt = await loadPrompt("tenant-chat");
    const result = await callClaudeJSON<{
      reply?: unknown;
      intent?: unknown;
      extracted?: unknown;
      ready_to_recommend?: unknown;
    }>({
      systemPrompt,
      userMessage,
      maxTokens: 600,
      useHaiku: true,
    });

    const data = result.data;
    return NextResponse.json({
      reply: typeof data.reply === "string" ? data.reply : "다시 한 번 말씀해 주실래요?",
      intent: typeof data.intent === "string" ? data.intent : "ask",
      extracted: (data.extracted ?? {}) as ChatExtracted,
      ready_to_recommend: data.ready_to_recommend === true,
      tokens: result.tokens,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "AI 호출 실패",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
