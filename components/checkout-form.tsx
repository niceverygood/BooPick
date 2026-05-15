"use client";

// 부픽 Pro 구독 결제 폼
//
// 카카오페이 심사 요구사항 충족:
//   - 상품(Pro 구독) 명확히 표시
//   - 구매자 정보 + 약관 동의 + 결제 수단 선택
//   - "결제하기" 버튼까지 완전한 흐름 (실제 PG 연동 전 단계)
//
// 실제 결제 연동은 추후 (PG: KakaoPay / Toss). 현재는 신청서 → 한대표 수동 활성화 fallback.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Props {
  defaultEmail?: string | null;
  defaultName?: string | null;
}

type PayMethod = "kakaopay" | "card" | "vbank";

export function CheckoutForm({ defaultEmail, defaultName }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState(defaultEmail ?? "");
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("kakaopay");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allAgreed = agreeTerms && agreePrivacy && agreeRefund;
  const canSubmit =
    !!email.trim() &&
    !!name.trim() &&
    !!phone.trim() &&
    !!company.trim() &&
    allAgreed &&
    !submitting;

  function toggleAll(v: boolean) {
    setAgreeTerms(v);
    setAgreePrivacy(v);
    setAgreeRefund(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr(null);
    setSubmitting(true);
    try {
      // 카카오페이 심사 단계 — 실제 PG 연동은 추후. 현재는 신청서로 처리.
      const res = await fetch("/api/checkout/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim(),
          company: company.trim(),
          biz_no: bizNo.trim() || null,
          pay_method: payMethod,
          plan: "pro",
          price_won: 49000,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "결제 요청 처리 실패");
      }
      router.push("/checkout/complete");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "결제 요청 실패");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* LEFT — 구매자 정보 + 결제 수단 + 약관 */}
      <div className="space-y-5">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-boopick-navy">
              ① 구매자 정보
            </h2>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email" className="text-sm">
                  이메일 (계정) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="hello@bottle.kr"
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-sm">
                  대표자명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^\d-]/g, ""))
                  }
                  required
                  className="mt-1.5"
                  placeholder="010-1234-5678"
                />
              </div>
              <div>
                <Label htmlFor="company" className="text-sm">
                  공인중개사사무소명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="mt-1.5"
                  placeholder="○○공인중개사사무소"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="biz" className="text-sm">
                  사업자등록번호 (선택, 세금계산서용)
                </Label>
                <Input
                  id="biz"
                  value={bizNo}
                  onChange={(e) =>
                    setBizNo(e.target.value.replace(/[^\d-]/g, ""))
                  }
                  className="mt-1.5"
                  placeholder="123-45-67890"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-boopick-navy">
              ② 결제 수단
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {(
                [
                  { id: "kakaopay", label: "카카오페이", sub: "간편결제" },
                  { id: "card", label: "신용/체크카드", sub: "국내 카드" },
                  { id: "vbank", label: "가상계좌", sub: "무통장 입금" },
                ] as { id: PayMethod; label: string; sub: string }[]
              ).map((m) => (
                <label
                  key={m.id}
                  className={`cursor-pointer rounded-md border p-3 text-center transition ${
                    payMethod === m.id
                      ? "border-boopick-orange ring-2 ring-boopick-orange/30 bg-amber-50/40"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="pay-method"
                    value={m.id}
                    checked={payMethod === m.id}
                    onChange={() => setPayMethod(m.id)}
                    className="sr-only"
                  />
                  <div className="text-sm font-semibold text-boopick-navy">
                    {m.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {m.sub}
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              현재 베타 기간 동안에는 결제 요청 접수 후 한대표가 검토하여 수동
              활성화 안내드립니다. PG 연동(KakaoPay / Toss)은 정식 출시 시
              자동화됩니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h2 className="text-base font-bold text-boopick-navy">
              ③ 약관 동의
            </h2>

            <label className="flex items-start gap-2 cursor-pointer p-2 -mx-2 rounded hover:bg-slate-50">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(e) => toggleAll(e.target.checked)}
                className="mt-0.5 accent-boopick-orange"
              />
              <span className="text-sm font-semibold text-boopick-navy">
                모든 약관에 동의합니다 (필수)
              </span>
            </label>
            <Separator />

            <CheckRow
              checked={agreeTerms}
              onChange={setAgreeTerms}
              label="서비스 이용약관 동의"
              link="/terms"
            />
            <CheckRow
              checked={agreePrivacy}
              onChange={setAgreePrivacy}
              label="개인정보 수집 · 이용 동의"
              link="/privacy"
            />
            <CheckRow
              checked={agreeRefund}
              onChange={setAgreeRefund}
              label="환불 정책 확인 동의"
              link="/refund"
            />

            <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-0.5">⚠️ 분석 도구 안내</p>
              <p>
                부픽은 공인중개사가 보유한 매물 데이터를 분석하는 소프트웨어
                도구입니다. <strong>매물 추천 · 중개 · 매매 알선 서비스가
                아니며</strong>, 분석 결과는 참고용으로 모든 의사결정과 결과의
                책임은 사용자에게 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — 주문 요약 + 결제 버튼 */}
      <aside>
        <Card className="sticky top-20">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-boopick-navy">주문 요약</h2>
            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">상품</span>
                <span className="font-semibold text-boopick-navy">
                  부픽 Pro 구독
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">결제 주기</span>
                <span className="text-boopick-navy">월 정기 (1개월)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">월 정가</span>
                <span className="text-boopick-navy tabular-nums">
                  49,000원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">부가세</span>
                <span className="text-slate-500 tabular-nums">포함</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-boopick-navy">
                결제 금액
              </span>
              <span className="text-2xl font-bold text-boopick-orange tabular-nums">
                49,000<span className="text-sm ml-0.5">원</span>
              </span>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 text-base bg-boopick-orange hover:bg-boopick-orange/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "처리 중…" : "결제하기"}
            </Button>

            {err && (
              <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {err}
              </div>
            )}

            <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed">
              <li>· 결제 즉시 Pro 기능이 활성화됩니다.</li>
              <li>· 결제 7일 내 미사용 시 100% 환불 가능합니다.</li>
              <li>· 자동 갱신은 다음 결제일 24시간 전까지 해지 가능합니다.</li>
              <li>
                · 자세한 환불 정책은{" "}
                <Link href="/refund" className="text-boopick-orange underline">
                  여기
                </Link>
                .
              </li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  link,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  link: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer p-2 -mx-2 rounded hover:bg-slate-50">
      <span className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-boopick-orange"
        />
        {label} <span className="text-red-500">*</span>
      </span>
      <Link
        href={link}
        target="_blank"
        rel="noreferrer noopener"
        className="text-xs text-boopick-orange hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        보기 ↗
      </Link>
    </label>
  );
}
