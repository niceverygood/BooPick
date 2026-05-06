"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "boopick_pwa_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [show, show_setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    const ua = navigator.userAgent.toLowerCase();
    const mobile = /android|iphone|ipad|mobile/.test(ua);
    if (!mobile) return;

    // 이미 설치 중이면 노출 X
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/.test(ua) && !/android/.test(ua);
    setIsIOS(ios);

    // Android Chrome — beforeinstallprompt 이벤트 캡쳐
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      show_setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS는 자동 prompt 없음 → 시간차로 안내 배너 표시
    if (ios) {
      const t = setTimeout(() => show_setShow(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    show_setShow(false);
  }

  async function install() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {}
      setDeferredPrompt(null);
    }
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-md mx-auto px-4 py-3 flex items-start gap-3">
        <div className="text-2xl shrink-0">🏠</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-boopick-navy">
            홈 화면에 부픽 추가
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            {isIOS
              ? "공유 버튼 → '홈 화면에 추가'"
              : "한 번 클릭으로 앱처럼 빠르게 사용"}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isIOS && (
            <button
              onClick={install}
              className="px-3 py-1.5 text-xs font-bold text-white bg-boopick-orange hover:bg-boopick-orange/90 rounded-md"
            >
              설치
            </button>
          )}
          <button
            onClick={dismiss}
            className="px-3 py-1 text-[11px] text-slate-500 hover:text-slate-700"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
}
