import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseQuery } from "@/lib/search/parse-query";
import { createEmbedding } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CandidateRow {
  id: string;
  agency_id: string;
  address: string;
  dong: string | null;
  building_name: string | null;
  area_pyeong: number | null;
  floor: number | null;
  building_type: string | null;
  transaction_type: string | null;
  deposit: number | null;
  monthly_rent: number | null;
  short_description: string | null;
  ai_tags: unknown;
  ai_embedding: unknown;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "객체 본문이 필요합니다" },
      { status: 400 }
    );
  }

  const { query } = body as { query?: unknown };
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "query 필드(문자열)가 필요합니다" },
      { status: 400 }
    );
  }

  const trimmed = query.trim();
  const t0 = Date.now();

  // 1. 파싱 + 임베딩 병렬
  let parsedResult, embedding;
  try {
    [parsedResult, embedding] = await Promise.all([
      parseQuery({ query: trimmed }),
      createEmbedding(trimmed),
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error: "AI 호출 실패 — 환경변수(ANTHROPIC_API_KEY, OPENAI_API_KEY) 확인 필요",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  const parsed = parsedResult.parsed;

  // 2. Supabase 후보 조회 (정형 필터 + is_shared=true 공개 풀)
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      {
        error: "Supabase 연결 실패 — 환경변수 확인 필요",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }

  let q = admin
    .from("listings")
    .select(
      "id, agency_id, address, dong, building_name, area_pyeong, floor, building_type, transaction_type, deposit, monthly_rent, short_description, ai_tags, ai_embedding"
    )
    .eq("status", "active")
    .eq("is_shared", true)
    .not("ai_embedding", "is", null);

  if (parsed.region.dong) q = q.eq("dong", parsed.region.dong);
  if (parsed.building_type) q = q.eq("building_type", parsed.building_type);
  if (parsed.transaction_type)
    q = q.eq("transaction_type", parsed.transaction_type);
  if (parsed.deposit.max != null) q = q.lte("deposit", parsed.deposit.max);
  if (parsed.monthly_rent.max != null)
    q = q.lte("monthly_rent", parsed.monthly_rent.max);
  if (parsed.area_pyeong.min != null)
    q = q.gte("area_pyeong", parsed.area_pyeong.min);
  if (parsed.area_pyeong.max != null)
    q = q.lte("area_pyeong", parsed.area_pyeong.max);

  const { data: candidates, error: qErr } = await q.limit(50);
  if (qErr) {
    return NextResponse.json(
      { error: "DB 쿼리 실패", detail: qErr.message },
      { status: 500 }
    );
  }

  // 3. 임베딩 유사도 계산 (JS) — 정형 필터로 거른 50건 → 상위 5건
  const ranked = ((candidates ?? []) as CandidateRow[])
    .map((row) => {
      const emb = parseEmbedding(row.ai_embedding);
      const similarity = emb ? cosineSim(embedding, emb) : 0;
      // 응답에서 ai_embedding 제거 (사이즈 + 보안)
      const { ai_embedding: _drop, ...rest } = row;
      void _drop;
      return { ...rest, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return NextResponse.json({
    query: trimmed,
    parsed,
    results: ranked,
    count: ranked.length,
    response_time_ms: Date.now() - t0,
  });
}

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function parseEmbedding(v: unknown): number[] | null {
  if (Array.isArray(v)) {
    return v.every((x) => typeof x === "number") ? (v as number[]) : null;
  }
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p) && p.every((x) => typeof x === "number")) {
        return p as number[];
      }
    } catch {
      return null;
    }
  }
  return null;
}
