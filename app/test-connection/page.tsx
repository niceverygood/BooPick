import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/claude";
import { createEmbedding } from "@/lib/openai";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  message: string;
}

async function checkSupabase(): Promise<CheckResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("agencies")
      .select("id", { count: "exact", head: true });
    if (error) {
      return { ok: false, message: `Supabase 에러: ${error.message}` };
    }
    return { ok: true, message: "agencies 테이블 쿼리 성공 (RLS 통과)" };
  } catch (e) {
    return {
      ok: false,
      message: `예외: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function checkClaude(): Promise<CheckResult> {
  try {
    const result = await callClaude({
      systemPrompt: "너는 한국어로 짧게 인사하는 친근한 어시스턴트다.",
      userMessage: "안녕",
      maxTokens: 50,
    });
    return {
      ok: true,
      message: `${result.model} 응답: "${result.content.slice(0, 60)}" (in ${result.inputTokens} / out ${result.outputTokens} tokens)`,
    };
  } catch (e) {
    return {
      ok: false,
      message: `Claude 에러: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function checkOpenAI(): Promise<CheckResult> {
  try {
    const embedding = await createEmbedding("hello");
    return {
      ok: true,
      message: `text-embedding-3-small 응답: ${embedding.length}차원 벡터 (예상 1536)`,
    };
  } catch (e) {
    return {
      ok: false,
      message: `OpenAI 에러: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export default async function TestConnectionPage() {
  const [supabase, claude, openai] = await Promise.all([
    checkSupabase(),
    checkClaude(),
    checkOpenAI(),
  ]);

  const checks = [
    { name: "Supabase", result: supabase },
    { name: "Claude (Anthropic)", result: claude },
    { name: "OpenAI Embedding", result: openai },
  ];

  return (
    <main
      className="min-h-screen px-4 py-12"
      style={{ backgroundColor: "hsl(var(--boopick-cream))" }}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="mb-6">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "hsl(var(--boopick-navy))" }}
          >
            연결 검증
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Supabase / Claude / OpenAI 3개 외부 API 작동 여부
          </p>
        </header>

        {checks.map(({ name, result }) => (
          <Card key={name}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span aria-hidden>{result.ok ? "✅" : "❌"}</span>
                {name}
              </CardTitle>
              <CardDescription className="font-medium">
                {result.ok ? "정상" : "실패"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="break-all text-sm text-slate-600">
                {result.message}
              </p>
            </CardContent>
          </Card>
        ))}

        <p className="pt-4 text-xs text-slate-400">
          이 페이지는 임시 검증용. PHASE 2 끝나면 (dashboard) 그룹으로 이동
          또는 삭제 예정.
        </p>
      </div>
    </main>
  );
}
