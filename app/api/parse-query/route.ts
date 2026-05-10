import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/query-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const query = body.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "조건을 한 줄로 입력해주세요" },
      { status: 400 }
    );
  }

  try {
    const result = await parseQuery(query.trim());
    return NextResponse.json(result);
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
