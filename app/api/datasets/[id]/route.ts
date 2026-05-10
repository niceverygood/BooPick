import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// DELETE /api/datasets/[id]
//   - 본인 dataset인지 검증 (RLS이지만 명시적으로)
//   - listings는 ON DELETE CASCADE로 자동 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  // 본인 dataset 검증
  const { data: dataset } = await supabase
    .from("datasets")
    .select("id, user_id, name")
    .eq("id", params.id)
    .maybeSingle();

  if (!dataset) {
    return NextResponse.json({ error: "데이터셋이 없습니다" }, { status: 404 });
  }
  if (dataset.user_id !== user.id) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { error } = await supabase
    .from("datasets")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "삭제 실패", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deleted_id: params.id });
}
