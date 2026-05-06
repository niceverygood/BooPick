// 부픽 V2 랜딩 — 임차인용 (Step 0 임시 hero, Step 1에서 풀 디자인)
//
// V2 가설: 임차인이 메인 사용자. 카톡/모바일에서 자연어로 자리를 찾고,
// 부픽이 매칭 매물을 노출하고 카톡으로 중개사에게 분배.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const POPULAR_QUERIES = [
  "강남 카페 자리 30평 1억 이하",
  "역삼동 사무실 즉시입주",
  "신사동 미용실 자리",
  "압구정 의원 1층",
  "청담동 갤러리 통유리",
  "잠실 학원 30평",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-boopick-cream">
      {/* HERO */}
      <section className="px-5 pt-12 pb-10 sm:pt-20 sm:pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-block rounded-3xl shadow-lg overflow-hidden mb-5">
          <Image
            src="/img/icon-192.png"
            alt="부픽"
            width={72}
            height={72}
            priority
          />
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-boopick-navy leading-tight">
          찾고 있는 자리,
          <br />
          <span className="text-boopick-orange">한 줄로 말씀해보세요</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600">
          AI가 강남권 상가·사무실 매물 중 딱 맞는 자리를 30초 안에 찾아드립니다.
        </p>

        {/* 검색창 (Step 1에서 /find로 변경) */}
        <form
          action="/agent/search"
          className="mt-8 mx-auto max-w-xl"
        >
          <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-md ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-boopick-orange transition-all">
            <input
              type="text"
              name="q"
              placeholder="강남 사무실 30평 즉시입주 보증금 1억 이하"
              className="flex-1 px-3 py-3 bg-transparent outline-none text-base text-slate-700 placeholder:text-slate-400"
              aria-label="매물 검색"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-boopick-navy hover:bg-boopick-navy/90 text-white font-semibold text-sm transition-colors"
            >
              찾기
            </button>
          </div>
        </form>

        {/* 인기 검색어 */}
        <div className="mt-6">
          <p className="text-xs text-slate-500 mb-2">이런 식으로 검색해보세요</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {POPULAR_QUERIES.map((q) => (
              <Link
                key={q}
                href={`/agent/search?q=${encodeURIComponent(q)}`}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-white hover:border-boopick-orange hover:text-boopick-orange transition-colors text-slate-600"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 소개 — 어떻게 작동? */}
      <section className="px-5 py-10 sm:py-14 max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 text-boopick-navy">
          이렇게 찾아드립니다
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              num: "1",
              title: "한 줄 검색",
              desc: "찾는 자리 조건을 평소 말투로 입력. 옵션 클릭, 필터 설정 안 해도 OK.",
            },
            {
              num: "2",
              title: "AI 매칭",
              desc: "Claude + OpenAI가 동/평수/예산/업종을 이해하고 30초 안에 매물 카드 5건.",
            },
            {
              num: "3",
              title: "카톡 상담",
              desc: "마음에 드는 자리에 '문의' 클릭 → 등록 중개사에게 즉시 카톡 알림.",
            },
          ].map((step) => (
            <Card key={step.num}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-boopick-orange text-white font-bold text-sm flex items-center justify-center">
                    {step.num}
                  </span>
                  <h3 className="font-bold text-base text-boopick-navy">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 곧 출시 안내 */}
      <section className="px-5 py-10 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white border-none shadow-xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange mb-3">
              현재 베타 준비 중
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              지금은 데모 매물 10건으로 검색 체험 가능
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              가입 중개사가 늘면 강남권 전체 매물을 자연어로 찾을 수 있게 됩니다.
              <br className="hidden sm:block" />
              매물 카드의 &ldquo;이 자리 문의하기&rdquo;는 곧 카톡 1:1 채널로 연결됩니다.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 푸터 */}
      <footer className="px-5 py-10 mt-8 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-500">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-boopick-navy text-sm">
              Bottle Inc. (주식회사 바틀)
            </p>
            <p className="text-xs mt-0.5">
              판교 테크노밸리 스타트업 캠퍼스 · 대표 한승수
            </p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            <Link
              href="/agent"
              className="text-xs text-slate-500 hover:text-boopick-navy underline underline-offset-2"
            >
              공인중개사이신가요? — 무료로 매물 등록하기
            </Link>
            <p className="text-[11px] text-boopick-orange font-semibold">
              🏠 부픽 — 한 줄 검색, 30초 매칭, 카톡 상담
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
