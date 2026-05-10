import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import {
  parseExcel,
  rowToListing,
  autoMapHeaders,
} from "@/lib/excel-parser";
import { STANDARD_COLUMNS, type StandardColumn } from "@/lib/column-mappings";

export const runtime = "nodejs";
export const maxDuration = 60;

// 두 단계:
//
//   STAGE A — multipart/form-data POST
//     file (xlsx) 받아서 헤더 + 자동 매핑 + sample 3건 반환 (DB 저장 X)
//     → 클라이언트가 "이 매핑 맞나요?" 검토
//
//   STAGE B — application/json POST
//     { stage: "confirm", file_blob_b64, mapping, name }
//     사용자 확인된 매핑으로 datasets + listings 일괄 insert
//
//   단, 큰 파일 base64는 비효율 → 1단계에서 파일을 parse한 결과(rows)를
//   서버에 잠시 캐시(in-memory)하면 좋지만 serverless에선 보장 안 됨.
//   대신 클라이언트에 rows를 돌려주고, 확정 시 다시 보내는 방식 사용.
//
//   응답 크기 감안: 첫 단계에선 sample 3건만, 확정은 별도 endpoint에서 raw 파일 재전송.

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // STAGE B: confirm — JSON 본문으로 ParsedListing[] + dataset 메타 받기
  if (contentType.includes("application/json")) {
    return handleConfirm(req, user.id, supabase);
  }

  // STAGE A: analyze — multipart 파일 받기
  return handleAnalyze(req);
}

async function handleAnalyze(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일을 첨부해주세요" }, { status: 400 });
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "xlsx / xls / csv 파일만 지원" },
      { status: 400 }
    );
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { cellFormula: true, cellHTML: false });
    parsed = parseExcel(workbook);
  } catch (e) {
    return NextResponse.json(
      {
        error: "엑셀 파싱 실패",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 400 }
    );
  }

  if (parsed.headers.length === 0) {
    return NextResponse.json(
      { error: "헤더를 찾을 수 없습니다. 첫 행이 헤더인지 확인해주세요." },
      { status: 400 }
    );
  }
  if (parsed.totalRows === 0) {
    return NextResponse.json(
      { error: "데이터 행이 0건입니다." },
      { status: 400 }
    );
  }

  const mapping = autoMapHeaders(parsed.headers);

  // sample 3건 — rowToListing 적용한 결과
  const sample = parsed.rows.slice(0, 3).map((r) => rowToListing(r, mapping));

  return NextResponse.json({
    ok: true,
    stage: "analyzed",
    filename: file.name,
    headers: parsed.headers,
    mapping,
    row_count: parsed.totalRows,
    sample,
    // 확정 시 보낼 데이터 (클라이언트가 그대로 다시 전송)
    rows: parsed.rows,
  });
}

interface ConfirmBody {
  filename?: string;
  name?: string;
  rows?: Array<Record<string, unknown>>;
  mapping?: Record<string, StandardColumn | null>;
}

async function handleConfirm(
  req: NextRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
) {
  let body: ConfirmBody;
  try {
    body = (await req.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  const mapping = (body.mapping ?? {}) as Record<string, StandardColumn | null>;
  const filename = typeof body.filename === "string" ? body.filename : null;
  const datasetName =
    (typeof body.name === "string" && body.name.trim()) ||
    filename?.replace(/\.(xlsx|xls|csv)$/i, "") ||
    "업로드 데이터셋";

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "rows가 비어있습니다" }, { status: 400 });
  }

  // mapping 검증 — 표준 컬럼만 허용
  for (const [, std] of Object.entries(mapping)) {
    if (std !== null && !STANDARD_COLUMNS.includes(std)) {
      return NextResponse.json(
        { error: `허용되지 않는 표준 컬럼: ${std}` },
        { status: 400 }
      );
    }
  }

  // datasets row insert
  const { data: dataset, error: dErr } = await supabase
    .from("datasets")
    .insert({
      user_id: userId,
      name: datasetName,
      original_filename: filename,
      row_count: rows.length,
    })
    .select("id")
    .single();

  if (dErr || !dataset) {
    return NextResponse.json(
      { error: "데이터셋 저장 실패", detail: dErr?.message },
      { status: 500 }
    );
  }

  // listings batch insert (1000개씩) — 실패하면 dataset 롤백
  const BATCH = 1000;
  let inserted = 0;
  let firstError: string | null = null;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => {
      const listing = rowToListing(r, mapping);
      return { dataset_id: dataset.id, ...listing };
    });
    const { error: lErr } = await supabase.from("listings").insert(batch);
    if (lErr) {
      firstError = lErr.message;
      break;
    }
    inserted += batch.length;
  }

  if (firstError) {
    // 롤백
    await supabase.from("datasets").delete().eq("id", dataset.id);
    return NextResponse.json(
      {
        error: "매물 저장 실패 — 롤백됨",
        detail: firstError,
        inserted_before_fail: inserted,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    stage: "confirmed",
    dataset_id: dataset.id,
    row_count: rows.length,
    inserted,
  });
}
