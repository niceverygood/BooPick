import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const FEATURES = [
  {
    emoji: "🔎",
    title: "자연어 매물 검색",
    desc: '"역삼동 사무실 30평 즉시입주" 한 줄을 그대로 던지면 AI가 알아서 찾습니다. 옵션·필터 클릭 0번.',
  },
  {
    emoji: "🤖",
    title: "매물 자동 태깅",
    desc: "AI가 설명을 읽고 업종·시설·입지·상태 22+종 카테고리로 자동 분류. 일일이 수기 태그 안 해도 됩니다.",
  },
  {
    emoji: "📱",
    title: "모바일 웹앱 어디서든",
    desc: "boopick.kr 즐겨찾기로 끝. 카페·차 안에서도 검색하고 결과를 바로 카톡으로 공유.",
  },
  {
    emoji: "🔔",
    title: "자동매칭 알림",
    desc: "손님 조건 등록 → 새 매물 들어오면 인앱·이메일 즉시 알림. 부지런한 사장님이 됩니다.",
  },
  {
    emoji: "🤝",
    title: "공동중개 풀",
    desc: "다른 중개사 매물도 같이 검색 (서로 동의한 매물에 한해). 양타 협업이 즉시 가능.",
    badge: "핵심 차별화",
  },
  {
    emoji: "✍️",
    title: "광고문구 AI",
    desc: "네이버부동산·다방·직방 등 채널별 톤에 맞는 광고문구를 자동 생성.",
  },
  {
    emoji: "🎙️",
    title: "음성메모 정리",
    desc: "차에서 한마디 녹음 → AI가 받아쓰기 + 정리 + 매물 폼 자동 채움.",
  },
  {
    emoji: "📤",
    title: "매물 공유 카드",
    desc: "매물별 짧은 URL + 카톡 미리보기 이미지 자동 생성. 손님께 한 번에 공유.",
  },
  {
    emoji: "📊",
    title: "활동 통계",
    desc: "이번 달 검색·매칭·공동중개 빈도 한 눈에. 매출 어디서 새는지 보입니다.",
  },
];

