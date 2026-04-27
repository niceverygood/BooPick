import { NextRequest, NextResponse } from "next/server";
import { extractTags } from "@/lib/tagging/extract-tags";

// loadPrompt가 fs.readFile을 사용 → Edge Runtime 불가
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON 파싱 실패" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "객체 본문이 필요합니다" },
      { status: 400 }
    );
  }

  const { description, short_description, use_haiku } = body as {
    description?: unknown;
    short_description?: unknown;
    use_haiku?: unknown;
  };

  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json(
      { error: "description 필드(문자열)가 필요합니다" },
      { status: 400 }
    );
  }

  try {
    const result = await extractTags({
      description,
      shortDescription:
        typeof short_description === "string" ? short_description : undefined,
      useHaiku: use_haiku === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "태깅 실패" },
      { status: 500 }
    );
  }
}
