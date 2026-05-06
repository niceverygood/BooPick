"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function AgentLoginPage() {
  return (
    <Suspense
      fallback={<main className="min-h-screen bg-boopick-cream" />}
    >
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const sp = useSearchParams();
  const error = sp.get("error");
  const next = sp.get("next") ?? "/agent";

  async function handleKakao() {
    try {
      const supabase = createBrowserClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${siteUrl}/auth/callback/agent?next=${encodeURIComponent(next)}`,
        },
      });
    } catch (e) {
      alert(`로그인 시작 실패: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <main className="min-h-screen bg-boopick-cream flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={56}
              height={56}
              className="rounded-2xl shadow-md mx-auto"
            />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-boopick-navy">
            부픽 중개사
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            매물을 등록하고 임차인 컨택을 받아보세요
          </p>
        </div>

        <Card className="shadow-md">
          <CardContent className="p-6">
            <Button
              type="button"
              onClick={handleKakao}
              size="lg"
              className="w-full h-12 text-base font-bold bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] border-none"
            >
              <svg
                className="mr-2"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="currentColor"
                aria-hidden
              >
                <path d="M9 1.5C4.582 1.5 1 4.32 1 7.8c0 2.197 1.448 4.124 3.62 5.244-.16.602-.58 2.176-.665 2.516-.105.422.155.418.327.304.135-.09 2.158-1.464 3.04-2.06.546.077 1.106.116 1.678.116 4.418 0 8-2.82 8-6.32S13.418 1.5 9 1.5z" />
              </svg>
              카카오로 시작하기
            </Button>

            <div className="mt-5 space-y-2 text-xs text-slate-500">
              <p>· 14일 Pro 트라이얼 자동 부여 (임차인 풀 노출 ON)</p>
              <p>· 사업자등록번호는 onboarding에서 입력</p>
              <p>· 카톡 알림 수신 동의는 선택</p>
            </div>

            {error && (
              <p className="mt-4 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
                로그인 오류:{" "}
                {error === "auth_failed"
                  ? "카카오 인증 실패. 다시 시도해주세요."
                  : error === "no_code"
                    ? "인증 코드 누락"
                    : error === "auth_misconfig"
                      ? "Supabase 환경설정 확인 필요 (env)"
                      : error === "agency_create"
                        ? "사무소 생성 실패"
                        : error}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-boopick-navy underline underline-offset-2"
          >
            ← 임차인 화면으로
          </Link>
        </div>
      </div>
    </main>
  );
}