const TIERS = [
  {
    name: "Starter",
    price: "49,000",
    items: ["매물 50건", "검색 100회/월", "손님 5명"],
    pool: false,
  },
  {
    name: "Pro",
    price: "149,000",
    items: ["매물 무제한", "검색 무제한", "손님 50명"],
    pool: true,
    recommended: true,
  },
  {
    name: "Office",
    price: "390,000",
    items: ["전 항목 무제한", "직원 7명"],
    pool: true,
  },
  {
    name: "Enterprise",
    price: "협의",
    items: ["전 항목 무제한", "직원 무제한"],
    pool: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-boopick-cream">
      {/* HERO */}
      <section className="px-6 pt-16 pb-12 sm:pt-24 sm:pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-block rounded-3xl shadow-lg overflow-hidden mb-6">
          <Image
            src="/img/icon-192.png"
            alt="부픽 아이콘"
            width={96}
            height={96}
            priority
          />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-boopick-navy">
          부픽 <span className="text-3xl sm:text-4xl font-semibold opacity-70">(BooPick)</span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-500">
          공인중개사를 위한 AI 매물 매칭 + 공동중개 풀
        </p>
        <p className="mt-8 text-2xl sm:text-3xl font-bold leading-snug text-boopick-navy">
          한 줄 검색 → 30초 매물 카드
          <br />
          <span className="text-boopick-orange">손님께 카톡 공유까지</span>
        </p>

        {/* Search bar mockup */}
        <Card className="mt-10 mx-auto max-w-xl text-left shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔎</span>
              <input
                type="text"
                disabled
                placeholder="신사동 25평 카페자리 보증금 1억 이하"
                className="flex-1 bg-transparent outline-none text-base sm:text-lg text-slate-700 placeholder:text-slate-400 cursor-default"
              />
              <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange shrink-0">
                곧 출시
              </Badge>
            </div>
            <p className="mt-3 text-xs text-slate-400 pl-8">
              ↑ 이런 한 줄 검색을 30초 내 매물 카드 5개로 받습니다
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-boopick-orange hover:bg-boopick-orange/90 text-white px-8 h-12 text-base"
          >
            <Link href="/search">🔎 검색 데모 시작</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          🎯 데모 매물 10건으로 검색 체험 가능 · 정식 베타는 6주 후
        </p>
      </section>

      {/* CHAT FLOW DEMO */}
      <section className="px-6 py-12 sm:py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-boopick-navy">
          이렇게 작동합니다
        </h2>
        <p className="text-center text-slate-500 mb-10">
          한 손님 응대 30~45분이 30초로
        </p>
        <Card className="overflow-hidden shadow-md">
          <CardContent className="p-0 divide-y divide-slate-100">
            {/* 1. 손님 → 사장님 */}
            <div className="px-5 py-4 bg-amber-50/50">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">
                💬 손님 → 사장님 (카톡)
              </p>
              <p className="text-sm sm:text-base text-slate-800">
                &ldquo;신사동에 25평 카페자리 보증금 1억 이하로 좀 알아봐주세요&rdquo;
              </p>
            </div>
            {/* 2. 사장님 → 부픽 */}
            <div className="px-5 py-4 bg-slate-50">
              <p className="text-xs font-semibold mb-1.5 text-boopick-navy">
                ⌨️ 사장님 → 부픽 웹앱 검색창
              </p>
              <p className="text-sm sm:text-base text-slate-800 font-mono">
                신사동 25평 카페자리 보증금 1억 이하
              </p>
            </div>
            {/* 3. 부픽 응답 */}
            <div className="px-5 py-5 bg-white">
              <p className="text-xs font-semibold mb-3 text-boopick-orange">
                🏠 부픽 — 30초 후
              </p>
              <p className="text-sm font-semibold mb-3 text-slate-800">
                매물 5건 매칭됐습니다
              </p>
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <p>
                    <strong className="text-slate-900">1.</strong> 가로수길 코너 1층 25평 · 보증금 8천 / 월세 350
                  </p>
                  <p className="ml-4 text-xs text-slate-500 mt-0.5">
                    #코너 #테라스 #카페가능 #1층노출
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 flex-wrap">
                    <span>
                      <strong className="text-slate-900">2.</strong> 도산공원 1층 23평 · 보증금 9천 / 월세 380
                    </span>
                    <Badge variant="outline" className="text-xs h-5">
                      공동중개
                    </Badge>
                  </p>
                  <p className="ml-4 text-xs text-slate-500 mt-0.5">
                    #권리금없음 #즉시입주 #카페가능
                  </p>
                </div>
                <p className="text-slate-400 text-xs">3, 4, 5 ...</p>
              </div>
            </div>
            {/* 4. 사장님 → 손님 */}
            <div className="px-5 py-4 bg-emerald-50/50">
              <p className="text-xs font-semibold text-emerald-700 mb-1.5">
                📤 사장님 → 손님 (카톡 공유)
              </p>
              <p className="text-sm sm:text-base text-slate-800">
                매물 카드 링크 → 손님이 클릭하면 사진·정보·지도 다 보임
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-boopick-navy">
          핵심 기능 9가지
        </h2>
        <p className="text-center text-slate-500 mb-10">
          매물 검색부터 손님 응대까지 — 부픽이 곁에서
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-3xl shrink-0">{f.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-boopick-navy">
                        {f.title}
                      </h3>
                      {f.badge && (
                        <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange text-xs">
                          {f.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-6 py-12 sm:py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-boopick-navy">
          요금
        </h2>
        <p className="text-center text-slate-500 mb-10">
          14일 무료 체험 · 카카오 계정으로 1초 가입
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <Card
              key={t.name}
              className={
                t.recommended
                  ? "shadow-lg ring-2 ring-boopick-orange relative"
                  : ""
              }
            >
              {t.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange">
                    추천
                  </Badge>
                </div>
              )}
              <CardContent className="p-5">
                <h3 className="font-bold text-lg text-boopick-navy">
                  {t.name}
                </h3>
                <p className="mt-2 text-2xl font-bold text-boopick-navy">
                  {t.price}
                  <span className="text-sm font-normal text-slate-500">
                    {t.price === "협의" ? "" : "원/월"}
                  </span>
                </p>
                <Separator className="my-4" />
                <ul className="space-y-2 text-sm text-slate-600">
                  {t.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-boopick-green mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    {t.pool ? (
                      <>
                        <span className="text-boopick-green mt-0.5">✓</span>
                        <span className="font-semibold">공동중개 풀</span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-300 mt-0.5">—</span>
                        <span className="text-slate-400">공동중개 풀</span>
                      </>
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          💡 공동중개 풀이 부픽의 핵심 가치 — 강남권 1선은 사실상 Pro 이상이 적정
        </p>
      </section>

      {/* ROADMAP STATUS */}
      <section className="px-6 py-12 sm:py-16 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white shadow-xl border-none">
          <CardContent className="p-6 sm:p-8 text-center">
            <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange mb-3">
              현재 개발 2 / 6주차
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              베타 출시까지 한 발 한 발
            </h2>
            <p className="text-white/80 leading-relaxed mb-6">
              강남권 1선 중개사무소 한 곳에서 보유 매물 수만 건으로 첫 베타 검증.
              <br className="hidden sm:block" />
              1선 환경 검증 후 일반 베타 오픈.
            </p>

            {/* Progress bar */}
            <div className="max-w-md mx-auto">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-boopick-orange transition-all"
                  style={{ width: "33%" }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60">
                <span>Week 1 셋업 ✓</span>
                <span>Week 6 베타 출시</span>
              </div>
            </div>

            <p className="mt-8 text-sm text-white/70">
              ✉️ 베타 오픈 알림은 곧 받으실 수 있습니다
            </p>
          </CardContent>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-10 mt-8 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-boopick-navy">
              Bottle Inc. (주식회사 바틀)
            </p>
            <p className="text-xs mt-0.5">
              판교 테크노밸리 스타트업 캠퍼스 · 대표 한승수
            </p>
          </div>
          <div className="text-xs text-center sm:text-right">
            <p className="text-boopick-orange font-semibold">
              🏠 부픽 — 사장님 발 대신 뛰는 AI 매니저
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
