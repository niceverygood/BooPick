"use client";

// 부픽 결제 폼 — 단건 / 정기 둘 다 지원
//
// 흐름:
//   1. 사용자가 결제 종류(정기/단건) + 금액 + 약관 동의
//   2. POST /api/payment/kakao/ready → next_redirect_pc_url / mobile_url 수신
//   3. window.location.href = 모바일이면 mobile_url, PC면 pc_url
//   4. 카카오페이 인증 후 자동 redirect:
//      - 성공 → /checkout/success
//      - 취소 → /checkout/cancel
//      - 실패 → /checkout/fail

import { useState } from "react";
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

type PlanType = "subscription" | "onetime";

const PRO_PRICE = 49_000;
const ONETIME_DEFAULT = 9_900;

export function CheckoutForm({ defaultEmail, defaultName }: Props) {
  const [planType, setPlanType] = useState<PlanType>("subscription");
  const [onetimeAmount, setOnetimeAmount] = useState(ONETIME_DEFAULT);

  const [email, setEmail] = useState(defaultEmail ?? "");
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bizNo, setBizNo] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRefund, setAgreeRefund] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allAgreed = agreeTerms && agreePrivacy && agreeRefund;
  const amount = planType === "subscription" ? PRO_PRICE : onetimeAmount;
  const canSubmit =
    !!email.trim() &&
    !!name.trim() &&
    !!phone.trim() &&
    !!company.trim() &&
    allAgreed &&
    amount > 0 &&
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
      const res = await fetch("/api/payment/kakao/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: planType,
          amount: planType === "onetime" ? onetimeAmount : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "결제 준비 실패");
      }

      // 모바일/PC 분기 — UA 단순 휴리스틱
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const redirectUrl = isMobile
        ? data.next_redirect_mobile_url
        : data.next_redirect_pc_url;
      if (!redirectUrl) {
        throw new Error("카카오페이 redirect URL 누락");
      }
      // 카카오페이 결제창으로 이동
      window.location.href = redirectUrl;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "결제 준비 실패");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      {/* LEFT */}
      <div className="space-y-5">
        {/* 결제 종류 선택 */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-3">
            <h2 className="text-base font-bold text-boopick-navy">
              ① 결제 종류
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <PlanCard
                selected={planType === "subscription"}
                onClick={() => setPlanType("subscription")}
                title="월 구독 (Pro)"
                price="49,000원"
                sub="매월 자동 결제 · 언제든 해지"
                badge="추천"
              />
              <PlanCard
                selected={planType === "onetime"}
                onClick={() => setPlanType("onetime")}
                title="단건 결제"
                price={`${onetimeAmount.toLocaleString()}원`}
                sub="1회 한정 · 자동 갱신 없음"
              />
            </div>

            {planType === "onetime" && (
              <div className="pt-3 border-t border-slate-100">
                <Label htmlFor="onetime-amount" className="text-sm">
                  단건 결제 금액 (원)
                </Label>
                <Input
                  id="onetime-amount"
                  type="number"
                  min={1000}
                  max={1000000}
                  step={100}
                  value={onetimeAmount}
                  onChange={(e) =>
                    setOnetimeAmount(
                      Math.max(1000, Math.min(1000000, Number(e.target.value) || 0))
                    )
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  1,000원 ~ 1,000,000원. 단건 결제는 자동 갱신되지 않습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 구매자 정보 */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-boopick-navy">
              ② 구매자 정보
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

        {/* 약관 */}
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
                도구입니다. <strong>매물 추천 · 중개 · 매매 알선이 아니며</strong>,
                분석 결과의 의사결정 책임은 사용자에게 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT */}
      <aside>
        <Card className="sticky top-20">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-boopick-navy">주문 요약</h2>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">상품</span>
                <span className="font-semibold text-boopick-navy">
                  {planType === "subscription"
                    ? "부픽 Pro 구독"
                    : "부픽 단건 결제"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">결제 주기</span>
                <span className="text-boopick-navy">
                  {planType === "subscription" ? "월 자동 결제" : "1회"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">금액</span>
                <span className="text-boopick-navy tabular-nums">
                  {amount.toLocaleString()}원
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
                {amount.toLocaleString()}
                <span className="text-sm ml-0.5">원</span>
              </span>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 text-base bg-[#FFEB00] hover:bg-[#FFEB00]/90 text-[#3C1E1E] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "처리 중…" : "카카오페이로 결제하기"}
            </Button>

            {err && (
              <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {err}
              </div>
            )}

            <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed">
              {planType === "subscription" ? (
                <>
                  <li>· 매월 같은 날짜에 자동 결제됩니다.</li>
                  <li>· 다음 결제일 24시간 전까지 해지 가능 (대시보드).</li>
                  <li>· 결제 7일 내 미사용 시 100% 환불.</li>
                </>
              ) : (
                <>
                  <li>· 1회 결제이며 자동 갱신되지 않습니다.</li>
                  <li>· 결제 7일 내 미사용 시 100% 환불.</li>
                </>
              )}
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

function PlanCard({
  selected,
  onClick,
  title,
  price,
  sub,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  price: string;
  sub: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-md border p-4 transition ${
        selected
          ? "border-boopick-orange ring-2 ring-boopick-orange/30 bg-amber-50/40"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-boopick-orange text-white text-[10px] font-semibold">
          {badge}
        </span>
      )}
      <div className="font-bold text-boopick-navy">{title}</div>
      <div className="text-xl font-bold text-boopick-orange mt-1 tabular-nums">
        {price}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
    </button>
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
