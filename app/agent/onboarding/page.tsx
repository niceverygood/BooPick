import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, getCurrentAgency } from "@/lib/auth/agent";
import { completeOnboarding } from "./actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/agent/login");

  const agency = await getCurrentAgency();
  if (agency?.onboarded_at) redirect("/agent");

  return (
    <main className="min-h-screen bg-boopick-cream py-10 px-5">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <Image
            src="/img/icon-192.png"
            alt="부픽"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-bold text-boopick-navy">부픽 중개사</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          가입을 환영합니다 🏠
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          몇 가지 정보만 입력하면 14일 Pro 트라이얼 시작 + 임차인 풀 노출이 활성화됩니다.
        </p>

        <form action={completeOnboarding} className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-boopick-navy">
                사무소 정보
              </h2>

              <div>
                <Label htmlFor="agency_name" className="text-sm">
                  공인중개사무소 이름 *
                </Label>
                <Input
                  id="agency_name"
                  name="agency_name"
                  required
                  placeholder="예: 부픽 공인중개사사무소"
                  defaultValue={agency?.name?.replace(/의 사무소$/, "")}
                  className="mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="business_registration_number"
                  className="text-sm"
                >
                  사업자등록번호 <span className="text-slate-400">(선택)</span>
                </Label>
                <Input
                  id="business_registration_number"
                  name="business_registration_number"
                  placeholder="123-45-67890"
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  부동산 광고법상 매물 노출 시 표시 의무. 미입력 시 매물 등록 제한될 수 있음.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-boopick-navy">
                연락처 (임차인 컨택 알림용)
              </h2>

              <div>
                <Label htmlFor="agent_phone" className="text-sm">
                  휴대폰 번호 *
                </Label>
                <Input
                  id="agent_phone"
                  name="agent_phone"
                  inputMode="tel"
                  required
                  placeholder="010-1234-5678"
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  임차인 컨택 발생 시 SMS 알림. 알림톡 발급 후엔 카톡으로 전환.
                </p>
              </div>

              <div>
                <Label htmlFor="kakao_channel_url" className="text-sm">
                  카카오톡 채널 URL{" "}
                  <span className="text-slate-400">(선택)</span>
                </Label>
                <Input
                  id="kakao_channel_url"
                  name="kakao_channel_url"
                  placeholder="http://pf.kakao.com/_xxxxxxx"
                  className="mt-1"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  있으면 임차인이 직접 카톡 1:1 채팅으로 연결. 채널 개설은
                  center-pf.kakao.com.
                </p>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="notification_consent"
                    defaultChecked
                    className="mt-0.5"
                  />
                  <span className="text-xs text-amber-900">
                    <strong>알림 수신 동의 (필수)</strong> — 임차인 컨택 알림을
                    SMS·이메일·카카오톡 알림톡으로 받는 것에 동의합니다.
                    정보통신망법상 명시적 동의 필요. 동의 안 하면 알림 발송
                    불가.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="lg"
              className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
            >
              ✨ 시작하기 (14일 Pro 트라이얼)
            </Button>
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-boopick-navy"
            >
              나중에
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
