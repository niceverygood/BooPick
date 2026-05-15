// Pro 구독 결제 요청 접수 (PG 연동 전 단계)
//
// 카카오페이 심사 시점:
//   - 결제 자체는 미구현이어도 됨
//   - 단, "결제하기" 버튼 클릭 → 결제 정보 + 약관 수집까지 완전한 흐름 필요
//
// 현재 구현:
//   - 결제 요청을 beta_requests 테이블에 저장 (status='pending')
//   - 한대표가 어드민에서 검토 후 수동 Pro 승격
//   - 추후 PG 연동(KakaoPay / Toss) 시 이 라우트 대체

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CheckoutRequestBody {
  email: string;
  name: string;
  phone: string;
  company: string;
  biz_no?: string | null;
  pay_method: "kakaopay" | "card" | "vbank";
  plan: "pro";
  price_won: number;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다" },
      { status: 401 }
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = (await req.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "JSON 파싱 실패" }, { status: 400 });
  }

  // 필수 항목 검증
  if (
    !body.email?.trim() ||
    !body.name?.trim() ||
    !body.phone?.trim() ||
    !body.company?.trim()
  ) {
    return NextResponse.json(
      { error: "필수 항목이 누락되었습니다 (이메일·대표자·연락처·사무소명)" },
      { status: 400 }
    );
  }

  // beta_requests 에 결제 요청 row 작성 (use_case 컬럼에 결제 정보 직렬화)
  const checkoutMeta = {
    type: "checkout_pro",
    pay_method: body.pay_method,
    plan: body.plan,
    price_won: body.price_won,
    phone: body.phone.trim(),
    biz_no: body.biz_no?.trim() ?? null,
    submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("beta_requests").insert({
    user_id: user.id,
    email: body.email.trim(),
    company: body.company.trim(),
    experience_years: null,
    current_tools: `결제수단: ${body.pay_method} / 연락처: ${body.phone.trim()}`,
    use_case: JSON.stringify(checkoutMeta),
    status: "pending",
  });

  if (error) {
    console.error("[checkout] insert fail:", error.message);
    return NextResponse.json(
      { error: "결제 요청 저장 실패", detail: error.message },
      { status: 500 }
    );
  }

  console.log(
    `[checkout] ${body.email} requested Pro (${body.pay_method}, ${body.price_won}원)`
  );

  return NextResponse.json({
    ok: true,
    message: "결제 요청 접수 완료",
  });
}
