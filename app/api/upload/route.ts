import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { parseExcel } from "@/lib/excel-parser";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/upload (multipart/form-data: file)
//   xlsx 업로드 → datasets 생성 + listings 일괄 insert
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "파일을 첨부해주세요" },
      { status: 400 }
    );
  }
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "xlsx / xls 파일만 지원" },
      { status: 400 }
    );
  }

  let parsed;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
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

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "행이 0건입니다. 컬럼명/데이터를 확인해주세요." },
      { status: 400 }
    );
  }

  // datasets insert
  const { data: dataset, error: dErr } = await supabase
    .from("datasets")
    .insert({
      user_id: user.id,
      name: file.name.replace(/\.(xlsx|xls)$/i, ""),
      original_filename: file.name,
      row_count: parsed.length,
    })
    .select("id")
    .single();

  if (dErr || !dataset) {
    return NextResponse.json(
      { error: "데이터셋 저장 실패", detail: dErr?.message },
      { status: 500 }
    );
  }

  // listings batch insert (1000개씩)
  const BATCH = 1000;
  let inserted = 0;
  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH).map((p) => ({
      dataset_id: dataset.id,
      ...p,
    }));
    const { error: lErr } = await supabase.from("listings").insert(batch);
    if (lErr) {
      console.error("[upload] listings insert error:", lErr.message);
      continue;
    }
    inserted += batch.length;
  }

  return NextResponse.json({
    ok: true,
    dataset_id: dataset.id,
    row_count: parsed.length,
    inserted,
  });
}
