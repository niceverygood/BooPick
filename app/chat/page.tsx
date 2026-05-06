"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ChatExtracted {
  dong?: string | null;
  building_type?: string | null;
  transaction_type?: string | null;
  area_pyeong_min?: number | null;
  area_pyeong_max?: number | null;
  deposit_max?: number | null;
  monthly_rent_max?: number | null;
  industries?: string[];
}

const FIRST_REPLY =
  "안녕하세요! 부픽이에요 🏠\n어떤 자리 찾고 계세요? (예: 강남 카페 자리, 신사동 미용실)";

export default function ChatPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ChatTurn[]>([
    { role: "assistant", content: FIRST_REPLY },
  ]);
  const [extracted, setExtracted] = useState<ChatExtracted>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, loading]);

  // 진입 시 chat_start 트래킹
  useEffect(() => {
    void import("@/lib/tracking/funnel").then(({ trackEvent }) =>
      trackEvent("chat_start")
    );
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    const newHistory = [...history, { role: "user" as const, content: msg }];
    setHistory(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tenant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory.slice(0, -1), message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "응답 실패");
      }
      setHistory((h) => [
        ...h,
        { role: "assistant", content: data.reply },
      ]);
      // 추출된 정보 누적 (덮어쓰지 않고 비어있는 자리만 채움)
      setExtracted((cur) => mergeExtracted(cur, data.extracted ?? {}));

      if (data.ready_to_recommend) {
        // 검색 페이지로 이동, 누적된 조건 + 마지막 메시지를 query로
        setRecommending(true);
        const newExtracted = mergeExtracted(extracted, data.extracted ?? {});
        const q = buildQuery(newExtracted);
        setTimeout(() => router.push(`/find?q=${encodeURIComponent(q)}`), 1200);
      }
    } catch (e) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: `죄송해요, 잠시 문제가 있었어요: ${
            e instanceof Error ? e.message : "다시 시도해주세요"
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-boopick-cream flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy">부픽</span>
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-500">매물 챗봇</span>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-3 overflow-y-auto">
        {history.map((t, i) => (
          <Bubble key={i} role={t.role} content={t.content} />
        ))}
        {loading && (
          <Bubble role="assistant" content="..." typing />
        )}
        {recommending && (
          <Bubble
            role="assistant"
            content="조건에 맞는 매물 찾으러 가는 중..."
          />
        )}
        <div ref={scrollRef} />
      </div>

      {/* 입력 폼 */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-3 sm:p-4 sticky bottom-0"
      >
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="대답을 입력하세요…"
            disabled={loading || recommending}
            className="flex-1 h-11 px-4 rounded-full border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-boopick-orange"
          />
          <button
            type="submit"
            disabled={loading || recommending || !input.trim()}
            className="px-5 h-11 rounded-full bg-boopick-orange hover:bg-boopick-orange/90 text-white font-semibold text-sm disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </form>
    </main>
  );
}

function Bubble({
  role,
  content,
  typing,
}: {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap " +
          (isUser
            ? "bg-boopick-navy text-white rounded-br-sm"
            : typing
              ? "bg-slate-100 text-slate-400 rounded-bl-sm"
              : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm")
        }
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

function mergeExtracted(cur: ChatExtracted, next: ChatExtracted): ChatExtracted {
  const out: ChatExtracted = { ...cur };
  for (const key of Object.keys(next) as (keyof ChatExtracted)[]) {
    const v = next[key];
    if (v == null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    // 누적 — 새 값으로 갱신
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (out as any)[key] = v;
  }
  return out;
}

function buildQuery(e: ChatExtracted): string {
  const parts: string[] = [];
  if (e.dong) parts.push(e.dong);
  if (e.building_type) parts.push(e.building_type);
  if (e.industries && e.industries.length > 0) parts.push(e.industries[0]);
  if (e.area_pyeong_min) parts.push(`${e.area_pyeong_min}평 이상`);
  if (e.deposit_max) parts.push(`보증금 ${formatKRW(e.deposit_max)} 이하`);
  if (e.monthly_rent_max) parts.push(`월세 ${formatKRW(e.monthly_rent_max)} 이하`);
  return parts.join(" ");
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toString();
}
