"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push("/dashboard");
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
