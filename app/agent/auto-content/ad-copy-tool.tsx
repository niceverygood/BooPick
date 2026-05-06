"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ListingPick {
  id: string;
  short_description: string | null;
  address: string;
  dong: string | null;
}

interface AdResult {
  title: string;
  body: string;
  hashtags: string[];
  channel: string;
  tone: string;
}

const CHANNELS = [
  { value: "naver", label: "네이버부동산", emoji: "🟢" },
  { value: "instagram", label: "인스타그램", emoji: "📸" },
  { value: "blog", label: "블로그", emoji: "📝" },
  { value: "kakao", label: "카톡 / 오픈채팅", emoji: "💬" },
];

const TONES = [
  { value: "formal", label: "정중" },
  { value: "casual", label: "친근" },
  { value: "impact", label: "임팩트" },
];

export function AdCopyTool({ listings }: { listings: ListingPick[] }) {
  const [listingId, setListingId] = useState<string>(listings[0]?.id ?? "");
  const [channel, setChannel] = useState("instagram");
  const [tone, setTone] = useState("impact");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"title" | "body" | "tags" | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agent/ad-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId, channel, tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, kind: "title" | "body" | "tags") {
    void navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label htmlFor="listing" className="text-sm">
              매물 선택
            </Label>
            <select
              id="listing"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {(l.short_description ?? l.address).slice(0, 50)} —{" "}
                  {l.dong ?? ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm">발송 채널</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChannel(c.value)}
                  className={
                    "px-3 py-2.5 rounded-md text-sm font-semibold border transition-colors " +
                    (channel === c.value
                      ? "bg-boopick-navy text-white border-boopick-navy"
                      : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
                  }
                >
                  <div>{c.emoji}</div>
                  <div className="text-xs mt-0.5">{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">톤</Label>
            <div className="mt-2 flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors " +
                    (tone === t.value
                      ? "bg-boopick-navy text-white border-boopick-navy"
                      : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={generate}
            disabled={loading || !listingId}
            size="lg"
            className="w-full bg-boopick-orange hover:bg-boopick-orange/90 text-white"
          >
            {loading ? "AI가 작성 중…" : "✍️ 광고문구 생성"}
          </Button>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <Section
              label="제목"
              text={result.title}
              copied={copied === "title"}
              onCopy={() => copy(result.title, "title")}
            />
            <Section
              label="본문"
              text={result.body}
              multiline
              copied={copied === "body"}
              onCopy={() => copy(result.body, "body")}
            />
            <Section
              label="해시태그"
              text={result.hashtags.join(" ")}
              copied={copied === "tags"}
              onCopy={() => copy(result.hashtags.join(" "), "tags")}
            />
            <div className="text-[11px] text-slate-400">
              채널: {result.channel} · 톤: {result.tone}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Section({
  label,
  text,
  multiline,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  multiline?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className={
            "text-xs px-2 py-1 rounded-md font-semibold transition-colors " +
            (copied
              ? "bg-boopick-green text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200")
          }
        >
          {copied ? "✓ 복사됨" : "복사"}
        </button>
      </div>
      <div
        className={
          "text-sm bg-slate-50 px-4 py-3 rounded-md " +
          (multiline ? "whitespace-pre-wrap leading-relaxed" : "")
        }
      >
        {text}
      </div>
    </div>
  );
}
