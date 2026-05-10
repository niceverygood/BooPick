"use client";

// Kakao OAuth 로그인 버튼
//
// 동작:
//   1. 클릭 → supabase.auth.signInWithOAuth({ provider: 'kakao' })
//   2. Kakao 동의 페이지로 이동 → 동의 후 Supabase 콜백
//   3. Supabase가 /auth/callback?code=... 으로 리다이렉트
//   4. 우리 라우트 핸들러가 세션 교환 후 /dashboard
//
// 디자인: 카카오 브랜드 가이드 (#FEE500 배경 + 검정 85% 텍스트)

import { useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

interface Props {
  next?: string;
  fullWidth?: boolean;
  /** "로그인" or "가입" — 텍스트만 살짝 다름 */
  intent?: "login" | "signup";
}

export function KakaoLoginButton({
  next = "/dashboard",
  fullWidth = true,
  intent = "login",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next
      )}`;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo },
      });
      // signInWithOAuth는 보통 즉시 리다이렉트되므로 아래 코드는 잘 안 닿음
      if (err) {
        setError(err.message);
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "카카오 로그인 실패");
      setLoading(false);
    }
  }

  const label =
    intent === "signup" ? "카카오로 시작하기" : "카카오로 로그인";

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          (fullWidth ? "w-full " : "") +
          "h-11 px-4 rounded-md font-semibold text-sm transition-colors " +
          "flex items-center justify-center gap-2 " +
          "bg-[#FEE500] hover:bg-[#FDD800] text-[#000000]/85 " +
          "disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        <KakaoIcon />
        {loading ? "이동 중…" : label}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1.5">⚠ {error}</p>
      )}
    </div>
  );
}

// 카카오 말풍선 아이콘 (인라인 SVG — 외부 자산 불필요)
function KakaoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 1.5C4.85786 1.5 1.5 4.18472 1.5 7.50001C1.5 9.59686 2.84267 11.4391 4.86931 12.5187L4.04108 15.5611C3.97053 15.8202 4.27074 16.029 4.49922 15.8826L8.18062 13.4862C8.4495 13.4954 8.72334 13.5 9 13.5C13.1421 13.5 16.5 10.8153 16.5 7.50001C16.5 4.18472 13.1421 1.5 9 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
