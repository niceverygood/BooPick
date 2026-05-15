import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main>
      {/* HERO — 도구 포지셔닝 명확화 */}
      <section className="px-5 pt-16 pb-12 sm:pt-24 sm:pb-20 max-w-4xl mx-auto text-center">
        <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange mb-5">
          공인중개사 전용 매물 분석 SaaS
        </Badge>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-boopick-navy leading-tight">
          내 매물 데이터를
          <br />
          <span className="text-boopick-orange">30초</span>에 분석하는
          <br />
          업무 도구
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          공인중개사사무소에서 보유한 매물 데이터셋(엑셀)을 업로드하면 의뢰
          조건에 맞춰 적합도를 점수화한 <strong>내부 검토용 PDF 리포트</strong>를
          생성하는 소프트웨어 도구(SaaS)입니다.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="px-8 h-12 text-base"
          >
            <Link href="/pricing">가격 보기</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          신용카드 불필요 · 베이직 무료 · 카드 없이 가입
        </p>
      </section>

      {/* 어떤 도구인가 — 명확한 정의 박스 */}
      <section className="px-5 pb-2 max-w-3xl mx-auto">
        <Card className="bg-amber-50/40 border-amber-200">
          <CardContent className="p-5 sm:p-6 text-sm sm:text-base">
            <p className="font-semibold text-boopick-navy mb-2">
              📌 부픽은 이런 도구입니다
            </p>
            <ul className="space-y-1.5 text-slate-700">
              <li>
                ✓ 사무소 보유 매물 데이터를 분석해 의뢰 조건에 맞춰{" "}
                <strong>점수화하는 소프트웨어</strong>
              </li>
              <li>
                ✓ 분석 결과는 <strong>내부 검토용 · 의뢰자 제안용 PDF</strong>로
                출력
              </li>
              <li>
                ✕ 매물 추천 · 중개 · 매매 알선 · 자문 서비스 <strong>아님</strong>
              </li>
              <li>
                ✕ 외부 매물 데이터 가공 · 재배포 <strong>아님</strong> (본인
                데이터셋만 처리)
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 작동 흐름 3단계 */}
      <section className="px-5 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-boopick-navy">
          3단계로 끝
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "엑셀 업로드",
              d: "사무소 보유 매물 데이터 xlsx 한 장만 올리면 자동 컬럼 매핑 · 정규화.",
            },
            {
              n: "2",
              t: "의뢰 조건 입력",
              d: '"강남에 30평 이상, 보증금 1억 이하" 같이 평소 말투로 입력하면 자동 정형화.',
            },
            {
              n: "3",
              t: "내부 검토용 PDF",
              d: "적합도 점수와 분석 사유 포함한 PDF 리포트 출력. 의뢰자 제안에 그대로 활용.",
            },
          ].map((step) => (
            <Card key={step.n}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-full bg-boopick-orange text-white font-bold flex items-center justify-center">
                    {step.n}
                  </span>
                  <h3 className="font-bold text-boopick-navy">{step.t}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.d}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 업종 특화 분석 */}
      <section className="px-5 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-boopick-navy">
          업종 특화 분석 알고리즘
        </h2>
        <p className="mt-3 text-center text-slate-600 text-sm sm:text-base">
          업종마다 매물 평가 기준이 다릅니다. 부픽은 업종별 가중치 알고리즘으로
          점수를 계산합니다.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              className="rounded-lg border border-slate-200 bg-white p-4 text-center"
            >
              <div className="text-2xl mb-1">{i.e}</div>
              <div className="text-sm font-semibold text-boopick-navy">
                {i.t}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          더 많은 업종은 Pro 플랜에서 추가됩니다.
        </p>
      </section>

      {/* 면책 안내 */}
      <section className="px-5 pb-4 max-w-3xl mx-auto">
        <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-boopick-navy mb-1">
            법적 고지 (Disclaimer)
          </p>
          <p>
            부픽은 매물 데이터 분석을 보조하는 소프트웨어 도구이며, 매물 추천 ·
            중개 · 매매 알선 · 자문 서비스가 아닙니다. 분석 결과는 입력 데이터와
            알고리즘에 기반한 참고용 정보로, 객관성을 절대적으로 보장하지
            않습니다. 모든 의사결정과 결과의 책임은 사용자에게 있습니다.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white border-none shadow-xl">
          <CardContent className="p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              지금 무료로 시작하세요
            </h2>
            <p className="text-white/80 mb-6 text-sm sm:text-base">
              월 5건까지 무료 리포트 · 카드 등록 불필요
            </p>
            <Button
              asChild
              size="lg"
              className="bg-boopick-orange hover:bg-boopick-orange/90 text-white px-8 h-12"
            >
              <Link href="/signup">무료 시작 →</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
