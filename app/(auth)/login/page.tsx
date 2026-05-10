"use client";

import { useState, FormEvent, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { KakaoLoginButton } from "@/components/kakao-login-button";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth 콜백에서 에러로 돌아온 경우 메시지 표시
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) setError(decodeURIComponent(errParam));
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 실패. 이메일·비밀번호를 확인해주세요."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <h1 className="text-xl font-bold text-boopick-navy mb-1">로그인</h1>
        <p className="text-sm text-slate-500 mb-6">
          부픽 분석 SaaS에 오신 것을 환영합니다.
        </p>

        <div className="mb-5">
          <KakaoLoginButton next={next} intent="login" />
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">또는 이메일로</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="email" className="text-sm">
              이메일
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">
              비밀번호
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-boopick-navy hover:bg-boopick-navy/90 text-white"
          >
            {loading ? "로그인 중…" : "로그인"}
          </Button>
        </form>

        <p className="mt-5 text-xs text-center text-slate-500">
          처음이신가요?{" "}
          <Link
            href="/signup"
            className="text-boopick-orange font-semibold hover:underline"
          >
            회원가입
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
