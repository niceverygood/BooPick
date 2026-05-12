// V3+ 업로드 라우트 — JSON 전용, Vercel 4.5MB body 제한 회피
//
// 이전: multipart로 전체 xlsx 업로드 → 서버 파싱 → 413 에러 (10MB+ 파일)
// 변경: 클라이언트가 브라우저에서 xlsx 파싱 → 3-stage JSON 흐름
//
//   STAGE A — analyze
//     POST { stage: "analyze", headers: string[], sample: Object[] }
//     → 자동 매핑 추론. payload ~5KB
//
//   STAGE B — create
//     POST { stage: "create", name: string, total_rows: number }
//     → datasets row INSERT, dataset_id 반환
//
//   STAGE C — batch (반복 호출)
//     POST { stage: "batch", dataset_id, mapping, rows: Object[], last?: bool }
//     → 받은 rows를 ParsedListing으로 변환 후 listings에 INSERT
//     → 매 batch 500~2000 row, ~500KB
//     → last=true 면 dataset.row_count 최종 업데이트

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rowToListing } from "@/lib/excel-parser";
import { autoMapHeaders, type StandardColumn } from "@/lib/column-mappings";
import {
  getCurrentProfile,
  checkDatasetLimit,
  TIER_LIMITS,
} from "@/lib/tier-check";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalyzePayload {
  stage: "analyze";
  headers: string[];
  sample: Array<Record<string, unknown>>;
}
interface CreatePayload {
  stage: "create";
  name: string;
  original_filename?: string;
  total_rows: number;
}
interface BatchPayload {
  stage: "batch";
  dataset_id: string;
  mapping: Record<string, StandardColumn | null>;
  rows: Array<Record<string, unknown>>;
  /** 마지막 batch면 true — row_count 최종 확정 */
  last?: boolean;
}

type Payload = AnalyzePayload | CreatePayload | BatchPayload;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  // JSON only
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      {
        error:
          "JSON 요청만 지원합니다. 파일은 브라우저에서 파싱한 후 batch로 보내주세요.",
      },
      { status: 415 }
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  switch (body.stage) {
    case "analyze":
      return handleAnalyze(body);
    case "create":
      return handleCreate(body, user.id, supabase);
    case "batch":
      return handleBatch(body, user.id, supabase);
    default:
      return NextResponse.json(
        { error: "알 수 없는 stage" },
        { status: 400 }
      );
  }
}

// ============================================================
// STAGE A — analyze (헤더 → 매핑 추론)

function handleAnalyze(p: AnalyzePayload) {
  if (!Array.isArray(p.headers) || p.headers.length === 0) {
    return NextResponse.json(
      { error: "headers가 비어있습니다" },
      { status: 400 }
    );
  }
  const mapping = autoMapHeaders(p.headers);
  return NextResponse.json({
    ok: true,
    headers: p.headers,
    mapping,
    sample: p.sample?.slice(0, 5) ?? [],
  });
}

// ============================================================
// STAGE B — create (datasets row 신규 생성)

async function handleCreate(
  p: CreatePayload,
  userId: string,
  supabase: ReturnType<typeof createClient>
) {
  if (!p.name || typeof p.name !== "string") {
    return NextResponse.json({ error: "데이터셋 이름 필요" }, { status: 400 });
  }
  const total = typeof p.total_rows === "number" ? p.total_rows : 0;

  // ───── 티어 한도 체크 (Basic: 1개) ─────
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "프로필 조회 실패" }, { status: 401 });
  }

  const { count: existingCount } = await supabase
    .from("datasets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const limit = checkDatasetLimit(profile, existingCount ?? 0);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Dataset limit reached",
        message:
          profile.tier === "basic"
            ? `베이직은 데이터셋 ${TIER_LIMITS.basic.monthly_datasets}개까지 가능합니다. ` +
              `기존 데이터셋을 삭제하거나, Pro로 업그레이드하면 무제한 사용 가능합니다.`
            : "데이터셋 한도에 도달했습니다.",
        tier: profile.tier,
        current: limit.current,
        limit: limit.limit,
      },
      { status: 403 }
    );
  }

  const { data: dataset, error } = await supabase
    .from("datasets")
    .insert({
      user_id: userId,
      name: p.name.trim(),
      original_filename: p.original_filename ?? null,
      row_count: 0, // batch 진행하며 마지막에 확정
    })
    .select("id")
    .single();

  if (error || !dataset) {
    return NextResponse.json(
      { error: "데이터셋 생성 실패", detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    dataset_id: (dataset as { id: string }).id,
    expected_rows: total,
  });
}

// ============================================================
// STAGE C — batch (listings INSERT)

async function handleBatch(
  p: BatchPayload,
  userId: string,
  supabase: ReturnType<typeof createClient>
) {
  if (!p.dataset_id) {
    return NextResponse.json({ error: "dataset_id 필요" }, { status: 400 });
  }
  if (!Array.isArray(p.rows) || p.rows.length === 0) {
    return NextResponse.json({ error: "rows가 비어있습니다" }, { status: 400 });
  }

  // 데이터셋 소유권 검증
  const { data: ds } = await supabase
    .from("datasets")
    .select("id, user_id, row_count")
    .eq("id", p.dataset_id)
    .maybeSingle();

  if (!ds) {
    return NextResponse.json({ error: "데이터셋이 없습니다" }, { status: 404 });
  }
  if ((ds as { user_id: string }).user_id !== userId) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // 행 변환
  const mapping = p.mapping ?? {};
  const listings = p.rows
    .map((row) => rowToListing(row, mapping))
    .map((l) => ({
      ...l,
      dataset_id: p.dataset_id,
    }));

  // batch insert (Supabase는 한 번에 1000건까지 권장)
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < listings.length; i += CHUNK) {
    const chunk = listings.slice(i, i + CHUNK);
    const { error } = await supabase.from("listings").insert(chunk);
    if (error) {
      return NextResponse.json(
        {
          error: "listings insert 실패",
          detail: error.message,
          inserted_before_error: inserted,
        },
        { status: 500 }
      );
    }
    inserted += chunk.length;
  }

  // 마지막 batch면 row_count 누적 확정
  const newCount =
    (ds as { row_count: number }).row_count + inserted;
  await supabase
    .from("datasets")
    .update({ row_count: newCount })
    .eq("id", p.dataset_id);

  return NextResponse.json({
    ok: true,
    inserted,
    cumulative_count: newCount,
    last: !!p.last,
  });
}
