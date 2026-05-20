import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/brand";
import {
  PRICING,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_SAVINGS_WON,
} from "@/lib/pricing";

export default function Landing() {
  return (
    <main className="bg-cream-100">
      {/* HERO */}
      <section className="px-5 sm:px-10 pt-14 pb-12 sm:pt-20 sm:pb-16 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_minmax(0,520px)] gap-12 lg:gap-16 items-center">
          {/* 좌 — 카피 */}
          <div>
            <Chip tone="orange" icon={<SparkIcon />} className="px-3.5 py-1.5">
              매물 데이터셋 자동 분석 · 30초
            </Chip>
            <h1 className="mt-5 mb-6 text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight text-navy-800 text-balance">
              이 매물, <span className="text-brand-orange-500">어느 자리</span>에
              <br />
              추천할까요?
            </h1>
            <p className="text-lg text-slate-700 leading-relaxed mb-9 max-w-xl text-pretty">
              보유한 매물 데이터(엑셀)를 올리면{" "}
              <strong className="text-navy-800">부픽</strong>이 의뢰 조건에
              맞춰 적합도를 점수화한
              <br className="hidden sm:block" />
              <strong className="text-navy-800"> 내부 검토용 PDF 리포트</strong>로
              정리해 드립니다.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="bp-btn bp-btn-primary bp-btn-xl px-6"
              >
                <Link href="/signup">
                  지금 무료로 시작하기 <ArrowIcon />
                </Link>
              </Button>
              <Button asChild className="bp-btn bp-btn-ghost bp-btn-xl">
                <Link href="/pricing">가격 보기</Link>
              </Button>
            </div>

            {/* trust stat bar */}
            <div className="mt-12 sm:mt-14 max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[var(--sh-sm)] flex items-center gap-6 sm:gap-8">
              <Stat label="분석 매물" value="40,000" suffix="건+" />
              <Divider />
              <Stat label="평균 분석 시간" value="30" suffix="초" />
              <Divider />
              <Stat label="지원 업종" value="8" suffix="종+" />
            </div>
          </div>

          {/* 우 — 샘플 리포트 프리뷰 */}
          <div className="relative">
            <SamplePreview />
          </div>
        </div>
      </section>

      {/* 도구 정의 박스 */}
      <section className="px-5 sm:px-10 pb-2 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-cream-300 bg-cream-200/60 p-5 sm:p-6 text-sm sm:text-base">
          <p className="font-bold text-navy-800 mb-2">📌 부픽은 이런 도구입니다</p>
          <ul className="space-y-1.5 text-slate-700">
            <li>✓ 사무소 보유 매물 데이터를 분석해 의뢰 조건에 맞춰 <strong>점수화하는 소프트웨어</strong></li>
            <li>✓ 분석 결과는 <strong>내부 검토용 · 의뢰자 제안용 PDF</strong>로 출력</li>
            <li>✕ 매물 추천 · 중개 · 매매 알선 · 자문 서비스 <strong>아님</strong></li>
            <li>✕ 외부 매물 데이터 가공 · 재배포 <strong>아님</strong> (본인 데이터셋만 처리)</li>
          </ul>
        </div>
      </section>

      {/* STEPS */}
      <section className="px-5 sm:px-10 py-14 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <Chip tone="navy">How it works</Chip>
          <h2 className="mt-3.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-800">
            3단계, 정말 그게 다입니다.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          <Step
            n="01"
            icon={<UploadIcon />}
            title="엑셀 업로드"
            desc="사무소 보유 매물 데이터 xlsx 한 장만 올리면 컬럼을 자동 매핑·정규화합니다."
          />
          <Step
            n="02"
            icon={<SparkIcon size={22} />}
            title="의뢰 조건 입력"
            desc='"강남에 30평 이상, 보증금 1억 이하" 같이 평소 말투로 입력하면 AI가 자동 정형화합니다.'
          />
          <Step
            n="03"
            icon={<CheckIcon />}
            title="내부 검토용 PDF"
            desc="적합도 점수와 분석 사유가 담긴 PDF 리포트를 출력해 의뢰자 제안에 바로 활용합니다."
          />
        </div>
      </section>

      {/* 업종 특화 */}
      <section className="px-5 sm:px-10 pb-14 sm:pb-16 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-800">
            업종 특화 분석 알고리즘
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            업종마다 매물 평가 기준이 다릅니다. 부픽은 업종별 가중치로 점수를
            계산합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { e: "💍", t: "결혼식장" },
            { e: "☕", t: "카페" },
            { e: "📚", t: "학원" },
            { e: "🧘", t: "필라테스" },
            { e: "🍽️", t: "식당" },
            { e: "💇", t: "미용실" },
            { e: "🏥", t: "병원·의원" },
            { e: "🏢", t: "사무실" },
          ].map((i) => (
            <div
              key={i.t}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-[var(--sh-sm)]"
            >
              <div className="text-2xl mb-1">{i.e}</div>
              <div className="text-sm font-semibold text-navy-800">{i.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 가격 스트립 (navy) */}
      <section className="px-5 sm:px-10 pb-16 sm:pb-20 max-w-6xl mx-auto">
        <div className="rounded-3xl bg-navy-800 text-white p-8 sm:p-12 grid lg:grid-cols-[1fr_minmax(0,340px)] gap-10 items-center">
          <div>
            <Chip tone="orange" className="text-xs">
              연간 ⭐ {YEARLY_DISCOUNT_PERCENT}% 할인
            </Chip>
            <h2 className="mt-3.5 mb-3 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight leading-[1.15] text-balance">
              월{" "}
              <span className="num text-brand-orange-500">
                {PRICING.yearly.perMonth.toLocaleString()}원
              </span>
              으로
              <br />
              모든 의뢰를 빠르게 분석하세요.
            </h2>
            <p className="opacity-75 text-base mb-6 max-w-xl">
              Pro 연간 구독으로 무제한 분석·데이터셋·PDF 리포트까지. 카카오페이로
              1분이면 시작합니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bp-btn bp-btn-primary bp-btn-xl">
                <Link href="/checkout?cycle=yearly">Pro 시작하기</Link>
              </Button>
              <Button
                asChild
                className="bp-btn bp-btn-xl bg-transparent text-white border border-white/25 hover:bg-white/10"
              >
                <Link href="/pricing">가격 자세히</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-6">
            <div className="text-[13px] opacity-60 font-semibold">
              Pro 연간 (가장 인기)
            </div>
            <div className="num mt-1 text-5xl font-extrabold tracking-tight">
              {PRICING.yearly.amount.toLocaleString()}
              <span className="text-[22px] opacity-70 ml-1">원/년</span>
            </div>
            <div className="num text-sm opacity-60 mt-0.5">
              월 환산 {PRICING.yearly.perMonth.toLocaleString()}원 ·{" "}
              {YEARLY_SAVINGS_WON.toLocaleString()}원 절약
            </div>
            <div className="h-px bg-white/[0.12] my-4" />
            <ul className="space-y-2.5">
              {[
                "무제한 PDF 리포트",
                "데이터셋 무제한 · 영구 보관",
                "산업 관점 분석",
                "QR 코드 + 네이버부동산 링크",
                "세금계산서 발행",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px]">
                  <span className="text-brand-orange-500">
                    <CheckIcon size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          단건 결제(자동 갱신 없음)도 지원합니다 ·{" "}
          <Link
            href="/checkout?cycle=onetime"
            className="text-brand-orange-600 underline"
          >
            단건 결제 →
          </Link>
        </p>
      </section>

      {/* 면책 */}
      <section className="px-5 sm:px-10 pb-16 max-w-3xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-navy-800 mb-1">법적 고지 (Disclaimer)</p>
          <p>
            부픽은 매물 데이터 분석을 보조하는 소프트웨어 도구이며, 매물 추천 ·
            중개 · 매매 알선 · 자문 서비스가 아닙니다. 분석 결과는 입력 데이터와
            알고리즘에 기반한 참고용 정보로, 객관성을 절대적으로 보장하지
            않습니다. 모든 의사결정과 결과의 책임은 사용자에게 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}

// ── 부분 컴포넌트 ──────────────────────────────────────────

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="num text-2xl font-extrabold text-navy-800">
          {value}
        </span>
        <span className="num text-[13px] text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-9 bg-slate-200" />;
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bp-card bp-card-hover p-7">
      <div className="flex items-center gap-3 mb-4">
        <span className="num text-xs font-extrabold text-brand-orange-600 bg-brand-orange-50 px-2 py-0.5 rounded tracking-wider">
          {n}
        </span>
        <div className="w-11 h-11 rounded-[10px] bg-cream-100 text-navy-700 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold text-navy-800 mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

// 샘플 리포트 프리뷰 (faux chrome + 적합도 신호)
function SamplePreview() {
  return (
    <div className="relative bg-white rounded-[20px] shadow-[var(--sh-lg)] border border-slate-200 overflow-hidden -rotate-1">
      {/* faux browser chrome */}
      <div className="h-9 bg-cream-50 border-b border-slate-200 flex items-center px-3.5 gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e2786e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#f0bf3a]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#62c554]" />
        <span className="num ml-3 text-[11px] text-slate-500">
          boo-pick.vercel.app/dashboard/reports
        </span>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <Chip tone="navy">사무실</Chip>
          <span className="num text-[11px] text-slate-500">2026.05.18</span>
        </div>
        <div className="text-base font-bold text-navy-800">
          강남구 역삼동 · 7층 · 143평
        </div>
        <div className="num text-[22px] font-extrabold mt-1.5 text-navy-800">
          보증금 12억 / 월 1,200만
        </div>

        {/* 헤드라인 신호 */}
        <div className="mt-4 p-4 rounded-2xl border border-[var(--safe-bd)] flex gap-4 items-center bg-gradient-to-b from-[var(--safe-bg)] to-white">
          <div className="w-16 h-16 rounded-full bg-white border-4 border-[var(--safe-bd)] flex items-center justify-center text-[#14532d] shrink-0">
            <CheckIcon size={28} />
          </div>
          <div>
            <div className="text-[11px] font-bold text-[#14532d] uppercase tracking-wide">
              적합
            </div>
            <div className="text-[15px] font-bold text-navy-800 mt-0.5 leading-snug">
              종합 적합도 92점 — 면적·주차·연식 의뢰 조건 정확 부합
            </div>
          </div>
        </div>

        {/* 세부 신호 3개 */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { l: "면적", level: "safe" as const, v: "적정" },
            { l: "주차", level: "safe" as const, v: "우수" },
            { l: "임대료", level: "warn" as const, v: "주의" },
          ].map((c) => (
            <div
              key={c.l}
              className="p-3 rounded-[10px] border border-slate-200 bg-white"
            >
              <div className="text-[11px] text-slate-500">{c.l}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      c.level === "safe"
                        ? "var(--safe)"
                        : c.level === "warn"
                        ? "var(--warn)"
                        : "var(--risk)",
                  }}
                />
                <span className="text-[13px] font-bold text-navy-800">
                  {c.v}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* floating ribbon */}
      <div className="absolute -top-3.5 right-5 bg-brand-orange-500 text-white px-4 py-2 rounded-lg text-[13px] font-bold shadow-[0_8px_24px_-8px_rgba(255,107,53,0.55)] rotate-3">
        30초 만에 리포트.
      </div>
    </div>
  );
}

// ── 인라인 아이콘 ──────────────────────────────────────────
function SparkIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3" />
      <path d="M17 9 12 4 7 9" />
      <path d="M12 4v13" />
    </svg>
  );
}
function CheckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
