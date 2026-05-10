"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (err) throw err;
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // 이메일 확인 필요
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 실패");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6 text-center">
          <h1 className="text-xl font-bold text-boopick-navy mb-2">
            ✉️ 이메일 확인 필요
          </h1>
          <p className="text-sm text-slate-600">
            <strong>{email}</strong>로 인증 메일을 보냈습니다.
            <br />
            메일의 링크 클릭 후 로그인해주세요.
          </p>
          <Link
            href="/login"
            className="inline-block mt-5 text-sm text-boopick-orange font-semibold hover:underline"
          >
            로그인 화면으로 →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <h1 className="text-xl font-bold text-boopick-navy mb-1">회원가입</h1>
        <p className="text-sm text-slate-500 mb-6">
          베이직 플랜 무료. 카드 등록 불필요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="name" className="text-sm">
              이름 / 사무소
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 김 사장 / 부픽 부동산"
              className="mt-1"
            />
          </div>
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
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">
              비밀번호 <span className="text-slate-400">(8자 이상)</span>
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
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
            className="w-full bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            {loading ? "가입 중…" : "무료 시작"}
          </Button>
        </form>

        <p className="mt-5 text-xs text-center text-slate-500">
          이미 계정이 있나요?{" "}
          <Link
            href="/login"
            className="text-boopick-orange font-semibold hover:underline"
          >
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
