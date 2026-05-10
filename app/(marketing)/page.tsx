import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main>
      {/* HERO */}
      <section className="px-5 pt-16 pb-12 sm:pt-24 sm:pb-20 max-w-4xl mx-auto text-center">
        <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange mb-5">
          공인중개사 매물 분석 SaaS
        </Badge>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-boopick-navy leading-tight">
          매물 <span className="text-boopick-orange">40,000건</span>을
          <br />
          30초 안에 분석해드립니다
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          엑셀 한 장 업로드하면 AI가 조건에 맞는 자리만 골라 업종별 추천
          리포트로 만들어드려요. 결혼식장·카페·학원·필라테스 등 업종 특화 분석
          포함.
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
          신용카드 불필요 · 베이직 플랜 무료
        </p>
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
              d: "매물 데이터 xlsx 한 장만 올리면 AI가 자동 정리·분석합니다.",
            },
            {
              n: "2",
              t: "조건 한 줄 입력",
              d: '"강남에 결혼식장으로 30평 이상, 보증금 1억 이하" 같이 평소 말투로.',
            },
            {
              n: "3",
              t: "리포트 PDF",
              d: "AI가 매칭 자리만 골라 점수와 추천 사유 포함한 리포트로 출력.",
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

      {/* 업종 특화 */}
      <section className="px-5 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-boopick-navy">
          업종 특화 분석 알고리즘
        </h2>
        <p className="mt-3 text-center text-slate-600 text-sm sm:text-base">
          업종마다 매물 평가 기준이 다릅니다. 부픽은 업종별 가중치로 점수를
          계산합니다.
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

      {/* CTA */}
      <section className="px-5 py-16 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white border-none shadow-xl">
          <CardContent className="p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              지금 무료로 시작하세요
            </h2>
            <p className="text-white/80 mb-6 text-sm sm:text-base">
              매달 3건까지 무료 리포트 · 카드 등록 불필요
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
