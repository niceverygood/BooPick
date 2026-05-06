// 부픽 V2 임차인용 랜딩
//
// V2 가설: 임차인이 메인 사용자. 카톡/모바일에서 자연어로 자리를 찾고,
// 부픽이 매칭 매물을 노출하고 카톡으로 중개사에게 분배.

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/server";
import {
  TenantListingCard,
  type TenantListing,
} from "@/components/tenant/listing-card";
import { TrackPageView } from "@/components/tracking/track-page-view";
import { PWAInstallBanner } from "@/components/tenant/pwa-install-banner";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const POPULAR_QUERIES = [
  "강남 카페 자리 30평 1억 이하",
  "역삼동 사무실 즉시입주",
  "신사동 미용실 자리",
  "압구정 의원 1층",
  "청담동 갤러리 통유리",
  "잠실 학원 30평",
];

interface SiteStats {
  agencies: number;
  listings: number;
  inquiries: number;
}

async function fetchActiveListings(limit = 12): Promise<TenantListing[]> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const { data, error } = await admin
    .from("listings")
    .select(
      `id, agency_id, address, dong, building_name, area_pyeong,
       floor, building_type, transaction_type, deposit, monthly_rent,
       short_description, ai_tags, photo_urls,
       agency:agencies(name)`
    )
    .eq("status", "active")
    .eq("tenant_pool_enabled", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    listing_id: d.id,
    address: d.address,
    dong: d.dong,
    building_name: d.building_name,
    area_pyeong: d.area_pyeong,
    floor: d.floor,
    building_type: d.building_type,
    transaction_type: d.transaction_type,
    deposit: d.deposit,
    monthly_rent: d.monthly_rent,
    short_description: d.short_description,
    ai_tags: d.ai_tags,
    photo_urls: d.photo_urls,
    agency_name:
      ((d.agency as { name?: string } | null) ?? null)?.name ?? null,
  }));
}

async function fetchStats(): Promise<SiteStats> {
  const stats: SiteStats = { agencies: 0, listings: 0, inquiries: 0 };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return stats;
  }

  const [agenciesRes, listingsRes, inquiriesRes] = await Promise.all([
    admin
      .from("agencies")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString()
      ),
    admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("tenant_pool_enabled", true),
    admin
      .from("tenant_inquiries")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
      ),
  ]);

  stats.agencies = agenciesRes.count ?? 0;
  stats.listings = listingsRes.count ?? 0;
  stats.inquiries = inquiriesRes.count ?? 0;
  return stats;
}

export default async function Home() {
  const [listings, stats] = await Promise.all([
    fetchActiveListings(12),
    fetchStats(),
  ]);

  return (
    <main className="min-h-screen bg-boopick-cream">
      <TrackPageView event="landing_view" />
      <PWAInstallBanner />
      {/* HERO */}
      <section className="px-5 pt-12 pb-10 sm:pt-20 sm:pb-14 max-w-3xl mx-auto text-center">
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

        {/* 검색창 → /find */}
        <form action="/find" className="mt-8 mx-auto max-w-xl">
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
                href={`/find?q=${encodeURIComponent(q)}`}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-boopick-orange hover:text-boopick-orange transition-colors text-slate-600"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>

        {/* 챗봇 진입 */}
        <Link
          href="/chat"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm text-slate-600 hover:border-boopick-orange hover:text-boopick-orange transition-colors shadow-sm"
        >
          💬 카톡처럼 대화로 찾고 싶다면
        </Link>

        {/* 신뢰 지표 */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-center">
          <Stat label="가입 중개사" value={stats.agencies} />
          <Stat label="활성 매물" value={stats.listings} />
          <Stat label="이번 달 매칭" value={stats.inquiries} />
        </div>
      </section>

      {/* 매물 grid */}
      <section className="px-5 py-10 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-boopick-navy">
              지금 부픽에서 찾을 수 있는 자리
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              가입 중개사가 등록한 임차인 공개 매물입니다.
            </p>
          </div>
          <Link
            href="/find"
            className="text-sm text-boopick-orange hover:text-boopick-orange/80 font-semibold whitespace-nowrap"
          >
            전체 보기 →
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <p className="text-sm">아직 공개된 매물이 없습니다.</p>
              <p className="text-xs mt-2 text-slate-400">
                중개사가 등록한 매물이 곧 표시됩니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <TenantListingCard key={l.listing_id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* 작동 방식 */}
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
              desc: "Claude + OpenAI가 동/평수/예산/업종을 이해하고 30초 안에 매물 카드.",
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

      {/* 베타 안내 */}
      <section className="px-5 py-10 max-w-3xl mx-auto">
        <Card className="bg-boopick-navy text-white border-none shadow-xl">
          <CardContent className="p-6 sm:p-8 text-center">
            <Badge className="bg-boopick-orange text-white border-none hover:bg-boopick-orange mb-3">
              베타 운영 중
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              가입 중개사가 늘어날수록 매물 풀이 풍부해집니다
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              부픽은 가입 공인중개사의 매물만 노출합니다.
              <br className="hidden sm:block" />
              임차인 검증 + 카톡 1:1 직접 상담 + 매물 진위 검증 시스템.
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl sm:text-3xl font-bold text-boopick-navy">
        {value > 0 ? value.toLocaleString() : "—"}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
