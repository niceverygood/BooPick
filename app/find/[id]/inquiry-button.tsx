"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAnonToken } from "@/lib/tenant/anon";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

interface Props {
  listingId: string;
  shortDescription: string | null;
}

export function InquiryButton({ listingId, shortDescription }: Props) {
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 매물 상세 진입 시 view 트래킹 + URL ?inquire=1 (OAuth 콜백 후)이면 모달 자동 오픈
  useEffect(() => {
    void fetch("/api/tenant/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, event: "view" }),
    }).catch(() => {});

    if (sp.get("inquire") === "1") {
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  async function signInWithKakao() {
    try {
      const supabase = createBrowserClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const next = `/find/${listingId}?inquire=1`;
      await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${siteUrl}/auth/callback/tenant?next=${encodeURIComponent(next)}`,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "카카오 로그인 시작 실패");
    }
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const anonToken = getAnonToken();
      const res = await fetch("/api/tenant/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          anon_token: anonToken,
          contact_phone: phone.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "문의 실패");

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "문의 실패");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClick() {
    // click 트래킹
    void fetch("/api/tenant/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, event: "click" }),
    }).catch(() => {});
    setOpen(true);
  }

  return (
    <>
      <Button
        onClick={handleClick}
        size="lg"
        className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-boopick-orange hover:bg-boopick-orange/90 text-white shadow-md"
      >
        💬 이 자리 문의하기
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!submitting) {
            setOpen(v);
            if (!v) {
              // 모달 닫힘 — 상태 reset (다음 클릭 시 처음부터)
              setTimeout(() => {
                setDone(false);
                setError(null);
              }, 250);
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          {!done ? (
            <>
              <DialogHeader>
                <DialogTitle>이 자리 문의하기</DialogTitle>
                <DialogDescription>
                  {shortDescription ?? "선택한 매물"}에 대한 상담을 등록 중개사에게 전달합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {/* 카카오 빠른 로그인 */}
                <button
                  type="button"
                  onClick={signInWithKakao}
                  className="w-full h-11 rounded-md bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-sm font-bold flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 18 18"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M9 1.5C4.582 1.5 1 4.32 1 7.8c0 2.197 1.448 4.124 3.62 5.244-.16.602-.58 2.176-.665 2.516-.105.422.155.418.327.304.135-.09 2.158-1.464 3.04-2.06.546.077 1.106.116 1.678.116 4.418 0 8-2.82 8-6.32S13.418 1.5 9 1.5z" />
                  </svg>
                  카카오로 빠른 컨택
                </button>
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-[11px] text-slate-400">
                      또는 전화번호로
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm">
                    연락 받을 번호 <span className="text-slate-400">(선택)</span>
                  </Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    placeholder="010-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    중개사가 직접 연락드립니다. 카톡 ID도 가능.
                  </p>
                </div>
                <div>
                  <Label htmlFor="msg" className="text-sm">
                    조건/요청사항 <span className="text-slate-400">(선택)</span>
                  </Label>
                  <textarea
                    id="msg"
                    placeholder="예: 카페로 사용 예정 / 즉시 입주 가능한지 / 주차 필요"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                    disabled={submitting}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange resize-none"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button
                  onClick={submit}
                  disabled={submitting}
                  className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
                >
                  {submitting ? "전송 중…" : "문의 보내기"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>✅ 문의가 접수됐습니다</DialogTitle>
                <DialogDescription>
                  등록 중개사에게 알림이 전달됐습니다. 곧 연락 드릴 예정입니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => setOpen(false)}
                  className="bg-boopick-navy hover:bg-boopick-navy/90"
                >
                  확인
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
